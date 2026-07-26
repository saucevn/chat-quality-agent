package channels

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
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
		return nil, fmt.Errorf("pancake: build request: %w", err)
	}

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("pancake: request failed: %w", err)
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

const pancakeConvPageSize = 60

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

	for {
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
			params.Set("since", strconv.FormatInt(since.Unix(), 10))
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

		if len(raw) < pancakeConvPageSize {
			break
		}
	}

	return out, nil
}
