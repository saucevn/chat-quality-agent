// backend/channels/pancake_test.go
package channels

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"
)

// newTestAdapter wires an adapter to a stub server.
func newTestAdapter(srvURL string) *PancakeAdapter {
	a := NewPancakeAdapter(PancakeCredentials{PageID: "p1", PageAccessToken: "tok123"})
	a.apiRoot = srvURL
	// Drop the 200ms real-world throttle: these tests talk to a local stub, and
	// the runaway-pagination tests deliberately burn through the page cap. At
	// the production interval those two alone take 40s each. Pacing itself is
	// covered directly by TestPacerSpacesRequests.
	a.pacer = newPacer(0)
	return a
}

func TestPancakeTreatsSuccessFalseAsError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		// Pancake answers HTTP 200 even when auth fails
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, `{"success":false,"error_code":102,"message":"Invalid access_token"}`)
	}))
	defer srv.Close()

	err := newTestAdapter(srv.URL).HealthCheck(context.Background())
	if err == nil {
		t.Fatal("expected an error when body has success=false, got nil")
	}
	if !strings.Contains(err.Error(), "Invalid access_token") {
		t.Errorf("error should carry the API message, got: %v", err)
	}
	if !strings.Contains(err.Error(), "102") {
		t.Errorf("error should carry error_code 102, got: %v", err)
	}
}

func TestPancakeHealthCheckPassesOnSuccess(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, `{"success":true,"tags":[]}`)
	}))
	defer srv.Close()

	if err := newTestAdapter(srv.URL).HealthCheck(context.Background()); err != nil {
		t.Fatalf("HealthCheck should pass on success=true, got: %v", err)
	}
}

func TestPancakeSendsTokenAsQueryParamAndUsesV1Path(t *testing.T) {
	var gotToken, gotPath string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotToken = r.URL.Query().Get("page_access_token")
		gotPath = r.URL.Path
		fmt.Fprint(w, `{"success":true,"tags":[]}`)
	}))
	defer srv.Close()

	_ = newTestAdapter(srv.URL).HealthCheck(context.Background())

	if gotToken != "tok123" {
		t.Errorf("token must go in the query string, got %q", gotToken)
	}
	if gotPath != "/public_api/v1/pages/p1/tags" {
		t.Errorf("unexpected path: %q", gotPath)
	}
}

func TestPancakeReportsRateLimit(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTooManyRequests)
	}))
	defer srv.Close()

	err := newTestAdapter(srv.URL).HealthCheck(context.Background())
	if err == nil || !strings.Contains(err.Error(), "429") {
		t.Errorf("expected a 429 rate-limit error, got: %v", err)
	}
}

func TestPancakeEscapesPageIDInPath(t *testing.T) {
	t.Run("hash_fragment_injection", func(t *testing.T) {
		// Verify that # in PageID is properly escaped to prevent fragment injection.
		// If # is not escaped, it will be interpreted as a URL fragment separator,
		// causing the page_access_token to be stripped from the query string.
		var gotPath string
		var gotToken string
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			gotPath = r.URL.Path
			gotToken = r.URL.Query().Get("page_access_token")
			fmt.Fprint(w, `{"success":true,"tags":[]}`)
		}))
		defer srv.Close()

		a := NewPancakeAdapter(PancakeCredentials{PageID: "p1#evil", PageAccessToken: "tok123"})
		a.apiRoot = srv.URL
		err := a.HealthCheck(context.Background())

		if err != nil {
			t.Fatalf("HealthCheck should not fail: %v", err)
		}

		// After unescaping the path, verify it contains the correct page_id
		decodedPath, err := url.PathUnescape(gotPath)
		if err != nil {
			t.Fatalf("failed to unescape path: %v", err)
		}
		expectedDecodedPath := "/public_api/v1/pages/p1#evil/tags"
		if decodedPath != expectedDecodedPath {
			t.Errorf("server received path %q, expected %q after decoding", decodedPath, expectedDecodedPath)
		}

		// Most importantly: verify that the token is NOT lost to fragment injection
		// Without proper escaping, # would cause page_access_token to be part of the fragment
		// and thus dropped from r.URL.Query()
		if gotToken != "tok123" {
			t.Errorf("token must not be stripped by fragment injection; got %q, expected %q", gotToken, "tok123")
		}
	})

	t.Run("control_character_safety", func(t *testing.T) {
		// Verify that control characters in PageID do not leak secrets in error messages.
		// If control characters are not escaped, http.NewRequestWithContext will fail
		// with an error message that contains the raw URL (including the token).
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			fmt.Fprint(w, `{"success":true,"tags":[]}`)
		}))
		defer srv.Close()

		a := NewPancakeAdapter(PancakeCredentials{PageID: "p1\x00evil", PageAccessToken: "SECRETTOKEN"})
		a.apiRoot = srv.URL
		err := a.HealthCheck(context.Background())

		// The request should either succeed (if properly escaped) or fail gracefully,
		// but the error message must NOT contain the token in plaintext.
		if err != nil {
			// If there is an error, the message must not leak the token
			if strings.Contains(err.Error(), "SECRETTOKEN") {
				t.Errorf("error message must not leak token; got: %v", err)
			}
		}
	})
}

