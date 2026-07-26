package channels

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"
)

const (
	pancakeAPIRoot = "https://pages.fm/api"

	// Pancake allows 5 calls per page per second. One call each 200ms stays
	// under the limit without needing burst accounting.
	pancakeMinInterval = 200 * time.Millisecond
)

// PancakeCredentials is the decrypted JSON stored in channels.credentials_encrypted.
//
// Unlike Zalo OA, page_access_token never expires, so there is no refresh flow
// and no OnTokenRefresh callback.
type PancakeCredentials struct {
	PageID          string `json:"page_id"`
	PageAccessToken string `json:"page_access_token"`
}

type PancakeAdapter struct {
	creds   PancakeCredentials
	client  *http.Client
	apiRoot string // overridden in tests
	pacer   *pacer
}

func NewPancakeAdapter(creds PancakeCredentials) *PancakeAdapter {
	return &PancakeAdapter{
		creds:   creds,
		client:  &http.Client{Timeout: 30 * time.Second},
		apiRoot: pancakeAPIRoot,
		pacer:   newPacer(pancakeMinInterval),
	}
}

func (p *PancakeAdapter) v1(suffix string) string {
	return "/public_api/v1/pages/" + url.PathEscape(p.creds.PageID) + suffix
}

func (p *PancakeAdapter) v2(suffix string) string {
	return "/public_api/v2/pages/" + url.PathEscape(p.creds.PageID) + suffix
}

// doRequest performs a GET and decodes the JSON body.
//
// Pancake returns HTTP 200 even for authentication failures and signals the
// problem through the "success" field, so the status code alone must never be
// trusted. Verified against the live API:
//
//	GET /api/v1/pages?access_token=invalid
//	-> HTTP 200 {"success":false,"error_code":102,"message":"Invalid access_token"}
func (p *PancakeAdapter) doRequest(ctx context.Context, path string, params url.Values) (map[string]interface{}, error) {
	if err := p.pacer.wait(ctx); err != nil {
		return nil, err
	}

	if params == nil {
		params = url.Values{}
	}
	// Clone params to avoid mutating the caller's map.
	paramsCopy := make(url.Values)
	for k, v := range params {
		paramsCopy[k] = v
	}
	paramsCopy.Set("page_access_token", p.creds.PageAccessToken)

	endpoint := p.apiRoot + path + "?" + paramsCopy.Encode()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("pancake: build request: %s", redactSecrets(err.Error()))
	}

	resp, err := p.client.Do(req)
	if err != nil {
		// err is typically a *url.Error whose Error() embeds the full request
		// URL, page_access_token included — must be redacted before it can be
		// stored in channels.last_sync_error or shown in the UI (see C2).
		return nil, fmt.Errorf("pancake: request failed: %s", redactSecrets(err.Error()))
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusTooManyRequests {
		return nil, fmt.Errorf("pancake: rate limited (HTTP 429) on page %s", p.creds.PageID)
	}

	var body map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return nil, fmt.Errorf("pancake: decode response (HTTP %d): %w", resp.StatusCode, err)
	}

	if ok, present := body["success"].(bool); present && !ok {
		msg, _ := body["message"].(string)
		code, _ := body["error_code"].(float64)
		return nil, fmt.Errorf("pancake: api error %d: %s (request_id=%s)",
			int(code), msg, resp.Header.Get("x-request-id"))
	}

	// Safety net for valid JSON responses with error status codes but missing the
	// "success" field. This is not a substitute for checking "success" — it's a
	// fallback for edge cases where Pancake returns an error status without the
	// expected "success" field marker.
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("pancake: unexpected HTTP %d", resp.StatusCode)
	}

	return body, nil
}

// HealthCheck verifies credentials with the cheapest page-scoped call.
// VERIFY-7: /tags is assumed to be the lightest endpoint; confirm with a real token.
func (p *PancakeAdapter) HealthCheck(ctx context.Context) error {
	_, err := p.doRequest(ctx, p.v1("/tags"), nil)
	return err
}