func TestPancakeErrorOnHTTPErrorWithoutSuccessField(t *testing.T) {
	// Verify that HTTP 500 with valid JSON but missing "success" field is treated as error.
	// This is a safety net for responses that have valid JSON but don't include the
	// "success" field, which would normally be relied upon to signal errors.
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Fprint(w, `{"message":"boom"}`)
	}))
	defer srv.Close()

	err := newTestAdapter(srv.URL).HealthCheck(context.Background())
	if err == nil {
		t.Fatal("expected an error when status is 500 and success field is missing, got nil")
	}
	if !strings.Contains(err.Error(), "500") {
		t.Errorf("error should mention HTTP 500, got: %v", err)
	}
}

func TestParsePancakeTimeHandlesMissingTimezone(t *testing.T) {
	// VERIFY-3: Pancake returns no timezone suffix; we assume UTC.
	got := parsePancakeTime("2024-12-25T11:06:07.000000")
	want := time.Date(2024, 12, 25, 11, 6, 7, 0, time.UTC)
	if !got.Equal(want) {
		t.Errorf("got %v, want %v", got, want)
	}
	if !parsePancakeTime("").IsZero() {
		t.Error("empty string should yield zero time")
	}
	if !parsePancakeTime(nil).IsZero() {
		t.Error("nil should yield zero time")
	}
}

func TestFetchRecentConversationsPaginatesAndFiltersInbox(t *testing.T) {
	firstPage := make([]map[string]interface{}, pancakeConvPageSize)
	for i := range firstPage {
		firstPage[i] = map[string]interface{}{
			"id":         fmt.Sprintf("c%d", i),
			"type":       "INBOX",
			"updated_at": "2026-07-20T10:00:00.000000",
			"from":       map[string]interface{}{"id": "psid1", "name": "Khách A"},
		}
	}
	secondPage := []map[string]interface{}{
		{
			"id":         "c60",
			"type":       "INBOX",
			"updated_at": "2026-07-19T10:00:00.000000",
			"from":       map[string]interface{}{"id": "psid2", "name": "Khách B"},
		},
		{
			// must be dropped — VERIFY-2, defence in depth against the type filter
			"id":         "c61",
			"type":       "COMMENT",
			"updated_at": "2026-07-19T09:00:00.000000",
			"from":       map[string]interface{}{"id": "psid3", "name": "Khách C"},
		},
	}

	var gotQueries []url.Values
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotQueries = append(gotQueries, r.URL.Query())
		if r.URL.Query().Get("last_conversation_id") != "" {
			resp, _ := json.Marshal(map[string]interface{}{"conversations": secondPage})
			w.Write(resp)
			return
		}
		resp, _ := json.Marshal(map[string]interface{}{"conversations": firstPage})
		w.Write(resp)
	}))
	defer srv.Close()

	since := time.Date(2026, 7, 1, 0, 0, 0, 0, time.UTC)
	convs, err := newTestAdapter(srv.URL).FetchRecentConversations(context.Background(), since, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(convs) != pancakeConvPageSize+1 {
		t.Fatalf("expected %d inbox conversations, got %d", pancakeConvPageSize+1, len(convs))
	}
	if convs[0].ExternalID != "c0" || convs[0].ExternalUserID != "psid1" || convs[0].CustomerName != "Khách A" {
		t.Errorf("bad mapping on first conversation: %+v", convs[0])
	}
	if convs[0].LastMessageAt.IsZero() {
		t.Error("LastMessageAt should be parsed from updated_at")
	}

	if len(gotQueries) != 2 {
		t.Fatalf("expected 2 requests, got %d", len(gotQueries))
	}
	q := gotQueries[0]
	if q.Get("type") != "INBOX" {
		t.Errorf("must request type=INBOX, got %q", q.Get("type"))
	}
	if q.Get("order_by") != "updated_at" {
		t.Errorf("must request order_by=updated_at, got %q", q.Get("order_by"))
	}
	if q.Get("since") != fmt.Sprint(since.Unix()) {
		t.Errorf("since must be unix seconds, got %q", q.Get("since"))
	}
	if gotQueries[1].Get("last_conversation_id") != "c59" {
		t.Errorf("second page must cursor on the last id, got %q", gotQueries[1].Get("last_conversation_id"))
	}
}

func TestFetchRecentConversationsRespectsLimit(t *testing.T) {
	page := make([]map[string]interface{}, pancakeConvPageSize)
	for i := range page {
		page[i] = map[string]interface{}{
			"id":         fmt.Sprintf("c%d", i),
			"type":       "INBOX",
			"updated_at": "2026-07-20T10:00:00.000000",
			"from":       map[string]interface{}{"id": "psid", "name": "K"},
		}
	}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		resp, _ := json.Marshal(map[string]interface{}{"conversations": page})
		w.Write(resp)
	}))
	defer srv.Close()

	convs, err := newTestAdapter(srv.URL).FetchRecentConversations(context.Background(), time.Time{}, 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(convs) != 10 {
		t.Errorf("limit must be honoured, got %d", len(convs))
	}
}

func TestFetchRecentConversationsHandlesAllMissingIDs(t *testing.T) {
	// Test that if a full page of 60 items all lack the "id" field,
	// the function detects pagination stall (cursor didn't advance)
	// and returns without infinite loop.
	// Using context.Background() proves the function exits on its own,
	// not via timeout.
	page := make([]map[string]interface{}, pancakeConvPageSize)
	for i := range page {
		page[i] = map[string]interface{}{
			// Deliberately omit "id" field
			"type":       "INBOX",
			"updated_at": "2026-07-20T10:00:00.000000",
			"from":       map[string]interface{}{"id": "psid", "name": "K"},
		}
	}

	var requestCount int
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestCount++
		if requestCount > 2 {
			t.Fatal("too many requests; infinite loop detected (expected <=2)")
		}
		resp, _ := json.Marshal(map[string]interface{}{"conversations": page})
		w.Write(resp)
	}))
	defer srv.Close()

	convs, err := newTestAdapter(srv.URL).FetchRecentConversations(context.Background(), time.Time{}, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// No conversations should be returned because none have valid IDs
	if len(convs) != 0 {
		t.Errorf("expected 0 conversations (all had missing IDs), got %d", len(convs))
	}
	// Should exit after first request detects cursor stall
	if requestCount > 1 {
		t.Errorf("should detect cursor stall after 1 request, made %d requests", requestCount)
	}
}