const (
	pancakeConvPageSize = 60
	pancakeMaxConvPages = 200 // safety net against malformed pagination responses
)

// parsePancakeTime parses Pancake timestamps.
//
// VERIFY-3: the API returns "2024-12-25T11:06:07.000000" with no timezone
// suffix. The webhook spec says UTC; the REST spec does not. Layouts without a
// zone are parsed as UTC by time.Parse, matching that assumption. Returns zero
// time on anything unparseable.
func parsePancakeTime(v interface{}) time.Time {
	s, ok := v.(string)
	if !ok || s == "" {
		return time.Time{}
	}
	for _, layout := range []string{
		time.RFC3339Nano,
		time.RFC3339,
		"2006-01-02T15:04:05.000000",
		"2006-01-02T15:04:05",
	} {
		if t, err := time.Parse(layout, s); err == nil {
			return t.UTC()
		}
	}
	return time.Time{}
}

// FetchRecentConversations returns inbox conversations updated since `since`.
//
// Pagination is a cursor on the last conversation id, 60 per page. The API
// exposes no "has more" flag, so a short page is the only end-of-data signal.
func (p *PancakeAdapter) FetchRecentConversations(ctx context.Context, since time.Time, limit int) ([]SyncedConversation, error) {
	var out []SyncedConversation
	lastID := ""
	pageCount := 0

	for {
		// Safety check: if cursor didn't advance despite a full page, something is wrong
		prevLastID := lastID
		pageCount++
		if pageCount > pancakeMaxConvPages {
			break
		}

		params := url.Values{}
		// VERIFY-2: the spec's Conversation.type enum (INBOX/COMMENT/LIVESTREAM)
		// disagrees with the query param docs (INBOX/COMMENT/COMMENT_LIVESTREAM/POST).
		// Ask for INBOX and filter again below rather than trust either one.
		params.Set("type", "INBOX")
		// VERIFY-1: the spec does not say whether since/until apply to
		// inserted_at or updated_at. Pairing with order_by=updated_at is the
		// reading that matches incremental sync.
		params.Set("order_by", "updated_at")
		if !since.IsZero() {
			// The API rejects `since` on its own with
			//   "Since must be provided with until"
			// even though the spec documents both as optional. Verified against
			// the live API 2026-07-26. Pair it with "now" to get an open-ended
			// upper bound.
			params.Set("since", strconv.FormatInt(since.Unix(), 10))
			params.Set("until", strconv.FormatInt(time.Now().Unix(), 10))
		}
		if lastID != "" {
			params.Set("last_conversation_id", lastID)
		}

		body, err := p.doRequest(ctx, p.v2("/conversations"), params)
		if err != nil {
			return nil, err
		}

		raw, _ := body["conversations"].([]interface{})
		if len(raw) == 0 {
			break
		}

		for _, item := range raw {
			conv, ok := item.(map[string]interface{})
			if !ok {
				continue
			}
			id, _ := conv["id"].(string)
			if id == "" {
				continue
			}
			// advance the cursor even for rows we skip, or pagination stalls
			lastID = id

			if t, _ := conv["type"].(string); t != "" && t != "INBOX" {
				continue
			}

			from, _ := conv["from"].(map[string]interface{})
			userID, _ := from["id"].(string)
			name, _ := from["name"].(string)

			out = append(out, SyncedConversation{
				ExternalID:     id,
				ExternalUserID: userID,
				CustomerName:   name,
				LastMessageAt:  parsePancakeTime(conv["updated_at"]),
				Metadata: map[string]interface{}{
					"pancake_customer_id":   conv["customer_id"],
					"pancake_assignee_ids":  conv["assignee_ids"],
					"pancake_message_count": conv["message_count"],
				},
			})

			if limit > 0 && len(out) >= limit {
				return out, nil
			}
		}

		// Detect pagination stall: cursor didn't advance despite a full page
		if prevLastID == lastID && len(raw) > 0 {
			break
		}

		if len(raw) < pancakeConvPageSize {
			break
		}
	}

	return out, nil
}