func TestFetchRecentConversationsHandlesRepeatingPages(t *testing.T) {
	// Test that if the server returns the exact same page regardless of
	// last_conversation_id parameter, the function detects cursor stall
	// and exits instead of looping infinitely.
	// Using context.Background() proves the function exits on its own.
	page := make([]map[string]interface{}, pancakeConvPageSize)
	for i := range page {
		page[i] = map[string]interface{}{
			"id":         fmt.Sprintf("c%d", i),
			"type":       "INBOX",
			"updated_at": "2026-07-20T10:00:00.000000",
			"from":       map[string]interface{}{"id": "psid", "name": "K"},
		}
	}

	var requestCount int
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestCount++
		if requestCount > 2 {
			t.Fatal("too many requests; infinite loop detected (expected <=2)")
		}
		// Always return the same page, ignoring last_conversation_id
		resp, _ := json.Marshal(map[string]interface{}{"conversations": page})
		w.Write(resp)
	}))
	defer srv.Close()

	convs, err := newTestAdapter(srv.URL).FetchRecentConversations(context.Background(), time.Time{}, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// Function must exit without infinite loop; exact conversation count
	// depends on when cursor stall is detected (may include duplicates from
	// broken server, but we prevent the infinite loop).
	if len(convs) == 0 {
		t.Errorf("expected at least one conversation, got none")
	}
	// Should make exactly 2 requests: first page + second page where cursor stalls
	if requestCount != 2 {
		t.Errorf("expected 2 requests (first page + stall detection), made %d", requestCount)
	}
}

func TestClassifyPancakeSender(t *testing.T) {
	cases := []struct {
		name     string
		from     map[string]interface{}
		content  string
		wantType string
		wantID   string
		wantName string
	}{
		{
			name:     "khách hàng",
			from:     map[string]interface{}{"id": "psid9", "name": "Khách A"},
			wantType: "customer", wantID: "psid9", wantName: "Khách A",
		},
		{
			name: "nhân viên có uid",
			from: map[string]interface{}{
				"id": "psid9", "name": "Page", "uid": "uuid-1", "admin_name": "Lan",
			},
			wantType: "agent", wantID: "uuid-1", wantName: "Lan",
		},
		{
			name:     "nhân viên chỉ có admin_id",
			from:     map[string]interface{}{"id": "x", "name": "Page", "admin_id": "a1"},
			wantType: "agent", wantID: "", wantName: "Page",
		},
		{
			name:     "page tự gửi",
			from:     map[string]interface{}{"id": "p1", "name": "Shop"},
			wantType: "agent", wantID: "", wantName: "Shop",
		},
		{
			name: "automation thắng nhân viên",
			from: map[string]interface{}{
				"id": "x", "name": "Page", "uid": "uuid-2", "is_automated": true,
			},
			wantType: "system", wantID: "uuid-2", wantName: "Page",
		},
		{
			name: "ai_generated thắng nhân viên",
			from: map[string]interface{}{
				"id": "x", "name": "Page", "uid": "uuid-3", "ai_generated": true,
			},
			wantType: "system", wantID: "uuid-3", wantName: "Page",
		},
		{
			name:     "Botcake nhận diện qua tiền tố nội dung",
			from:     map[string]interface{}{"id": "x", "name": "Page", "uid": "uuid-4"},
			content:  "[Botcake Reply] Xin chào bạn",
			wantType: "system", wantID: "uuid-4", wantName: "Page",
		},
		{
			name:     "from nil → system",
			from:     nil,
			content:  "any content",
			wantType: "system", wantID: "", wantName: "",
		},
		{
			name:     "from không có id, uid, admin_id → system",
			from:     map[string]interface{}{"name": "Unknown"},
			content:  "any content",
			wantType: "system", wantID: "", wantName: "Unknown",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			gotType, gotID, gotName := classifyPancakeSender(tc.from, tc.content, "p1")
			if gotType != tc.wantType {
				t.Errorf("senderType = %q, want %q", gotType, tc.wantType)
			}
			if gotID != tc.wantID {
				t.Errorf("senderID = %q, want %q", gotID, tc.wantID)
			}
			if gotName != tc.wantName {
				t.Errorf("senderName = %q, want %q", gotName, tc.wantName)
			}
		})
	}
}

func TestMapPancakeAttachmentsPrefersRealVideoURL(t *testing.T) {
	raw := []interface{}{
		map[string]interface{}{"type": "photo", "url": "https://x/a.jpg", "title": "anh"},
		map[string]interface{}{
			"type":       "video",
			"url":        "https://x/thumb.jpg",
			"video_data": map[string]interface{}{"url": "https://x/real.mp4"},
		},
		map[string]interface{}{"type": "sticker"}, // no url -> dropped
	}
	got := mapPancakeAttachments(raw)

	if len(got) != 2 {
		t.Fatalf("expected 2 usable attachments, got %d", len(got))
	}
	if got[0].Type != "photo" || got[0].URL != "https://x/a.jpg" || got[0].Name != "anh" {
		t.Errorf("bad photo mapping: %+v", got[0])
	}
	if got[1].URL != "https://x/real.mp4" {
		t.Errorf("video must use video_data.url, not the thumbnail; got %q", got[1].URL)
	}
	if mapPancakeAttachments(nil) != nil {
		t.Error("nil input should map to nil")
	}
}

func TestFetchMessagesStopsAtSinceWatermark(t *testing.T) {
	// newest -> oldest, as Pancake orders them
	page := []map[string]interface{}{
		{
			"id": "m3", "inserted_at": "2026-07-20T12:00:00.000000",
			"original_message": "tin mới",
			"from":             map[string]interface{}{"id": "psid", "name": "Khách"},
		},
		{
			"id": "m2", "inserted_at": "2026-07-20T11:00:00.000000",
			"message": "<div></div>",
			"from":    map[string]interface{}{"id": "x", "uid": "uuid-1", "admin_name": "Lan"},
			"attachments": []interface{}{
				map[string]interface{}{"type": "photo", "url": "https://x/a.jpg"},
			},
		},
		{
			"id": "m1", "inserted_at": "2026-07-19T09:00:00.000000",
			"original_message": "tin cũ, phải bị bỏ",
			"from":             map[string]interface{}{"id": "psid", "name": "Khách"},
		},
	}

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		resp, _ := json.Marshal(map[string]interface{}{"success": true, "messages": page})
		w.Write(resp)
	}))
	defer srv.Close()

	since := time.Date(2026, 7, 20, 0, 0, 0, 0, time.UTC)
	msgs, err := newTestAdapter(srv.URL).FetchMessages(context.Background(), "conv1", since)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(msgs) != 2 {
		t.Fatalf("messages older than since must be dropped, got %d", len(msgs))
	}
	if msgs[0].ExternalID != "m3" || msgs[0].SenderType != "customer" || msgs[0].Content != "tin mới" {
		t.Errorf("bad mapping on m3: %+v", msgs[0])
	}
	if msgs[1].SenderType != "agent" || msgs[1].SenderName != "Lan" || msgs[1].SenderExternalID != "uuid-1" {
		t.Errorf("m2 should be an agent message from Lan: %+v", msgs[1])
	}
	if msgs[1].ContentType != "attachment" || len(msgs[1].Attachments) != 1 {
		t.Errorf("m2 should carry one attachment: %+v", msgs[1])
	}
}