const (
	pancakeMsgPageSize = 30
	pancakeMaxMsgPages = 200 // safety net against malformed pagination responses

	// Botcake marks its replies with this prefix, but only when the page has
	// switched the option on. It lives in the message body, not in metadata.
	botcakePrefix = "[Botcake"
)

// classifyPancakeSender decides who sent a message and returns the platform
// identity of that sender.
//
// Order matters. Automation and AI checks run BEFORE the staff check, because
// Pancake attributes automated replies to a staff account — scoring those as
// human CS work would corrupt the evaluation.
//
// Known blind spot: replies where a human accepted a Pancake AI suggestion, or
// used a canned reply, are indistinguishable from hand-written ones.
func classifyPancakeSender(from map[string]interface{}, content, pageID string) (senderType, senderID, senderName string) {
	// If from is nil or has no identifiable sender, classify as system (likely a system event).
	// Pancake's enum includes system_message; messages without a valid from are system artifacts.
	if from == nil {
		return "system", "", ""
	}

	uid, _ := from["uid"].(string)
	adminID, _ := from["admin_id"].(string)
	adminName, _ := from["admin_name"].(string)
	name, _ := from["name"].(string)
	fromID, _ := from["id"].(string)

	// If no identifiable sender found, treat as system event.
	if uid == "" && adminID == "" && fromID == "" && (pageID == "" || fromID != pageID) {
		return "system", "", name
	}

	senderName = name
	if adminName != "" {
		senderName = adminName
	}

	aiGenerated, _ := from["ai_generated"].(bool)
	isAutomated, _ := from["is_automated"].(bool)
	if aiGenerated || isAutomated || strings.HasPrefix(strings.TrimSpace(content), botcakePrefix) {
		return "system", uid, senderName
	}

	if uid != "" || adminID != "" || (pageID != "" && fromID == pageID) {
		return "agent", uid, senderName
	}

	return "customer", fromID, name
}

// mapPancakeAttachments converts the API attachment list.
//
// VERIFY-4: the documented enum is photo/video/sticker/template/system_message.
// Audio, voice and document are absent even though uploads accept documents, so
// the raw type is passed through unchanged rather than normalised.
func mapPancakeAttachments(v interface{}) []Attachment {
	raw, ok := v.([]interface{})
	if !ok {
		return nil
	}
	var out []Attachment
	for _, item := range raw {
		a, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		typ, _ := a["type"].(string)
		link, _ := a["url"].(string)

		// For videos `url` is only a thumbnail; the file itself is in video_data.
		if vd, ok := a["video_data"].(map[string]interface{}); ok {
			if real, _ := vd["url"].(string); real != "" {
				link = real
			}
		}
		if link == "" {
			continue
		}
		name, _ := a["title"].(string)
		out = append(out, Attachment{Type: typ, URL: link, Name: name})
	}
	return out
}

// htmlTagRe khớp mọi thẻ HTML, dùng để kiểm tra xem `message` có nội dung thật
// hay chỉ là vỏ thẻ rỗng.
var htmlTagRe = regexp.MustCompile(`<[^>]*>`)