func TestFetchMessagesPreservesMessagesWithUnparseableInsertedAt(t *testing.T) {
	// Test that messages with unparseable inserted_at are preserved.
	// parsePancakeTime returns zero time for unparseable values, and zero time
	// comparisons should not filter out the message.
	page := []map[string]interface{}{
		{
			"id":               "m1",
			"inserted_at":      "garbage-not-a-timestamp",
			"original_message": "tin với inserted_at không parse",
			"from":             map[string]interface{}{"id": "psid", "name": "K"},
		},
		{
			"id":               "m2",
			"inserted_at":      "2026-07-20T12:00:00.000000",
			"original_message": "tin bình thường",
			"from":             map[string]interface{}{"id": "psid", "name": "K"},
		},
	}

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		resp, _ := json.Marshal(map[string]interface{}{"success": true, "messages": page})
		w.Write(resp)
	}))
	defer srv.Close()

	msgs, err := newTestAdapter(srv.URL).FetchMessages(context.Background(), "conv1", time.Time{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Both messages should be preserved despite first one having unparseable timestamp
	if len(msgs) != 2 {
		t.Fatalf("expected 2 messages (including unparseable), got %d", len(msgs))
	}
	if msgs[0].ExternalID != "m1" || msgs[0].Content != "tin với inserted_at không parse" {
		t.Errorf("unparseable message should still be kept: %+v", msgs[0])
	}
	if msgs[0].SentAt != (time.Time{}) {
		t.Errorf("unparseable inserted_at should result in zero time, got %v", msgs[0].SentAt)
	}
}

// The live Pancake API contradicts its own docs: each page of messages comes
// back OLDEST-first, while `current_count` pages backwards in time. Verified
// against a real page on 2026-07-26:
//
//	current_count=0  -> 30 msgs, 2026-04-10 .. 2026-07-22 (ascending)
//	current_count=30 -> 30 msgs, 2026-01-05 .. 2026-04-10 (ascending)
//
// So the first entry of a page is the one most likely to predate the sync
// watermark. Bailing out of the page there returns nothing at all.
func TestFetchMessagesKeepsNewMessagesWhenPageIsOldestFirst(t *testing.T) {
	page := []map[string]interface{}{
		{ // older than the watermark
			"id": "m_old", "inserted_at": "2026-07-19T09:00:00.000000",
			"original_message": "tin cũ",
			"from":             map[string]interface{}{"id": "psid", "name": "Khách"},
		},
		{ // newer
			"id": "m_new1", "inserted_at": "2026-07-20T11:00:00.000000",
			"original_message": "tin mới 1",
			"from":             map[string]interface{}{"id": "psid", "name": "Khách"},
		},
		{ // newer still
			"id": "m_new2", "inserted_at": "2026-07-20T12:00:00.000000",
			"original_message": "tin mới 2",
			"from":             map[string]interface{}{"id": "x", "uid": "uuid-1", "admin_name": "Lan"},
		},
	}

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		resp, _ := json.Marshal(map[string]interface{}{"success": true, "messages": page})
		w.Write(resp)
	}))
	defer srv.Close()

	since := time.Date(2026, 7, 20, 0, 0, 0, 0, time.UTC)
	msgs, err := newTestAdapter(srv.URL).FetchMessages(context.Background(), "conv1", since)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(msgs) != 2 {
		t.Fatalf("the two messages newer than the watermark must survive even though "+
			"the page starts with an older one; got %d", len(msgs))
	}
	if msgs[0].ExternalID != "m_new1" || msgs[1].ExternalID != "m_new2" {
		t.Errorf("wrong messages kept: %q, %q", msgs[0].ExternalID, msgs[1].ExternalID)
	}
}

// Tin chỉ có ảnh: original_message rỗng, message là vỏ HTML rỗng. Fallback thẳng
// sang message làm cột content lưu "<div></div>", và rác đó đi vào transcript
// gửi AI chấm điểm. Quan sát thật: 75/469 tin (16%) của một page rơi vào đây.
func TestPancakeMessageTextBoQuaHTMLRong(t *testing.T) {
	cases := []struct {
		name string
		m    map[string]interface{}
		want string
	}{
		{
			name: "có text thô thì dùng nguyên",
			m:    map[string]interface{}{"original_message": "xin chào", "message": "<div>xin chào</div>"},
			want: "xin chào",
		},
		{
			name: "tin chỉ có ảnh -> rỗng, không phải <div></div>",
			m:    map[string]interface{}{"original_message": "", "message": "<div></div>"},
			want: "",
		},
		{
			name: "vỏ thẻ lồng nhau cũng coi là rỗng",
			m:    map[string]interface{}{"message": "<div><span></span></div>"},
			want: "",
		},
		{
			name: "chỉ khoảng trắng giữa thẻ cũng là rỗng",
			m:    map[string]interface{}{"message": "<div>   </div>"},
			want: "",
		},
		{
			name: "message có chữ thật thì giữ lại",
			m:    map[string]interface{}{"message": "<div>nội dung thật</div>"},
			want: "<div>nội dung thật</div>",
		},
		{
			name: "original_message chỉ toàn khoảng trắng -> rơi xuống message",
			m:    map[string]interface{}{"original_message": "   ", "message": "<div></div>"},
			want: "",
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := pancakeMessageText(tc.m); got != tc.want {
				t.Errorf("pancakeMessageText() = %q, muốn %q", got, tc.want)
			}
		})
	}
}