// pancakeMessageText lấy nội dung chữ của một tin nhắn.
//
// `original_message` là text thô, `message` là bản Pancake đã render và có thể
// chứa HTML. Với tin CHỈ có ảnh, `original_message` rỗng còn `message` là
// "<div></div>" — nếu cứ thế fallback thì cột content lưu rác HTML, và rác đó
// đi thẳng vào transcript gửi cho AI chấm điểm.
//
// Quan sát thật trên một page Pancake: 75/469 tin (16%) rơi đúng vào trường hợp
// này, và cả 75 đều có attachment.
func pancakeMessageText(m map[string]interface{}) string {
	if s, _ := m["original_message"].(string); strings.TrimSpace(s) != "" {
		return s
	}
	rendered, _ := m["message"].(string)
	// Còn chữ sau khi bỏ thẻ thì mới dùng; ngược lại trả rỗng và để
	// ContentType/Attachments mô tả tin đó.
	if strings.TrimSpace(htmlTagRe.ReplaceAllString(rendered, "")) == "" {
		return ""
	}
	return rendered
}

func (p *PancakeAdapter) mapMessage(m map[string]interface{}, sentAt time.Time) SyncedMessage {
	id, _ := m["id"].(string)
	from, _ := m["from"].(map[string]interface{})

	content := pancakeMessageText(m)

	senderType, senderID, senderName := classifyPancakeSender(from, content, p.creds.PageID)

	atts := mapPancakeAttachments(m["attachments"])
	contentType := "text"
	if len(atts) > 0 {
		contentType = "attachment"
	}

	return SyncedMessage{
		ExternalID:       id,
		SenderType:       senderType,
		SenderName:       senderName,
		SenderExternalID: senderID,
		Content:          content,
		ContentType:      contentType,
		Attachments:      atts,
		SentAt:           sentAt,
		RawData:          m,
	}
}

// FetchMessages returns messages newer than `since`.
//
// The messages endpoint has no time filter at all, so the only way to stop is
// to page backwards until a message older than the watermark appears. Messages
// arrive newest-first, and current_count is an index: the API returns the 30
// messages *before* it.
//
// Safety nets against malformed pagination (e.g., stub server returning identical
// pages regardless of offset): a maximum page limit and detection of cursor stall.
// These are guardrails against server misbehavior, not business logic limits.
func (p *PancakeAdapter) FetchMessages(ctx context.Context, conversationID string, since time.Time) ([]SyncedMessage, error) {
	var out []SyncedMessage
	offset := 0
	pageCount := 0

	for {
		pageCount++
		if pageCount > pancakeMaxMsgPages {
			break
		}

		params := url.Values{}
		if offset > 0 {
			params.Set("current_count", strconv.Itoa(offset))
		}

		path := p.v1("/conversations/" + url.PathEscape(conversationID) + "/messages")
		body, err := p.doRequest(ctx, path, params)
		if err != nil {
			// Return what was already fetched from earlier pages alongside the
			// error, matching facebook.go/zalo_oa.go. The caller (engine/sync.go)
			// currently drops messages entirely on a non-nil error, but any
			// future caller — or a fix to that drop — should not lose whole
			// pages of already-fetched messages just because a later page failed.
			return out, err
		}

		raw, _ := body["messages"].([]interface{})
		if len(raw) == 0 {
			break
		}

		prevOffset := offset
		reachedWatermark := false
		for _, item := range raw {
			m, ok := item.(map[string]interface{})
			if !ok {
				continue
			}
			sentAt := parsePancakeTime(m["inserted_at"])
			if !since.IsZero() && !sentAt.IsZero() && !sentAt.After(since) {
				// Skip this one but keep scanning the page. The docs claim
				// messages arrive newest-first; the live API actually returns
				// each page oldest-first, while `current_count` pages backwards
				// in time. Breaking here would abandon a whole page on its very
				// first (= oldest) entry, so an incremental sync would fetch
				// nothing at all. Verified against the real API 2026-07-26.
				reachedWatermark = true
				continue
			}
			out = append(out, p.mapMessage(m, sentAt))
		}

		if reachedWatermark || len(raw) < pancakeMsgPageSize {
			break
		}

		// Detect pagination stall: offset didn't advance despite a full page
		offset += pancakeMsgPageSize
		if prevOffset == offset && len(raw) > 0 {
			break
		}
	}

	return out, nil
}