func TestFetchMessagesTinChiCoAnhKhongLuuHTMLRac(t *testing.T) {
	page := []map[string]interface{}{
		{
			"id": "m1", "inserted_at": "2026-07-20T12:00:00.000000",
			"original_message": "",
			"message":          "<div></div>",
			"from":             map[string]interface{}{"id": "psid", "name": "Khách"},
			"attachments": []interface{}{
				map[string]interface{}{"type": "photo", "url": "https://x/a.jpg"},
			},
		},
	}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		resp, _ := json.Marshal(map[string]interface{}{"success": true, "messages": page})
		w.Write(resp)
	}))
	defer srv.Close()

	msgs, err := newTestAdapter(srv.URL).FetchMessages(context.Background(), "conv1", time.Time{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(msgs) != 1 {
		t.Fatalf("expected 1 message, got %d", len(msgs))
	}
	if msgs[0].Content != "" {
		t.Errorf("tin chỉ có ảnh phải có Content rỗng, không phải %q", msgs[0].Content)
	}
	if msgs[0].ContentType != "attachment" {
		t.Errorf("ContentType = %q, muốn attachment", msgs[0].ContentType)
	}
	if len(msgs[0].Attachments) != 1 {
		t.Errorf("phải giữ được ảnh đính kèm, got %d", len(msgs[0].Attachments))
	}
}

func TestFetchMessagesPaginatesWithCurrentCount(t *testing.T) {
	full := make([]map[string]interface{}, pancakeMsgPageSize)
	for i := range full {
		full[i] = map[string]interface{}{
			"id": fmt.Sprintf("m%d", i), "inserted_at": "2026-07-20T12:00:00.000000",
			"original_message": "x",
			"from":             map[string]interface{}{"id": "psid", "name": "K"},
		}
	}
	var gotCounts []string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotCounts = append(gotCounts, r.URL.Query().Get("current_count"))
		body := map[string]interface{}{"success": true, "messages": full}
		if r.URL.Query().Get("current_count") == "30" {
			body["messages"] = full[:2] // short page ends pagination
		}
		resp, _ := json.Marshal(body)
		w.Write(resp)
	}))
	defer srv.Close()

	msgs, err := newTestAdapter(srv.URL).FetchMessages(context.Background(), "conv1", time.Time{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(msgs) != pancakeMsgPageSize+2 {
		t.Errorf("expected %d messages, got %d", pancakeMsgPageSize+2, len(msgs))
	}
	if len(gotCounts) != 2 || gotCounts[0] != "" || gotCounts[1] != "30" {
		t.Errorf("current_count sequence wrong: %v", gotCounts)
	}
}

func TestFetchMessagesStopsOnInfiniteLoop(t *testing.T) {
	// Test that if the server returns exactly pancakeMsgPageSize messages
	// regardless of current_count, FetchMessages stops after pancakeMaxMsgPages
	// to prevent infinite loops. Using context.Background() (no timeout) proves
	// the function exits on its own via the page limit, not via timeout.
	full := make([]map[string]interface{}, pancakeMsgPageSize)
	for i := range full {
		full[i] = map[string]interface{}{
			"id": fmt.Sprintf("m%d", i), "inserted_at": "2026-07-20T12:00:00.000000",
			"original_message": fmt.Sprintf("msg%d", i),
			"from":             map[string]interface{}{"id": "psid", "name": "K"},
		}
	}

	var requestCount int
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestCount++
		if requestCount > pancakeMaxMsgPages+1 {
			t.Fatalf("too many requests: made %d (expected <= %d); infinite loop detected", requestCount, pancakeMaxMsgPages)
		}
		// Always return the same full page, ignoring current_count (broken server)
		body := map[string]interface{}{"success": true, "messages": full}
		resp, _ := json.Marshal(body)
		w.Write(resp)
	}))
	defer srv.Close()

	msgs, err := newTestAdapter(srv.URL).FetchMessages(context.Background(), "conv1", time.Time{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Should exit at pancakeMaxMsgPages, accumulating messages until then
	expectedMessages := pancakeMsgPageSize * pancakeMaxMsgPages
	if len(msgs) != expectedMessages {
		t.Errorf("expected %d messages (full pages * max pages), got %d", expectedMessages, len(msgs))
	}
	// Should make exactly pancakeMaxMsgPages requests before bailing out
	if requestCount != pancakeMaxMsgPages {
		t.Errorf("expected %d requests, made %d", pancakeMaxMsgPages, requestCount)
	}
}

func TestFetchMessagesDetectsCursorStall(t *testing.T) {
	// Test that FetchMessages stops when the page limit is reached, even if
	// the server returns identical full pages. The page count limit acts as a
	// safety net against cursor stall (server ignoring current_count param).
	full := make([]map[string]interface{}, pancakeMsgPageSize)
	for i := range full {
		full[i] = map[string]interface{}{
			"id": fmt.Sprintf("m%d", i), "inserted_at": "2026-07-20T12:00:00.000000",
			"original_message": "x",
			"from":             map[string]interface{}{"id": "psid", "name": "K"},
		}
	}

	var requestCount int
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestCount++
		// Always return the same page regardless of current_count (broken server)
		body := map[string]interface{}{"success": true, "messages": full}
		resp, _ := json.Marshal(body)
		w.Write(resp)
	}))
	defer srv.Close()

	msgs, err := newTestAdapter(srv.URL).FetchMessages(context.Background(), "conv1", time.Time{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// With a page limit of pancakeMaxMsgPages and full pages always returned,
	// we should accumulate pancakeMsgPageSize * pancakeMaxMsgPages messages
	// and stop after pancakeMaxMsgPages requests.
	expectedMessages := pancakeMsgPageSize * pancakeMaxMsgPages
	if len(msgs) != expectedMessages {
		t.Errorf("expected %d messages (full pages * max), got %d", expectedMessages, len(msgs))
	}
	if requestCount != pancakeMaxMsgPages {
		t.Errorf("expected %d requests (page limit), made %d", pancakeMaxMsgPages, requestCount)
	}
}

// TestFetchMessagesReturnsPartialMessagesOnLaterPageError is the I1
// regression test: FetchMessages must return whatever it already fetched
// from earlier successful pages alongside a non-nil error, matching
// facebook.go/zalo_oa.go, instead of discarding everything with (nil, err).
//
// engine/sync.go treats a FetchMessages error as non-fatal — it logs and
// moves to the next conversation — but still finishes the channel sync as
// "success" and advances last_sync_at. Before this fix, any messages already
// fetched from pages preceding the failing one were silently thrown away and
// permanently unreachable on the next sync, without ever surfacing an error.
func TestFetchMessagesReturnsPartialMessagesOnLaterPageError(t *testing.T) {
	firstPage := make([]map[string]interface{}, pancakeMsgPageSize)
	for i := range firstPage {
		firstPage[i] = map[string]interface{}{
			"id": fmt.Sprintf("m%d", i), "inserted_at": "2026-07-20T12:00:00.000000",
			"original_message": "ok",
			"from":             map[string]interface{}{"id": "psid", "name": "K"},
		}
	}

	var requestCount int
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestCount++
		if r.URL.Query().Get("current_count") == "" {
			// First page: full page, succeeds — pagination continues because
			// len(raw) == pancakeMsgPageSize.
			resp, _ := json.Marshal(map[string]interface{}{"success": true, "messages": firstPage})
			w.Write(resp)
			return
		}
		// Second page: server error, no "success" field.
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Fprint(w, `{"message":"boom"}`)
	}))
	defer srv.Close()

	msgs, err := newTestAdapter(srv.URL).FetchMessages(context.Background(), "conv1", time.Time{})

	if err == nil {
		t.Fatal("expected a non-nil error from the failed second page")
	}
	if len(msgs) != pancakeMsgPageSize {
		t.Fatalf("expected the %d messages from the successful first page to be preserved, got %d", pancakeMsgPageSize, len(msgs))
	}
	if requestCount != 2 {
		t.Errorf("expected 2 requests (successful first page + failing second page), made %d", requestCount)
	}
}
