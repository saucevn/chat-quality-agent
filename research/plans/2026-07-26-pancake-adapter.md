# Pancake Channel Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm `pancake` làm loại kênh chat mới cho CQA, đồng bộ hội thoại inbox từ ~20 nền tảng qua một API duy nhất.

**Architecture:** `PancakeAdapter` implement `ChannelAdapter` (3 method) giống Facebook/Zalo, nên sync engine không cần sửa. Khác biệt: token không hết hạn (không cần refresh callback), lỗi trả HTTP 200 nên phải kiểm tra `body.success`, và phải tự throttle 5 req/s vì API không có header quota. Bổ sung `SenderExternalID` vào `SyncedMessage` để chấm điểm theo từng nhân viên.

**Tech Stack:** Go 1.25 · `net/http` + `net/http/httptest` (không thêm dependency mới) · Vue 3 + Vuetify 4

**Spec nguồn:** [../pancake-integration.md](../pancake-integration.md)

## Global Constraints

- **Không thêm dependency Go mới.** Rate limiter viết tay trong repo, không dùng `golang.org/x/time/rate`.
- **v1 chỉ xử lý `type=INBOX`.** Bỏ qua comment và review.
- **Tin bot/automation map sang `sender_type = "system"`**, vẫn lưu để giữ ngữ cảnh, không tính vào điểm nhân viên.
- **Polling, không webhook.**
- **Không bao giờ dùng HTTP status code làm điều kiện lỗi** — Pancake trả 200 kèm `success:false`.
- Base URL: `https://pages.fm/api` · conversations ở `public_api/v2` · messages ở `public_api/v1`.
- Chuỗi UI phải qua i18n (`frontend/src/i18n/vi.ts` và `en.ts`), không hard-code tiếng Việt trong component.
- Chạy test bằng `make test-go` ở repo root (nó gỡ biến `.env.dev` khỏi môi trường).

## Điểm cần VERIFY bằng token thật

Bảy điểm dưới đây spec Pancake không nói rõ hoặc tự mâu thuẫn. Code đã viết theo giả định an toàn nhất và đánh dấu `VERIFY-n` ngay tại chỗ. Khi có token, chạy probe rồi sửa đúng chỗ đánh dấu.

| ID | Vấn đề | Giả định đang dùng | Chặn task |
|---|---|---|---|
| VERIFY-1 | `since`/`until` lọc theo `inserted_at` hay `updated_at`? | Gửi kèm `order_by=updated_at` | Task 3 |
| VERIFY-2 | Enum `type`: schema ghi `LIVESTREAM`, mô tả param ghi `COMMENT_LIVESTREAM`/`POST` | Gửi `type=INBOX` **và** lọc lại phía client | Task 3 |
| VERIFY-3 | Timezone của `inserted_at`/`updated_at` (không có suffix) | Coi là UTC | Task 3, 4 |
| VERIFY-4 | Attachment type cho audio/voice và file/document không có trong enum | Giữ nguyên `type` API trả về, không map lại | Task 4 |
| VERIFY-5 | Giá trị thật của `Page.platform` | Không dùng tới ở v1 | — |
| VERIFY-6 | Retention dữ liệu thô | Không dựa vào | — |
| VERIFY-7 | Endpoint nhẹ nhất cho HealthCheck | Dùng `GET /tags` | Task 2 |

Probe khi có token (thay `PAGE_ID`, `TOKEN`):

```bash
curl -s "https://pages.fm/api/public_api/v2/pages/PAGE_ID/conversations?page_access_token=TOKEN&type=INBOX&order_by=updated_at" | head -c 2000
```

## File Structure

| File | Trách nhiệm |
|---|---|
| `backend/channels/pacer.go` | Throttle tối thiểu giữa 2 request. Độc lập, không biết gì về Pancake. |
| `backend/channels/pacer_test.go` | Test pacer |
| `backend/channels/pancake.go` | Credentials, HTTP client, 3 method của interface, mapping |
| `backend/channels/pancake_test.go` | Test adapter bằng `httptest` |
| `backend/channels/adapter.go` | *(sửa)* thêm `SenderExternalID` vào `SyncedMessage` |
| `backend/engine/sync.go` | *(sửa)* ghi `SenderExternalID` xuống DB |
| `backend/channels/facebook.go`, `zalo_oa.go` | *(sửa)* điền `SenderExternalID` |
| `backend/channels/registry.go` | *(sửa)* thêm `case "pancake"` |
| `backend/api/handlers/channels.go` | *(sửa)* validation `oneof` |
| 7 file frontend | *(sửa)* hiển thị loại kênh mới |

**Thứ tự:** Task 4 thêm field `SenderExternalID`, Task 5 dùng nó. Cứ thực thi theo đúng số thứ tự thì không vướng lỗi biên dịch.

---

### Task 1: Rate limiter

Pancake giới hạn 5 request/giây/page và **không trả header quota nào** — đã probe 16 request liên tiếp, response chỉ có `x-request-id`. Phải tự throttle.

**Files:**
- Create: `backend/channels/pacer.go`
- Test: `backend/channels/pacer_test.go`

**Interfaces:**
- Consumes: —
- Produces: `newPacer(interval time.Duration) *pacer`, method `(*pacer).wait(ctx context.Context) error`

- [ ] **Step 1: Write the failing test**

```go
// backend/channels/pacer_test.go
package channels

import (
	"context"
	"testing"
	"time"
)

func TestPacerSpacesRequests(t *testing.T) {
	p := newPacer(20 * time.Millisecond)

	start := time.Now()
	for i := 0; i < 3; i++ {
		if err := p.wait(context.Background()); err != nil {
			t.Fatalf("wait #%d returned error: %v", i, err)
		}
	}
	elapsed := time.Since(start)

	// slot 1 is immediate; slots 2 and 3 each wait one interval
	if elapsed < 40*time.Millisecond {
		t.Errorf("3 paced calls should take >= 40ms, took %v", elapsed)
	}
}

func TestPacerRespectsContextCancellation(t *testing.T) {
	p := newPacer(time.Hour)

	if err := p.wait(context.Background()); err != nil {
		t.Fatalf("first wait should be immediate, got: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
	defer cancel()

	if err := p.wait(ctx); err == nil {
		t.Error("expected an error when context expires while waiting for a slot")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./channels/ -run TestPacer -v`
Expected: FAIL — `undefined: newPacer`

- [ ] **Step 3: Write minimal implementation**

```go
// backend/channels/pacer.go
package channels

import (
	"context"
	"sync"
	"time"
)

// pacer enforces a minimum interval between outbound requests.
//
// Pancake limits public API calls to 5 per page per second and exposes no
// quota headers (no X-RateLimit-*, no Retry-After), so self-throttling is the
// only way to stay under the limit.
type pacer struct {
	mu       sync.Mutex
	interval time.Duration
	next     time.Time
}

func newPacer(interval time.Duration) *pacer {
	return &pacer{interval: interval}
}

// wait blocks until this caller's slot arrives, or ctx is done.
func (p *pacer) wait(ctx context.Context) error {
	p.mu.Lock()
	now := time.Now()
	if p.next.Before(now) {
		p.next = now
	}
	slot := p.next
	p.next = p.next.Add(p.interval)
	p.mu.Unlock()

	delay := time.Until(slot)
	if delay <= 0 {
		return nil
	}

	timer := time.NewTimer(delay)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-timer.C:
		return nil
	}
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && go test ./channels/ -run TestPacer -v`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/channels/pacer.go backend/channels/pacer_test.go
git commit -m "feat(channels): thêm pacer để tự throttle request"
```

---

### Task 2: Pancake client core + HealthCheck

**Files:**
- Create: `backend/channels/pancake.go`
- Test: `backend/channels/pancake_test.go`

**Interfaces:**
- Consumes: `newPacer`, `(*pacer).wait` từ Task 1
- Produces:
  - `type PancakeCredentials struct { PageID string; PageAccessToken string }` (json tag `page_id`, `page_access_token`)
  - `func NewPancakeAdapter(creds PancakeCredentials) *PancakeAdapter`
  - Field `apiRoot string` trên `PancakeAdapter` — test ghi đè bằng URL của `httptest.Server`
  - `func (p *PancakeAdapter) doRequest(ctx context.Context, path string, params url.Values) (map[string]interface{}, error)`
  - `func (p *PancakeAdapter) v1(suffix string) string`, `v2(suffix string) string`
  - `func (p *PancakeAdapter) HealthCheck(ctx context.Context) error`

- [ ] **Step 1: Write the failing test**

```go
// backend/channels/pancake_test.go
package channels

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// newTestAdapter wires an adapter to a stub server.
func newTestAdapter(srvURL string) *PancakeAdapter {
	a := NewPancakeAdapter(PancakeCredentials{PageID: "p1", PageAccessToken: "tok123"})
	a.apiRoot = srvURL
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./channels/ -run TestPancake -v`
Expected: FAIL — `undefined: NewPancakeAdapter`

- [ ] **Step 3: Write minimal implementation**

```go
// backend/channels/pancake.go
package channels

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
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
	return "/public_api/v1/pages/" + p.creds.PageID + suffix
}

func (p *PancakeAdapter) v2(suffix string) string {
	return "/public_api/v2/pages/" + p.creds.PageID + suffix
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
	params.Set("page_access_token", p.creds.PageAccessToken)

	endpoint := p.apiRoot + path + "?" + params.Encode()
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && go test ./channels/ -run TestPancake -v`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/channels/pancake.go backend/channels/pancake_test.go
git commit -m "feat(channels): Pancake client core, kiểm tra body.success thay vì HTTP status"
```

---

### Task 3: FetchRecentConversations

**Files:**
- Modify: `backend/channels/pancake.go`
- Test: `backend/channels/pancake_test.go`

**Interfaces:**
- Consumes: `doRequest`, `v2` từ Task 2
- Produces:
  - `func parsePancakeTime(v interface{}) time.Time`
  - `func (p *PancakeAdapter) FetchRecentConversations(ctx context.Context, since time.Time, limit int) ([]SyncedConversation, error)`
  - Hằng `pancakeConvPageSize = 60`

- [ ] **Step 1: Write the failing test**

Thêm `"encoding/json"`, `"net/url"`, `"time"` vào import block của `pancake_test.go`, rồi thêm:

```go
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./channels/ -run 'TestParsePancakeTime|TestFetchRecentConversations' -v`
Expected: FAIL — `undefined: parsePancakeTime`, `undefined: pancakeConvPageSize`

- [ ] **Step 3: Write minimal implementation**

Thêm `"strconv"` vào import block của `pancake.go`, rồi thêm:

```go
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && go test ./channels/ -run 'TestParsePancakeTime|TestFetchRecentConversations' -v`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/channels/pancake.go backend/channels/pancake_test.go
git commit -m "feat(channels): Pancake FetchRecentConversations, chỉ lấy inbox"
```

---

### Task 4: `SenderExternalID` xuyên suốt

`models.Message.SenderExternalID` đã tồn tại trong DB nhưng **chưa bao giờ được ghi**, vì `SyncedMessage` không có field tương ứng. Không có nó thì không chấm điểm theo từng nhân viên được. Task 5 sẽ dùng field này.

**Files:**
- Modify: `backend/channels/adapter.go:18-27`
- Modify: `backend/engine/sync.go:228-241`
- Modify: `backend/channels/facebook.go`, `backend/channels/zalo_oa.go`
- Test: `backend/channels/adapter_test.go` (mới)

**Interfaces:**
- Produces: field `SenderExternalID string` trên `SyncedMessage`

- [ ] **Step 1: Write the failing test**

```go
// backend/channels/adapter_test.go
package channels

import "testing"

// SenderExternalID carries the platform identity of whoever sent the message:
// the staff UUID for agent messages, the customer PSID for customer messages.
// Without it, per-agent quality scoring is impossible.
func TestSyncedMessageCarriesSenderExternalID(t *testing.T) {
	m := SyncedMessage{SenderExternalID: "uuid-1"}
	if m.SenderExternalID != "uuid-1" {
		t.Errorf("SenderExternalID = %q, want %q", m.SenderExternalID, "uuid-1")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./channels/ -run TestSyncedMessageCarriesSenderExternalID -v`
Expected: FAIL — `unknown field SenderExternalID in struct literal of type SyncedMessage`

- [ ] **Step 3: Write minimal implementation**

`backend/channels/adapter.go` — thay struct `SyncedMessage`:

```go
// SyncedMessage represents a message fetched from an external channel.
type SyncedMessage struct {
	ExternalID string
	SenderType string // "customer" | "agent" | "system"
	SenderName string
	// SenderExternalID is the platform-side identity of the sender: the staff
	// UUID for agent messages, the customer id/PSID for customer messages.
	// Required for per-agent quality scoring.
	SenderExternalID string
	Content          string
	ContentType      string // "text" | "image" | "file" | "sticker" | "gif"
	Attachments      []Attachment
	SentAt           time.Time
	RawData          map[string]interface{}
}
```

`backend/engine/sync.go` — trong `upsertMessage`, thêm một dòng vào literal `models.Message`:

```go
	message := models.Message{
		ID:                pkg.NewUUID(),
		TenantID:          tenantID,
		ConversationID:    conversationID,
		ExternalMessageID: msg.ExternalID,
		SenderType:        msg.SenderType,
		SenderName:        msg.SenderName,
		SenderExternalID:  msg.SenderExternalID,
		Content:           msg.Content,
		ContentType:       msg.ContentType,
		Attachments:       string(attachmentsJSON),
		SentAt:            msg.SentAt,
		RawData:           string(rawDataJSON),
		CreatedAt:         time.Now(),
	}
```

`backend/channels/facebook.go` — trong `FetchMessages`, vòng lặp đã lấy map `from` để quyết định `senderType`. Ngay cạnh chỗ đó thêm:

```go
		senderExternalID, _ := from["id"].(string)
```

rồi thêm `SenderExternalID: senderExternalID,` vào literal `SyncedMessage` đang được append.

`backend/channels/zalo_oa.go` — trong `FetchMessages`, `src` đã được dùng để quyết định `senderType` (`src == 0` là OA gửi). Thêm:

```go
		senderExternalID, _ := msgMap["from_id"].(string)
```

rồi thêm `SenderExternalID: senderExternalID,` vào literal `SyncedMessage`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && go test ./channels/ ./engine/ 2>&1 | tail -20`
Expected: `channels` PASS. `engine` build được; `TestCalculateCostUSD` vẫn FAIL — lỗi có sẵn trên `main`, không phải do task này.

- [ ] **Step 5: Commit**

```bash
git add backend/channels/adapter.go backend/channels/adapter_test.go \
        backend/channels/facebook.go backend/channels/zalo_oa.go backend/engine/sync.go
git commit -m "feat(channels): ghi SenderExternalID để chấm điểm theo từng nhân viên"
```

---

### Task 5: FetchMessages + phân loại người gửi

Task quan trọng nhất về chất lượng dữ liệu. Thứ tự phân loại có ý nghĩa: **bot thắng nhân viên**, vì Pancake vẫn gán tin tự động cho tài khoản nhân viên — không tách ra thì AI sẽ chấm bot như người.

**Files:**
- Modify: `backend/channels/pancake.go`
- Test: `backend/channels/pancake_test.go`

**Interfaces:**
- Consumes: `doRequest`, `v1`, `parsePancakeTime`, field `SenderExternalID` (Task 4)
- Produces:
  - `func classifyPancakeSender(from map[string]interface{}, content, pageID string) (senderType, senderID, senderName string)`
  - `func mapPancakeAttachments(v interface{}) []Attachment`
  - `func (p *PancakeAdapter) mapMessage(m map[string]interface{}, sentAt time.Time) SyncedMessage`
  - `func (p *PancakeAdapter) FetchMessages(ctx context.Context, conversationID string, since time.Time) ([]SyncedMessage, error)`
  - Hằng `pancakeMsgPageSize = 30`, `botcakePrefix = "[Botcake"`

- [ ] **Step 1: Write the failing test**

```go
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./channels/ -run 'TestClassifyPancakeSender|TestMapPancakeAttachments|TestFetchMessages' -v`
Expected: FAIL — `undefined: classifyPancakeSender`

- [ ] **Step 3: Write minimal implementation**

Thêm `"strings"` vào import block của `pancake.go`, rồi thêm:

```go
const (
	pancakeMsgPageSize = 30

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
	uid, _ := from["uid"].(string)
	adminID, _ := from["admin_id"].(string)
	adminName, _ := from["admin_name"].(string)
	name, _ := from["name"].(string)
	fromID, _ := from["id"].(string)

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

func (p *PancakeAdapter) mapMessage(m map[string]interface{}, sentAt time.Time) SyncedMessage {
	id, _ := m["id"].(string)
	from, _ := m["from"].(map[string]interface{})

	// original_message is the raw text; message may contain rendered HTML.
	content, _ := m["original_message"].(string)
	if content == "" {
		content, _ = m["message"].(string)
	}

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
func (p *PancakeAdapter) FetchMessages(ctx context.Context, conversationID string, since time.Time) ([]SyncedMessage, error) {
	var out []SyncedMessage
	offset := 0

	for {
		params := url.Values{}
		if offset > 0 {
			params.Set("current_count", strconv.Itoa(offset))
		}

		path := p.v1("/conversations/" + url.PathEscape(conversationID) + "/messages")
		body, err := p.doRequest(ctx, path, params)
		if err != nil {
			return nil, err
		}

		raw, _ := body["messages"].([]interface{})
		if len(raw) == 0 {
			break
		}

		reachedWatermark := false
		for _, item := range raw {
			m, ok := item.(map[string]interface{})
			if !ok {
				continue
			}
			sentAt := parsePancakeTime(m["inserted_at"])
			if !since.IsZero() && !sentAt.IsZero() && !sentAt.After(since) {
				reachedWatermark = true
				break
			}
			out = append(out, p.mapMessage(m, sentAt))
		}

		if reachedWatermark || len(raw) < pancakeMsgPageSize {
			break
		}
		offset += pancakeMsgPageSize
	}

	return out, nil
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && go test ./channels/ -v 2>&1 | tail -30`
Expected: PASS toàn bộ package `channels`

- [ ] **Step 5: Commit**

```bash
git add backend/channels/pancake.go backend/channels/pancake_test.go
git commit -m "feat(channels): Pancake FetchMessages, tách tin bot sang sender_type=system"
```

---

### Task 6: Đăng ký adapter + cho phép channel_type mới

**Files:**
- Modify: `backend/channels/registry.go:9-26`
- Modify: `backend/api/handlers/channels.go:33`
- Modify: `backend/db/models/channel.go:8`
- Test: `backend/channels/registry_test.go`

**Interfaces:**
- Consumes: `NewPancakeAdapter`, `PancakeCredentials` từ Task 2
- Produces: `NewAdapter("pancake", credsJSON)` trả về `*PancakeAdapter`

- [ ] **Step 1: Write the failing test**

```go
// thêm vào backend/channels/registry_test.go

func TestNewAdapterSupportsPancake(t *testing.T) {
	creds := []byte(`{"page_id":"p1","page_access_token":"tok123"}`)

	adapter, err := NewAdapter("pancake", creds)
	if err != nil {
		t.Fatalf("pancake should be a supported channel type, got: %v", err)
	}
	pa, ok := adapter.(*PancakeAdapter)
	if !ok {
		t.Fatalf("expected *PancakeAdapter, got %T", adapter)
	}
	if pa.creds.PageID != "p1" || pa.creds.PageAccessToken != "tok123" {
		t.Errorf("credentials not unmarshalled: %+v", pa.creds)
	}
}

func TestNewAdapterRejectsBadPancakeCredentials(t *testing.T) {
	if _, err := NewAdapter("pancake", []byte(`not json`)); err == nil {
		t.Error("expected an error for malformed pancake credentials")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./channels/ -run TestNewAdapter -v`
Expected: FAIL — `unsupported channel type: pancake`

- [ ] **Step 3: Write minimal implementation**

`backend/channels/registry.go` — thêm case vào `switch channelType`, ngay trước `default`:

```go
	case "pancake":
		var creds PancakeCredentials
		if err := json.Unmarshal(credentialsJSON, &creds); err != nil {
			return nil, fmt.Errorf("invalid pancake credentials: %w", err)
		}
		return NewPancakeAdapter(creds), nil
```

`backend/api/handlers/channels.go:33` — mở rộng validation:

```go
	ChannelType string `json:"channel_type" binding:"required,oneof=zalo_oa facebook pancake"`
```

`backend/db/models/channel.go:8` — cập nhật comment enum:

```go
	ChannelType string `gorm:"type:varchar(20);not null" json:"channel_type"` // zalo_oa | facebook | pancake
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && go test ./channels/ -run TestNewAdapter -v`
Expected: PASS (các test cũ của registry vẫn PASS)

- [ ] **Step 5: Commit**

```bash
git add backend/channels/registry.go backend/channels/registry_test.go \
        backend/api/handlers/channels.go backend/db/models/channel.go
git commit -m "feat(api): cho phép channel_type=pancake"
```

---

### Task 7: Frontend — hiển thị và tạo kênh Pancake

Không có constant dùng chung cho danh sách loại kênh; mỗi file hard-code riêng. Phải sửa đủ 7 file — sót chỗ nào thì kênh Pancake hiện ra dưới dạng "Zalo OA" ở màn hình đó.

**Files:**
- Modify: `frontend/src/i18n/vi.ts`, `frontend/src/i18n/en.ts`
- Modify: `frontend/src/views/Channels.vue`
- Modify: `frontend/src/views/Channels/ChannelDetail.vue`
- Modify: `frontend/src/views/Dashboard.vue`
- Modify: `frontend/src/views/Messages.vue` (**hai chỗ riêng biệt**)
- Modify: `frontend/src/components/JobWizard/StepInput.vue`

**Interfaces:**
- Consumes: `channel_type === 'pancake'` do Task 6 cho phép
- Produces: form gửi `{channel_type:"pancake", name, credentials:{page_id, page_access_token}}`

- [ ] **Step 1: Thêm chuỗi i18n**

`frontend/src/i18n/vi.ts` — cạnh `channel_zalo` / `channel_facebook`:

```ts
  channel_pancake: 'Pancake',
  pancake_page_id: 'Page ID',
  pancake_page_access_token: 'Page Access Token',
  pancake_hint: 'Lấy tại Pancake > Cài đặt > Công cụ > Page Access Token',
```

`frontend/src/i18n/en.ts` — cùng key:

```ts
  channel_pancake: 'Pancake',
  pancake_page_id: 'Page ID',
  pancake_page_access_token: 'Page Access Token',
  pancake_hint: 'Find it in Pancake > Settings > Tools > Page Access Token',
```

- [ ] **Step 2: Thêm lựa chọn và form ở `Channels.vue`**

Thêm option vào `v-select` chọn loại kênh:

```ts
{ title: 'Pancake', value: 'pancake' }
```

Thêm block form, đặt cạnh block Facebook đã có:

```vue
<template v-if="form.channel_type === 'pancake'">
  <v-text-field
    v-model="form.page_id"
    :label="t('pancake_page_id')"
    variant="outlined"
    density="comfortable"
    required
  />
  <v-text-field
    v-model="form.page_access_token"
    :label="t('pancake_page_access_token')"
    :hint="t('pancake_hint')"
    persistent-hint
    variant="outlined"
    density="comfortable"
    required
  />
</template>
```

Thêm hàm submit. Pancake không có OAuth nên tạo thẳng như Facebook, không redirect:

```ts
async function createPancake() {
  loading.value = true
  try {
    await channelsStore.createChannel({
      channel_type: 'pancake',
      name: form.value.name,
      credentials: {
        page_id: form.value.page_id,
        page_access_token: form.value.page_access_token,
      },
    })
    dialog.value = false
    await channelsStore.fetchChannels()
  } finally {
    loading.value = false
  }
}
```

Thêm nút submit tương ứng, và cập nhật điều kiện icon/màu/badge trong danh sách kênh để `'pancake'` có nhánh riêng thay vì rơi vào nhánh mặc định của Zalo.

- [ ] **Step 3: Cập nhật 5 file hiển thị còn lại**

Mỗi chỗ đang phân nhánh nhị phân `ch.channel_type === 'zalo_oa' ? … : …` phải thành ba nhánh:

- `views/Channels/ChannelDetail.vue` — badge tên loại kênh
- `views/Dashboard.vue` — tên + icon kênh
- `views/Messages.vue` — **hai chỗ**: dropdown lọc kênh, và mảng options thứ hai ở phần dưới file; cộng các điều kiện icon/màu
- `components/JobWizard/StepInput.vue` — chip màu/tên khi chọn nguồn dữ liệu cho job

Thêm `{ title: 'Pancake', value: 'pancake' }` vào mọi mảng options loại kênh.

- [ ] **Step 4: Kiểm tra build và test**

Run: `cd frontend && npx vue-tsc -b && npx vitest run`
Expected: type-check sạch, Vitest PASS (5 test hiện có)

Kiểm tra bằng mắt: `make dev`, mở http://localhost:3000 > Cài đặt > Kênh chat > Tạo mới, chọn Pancake, thấy 2 ô Page ID và Page Access Token.

- [ ] **Step 5: Commit**

```bash
git add frontend/src
git commit -m "feat(frontend): thêm loại kênh Pancake vào form và các màn hình hiển thị"
```

---

## Sau khi xong

```bash
make test
```

Kỳ vọng: mọi test mới PASS. Hai test **fail sẵn trên `main`**, không liên quan plan này: `ai/prompts_test.go` (build fail, `BuildQCPrompt` đổi chữ ký) và `engine/analyzer_test.go` (`TestCalculateCostUSD/claude_haiku_cheap`, đơn giá đã đổi).

Khi có token Pancake thật, chạy probe cho 7 điểm VERIFY ở đầu tài liệu rồi sửa đúng các chỗ đánh dấu `VERIFY-n` trong `pancake.go`.

## Nằm ngoài phạm vi v1

- Hội thoại `COMMENT` và review — cần rubric riêng
- Webhook — phải liên hệ support Pancake, không có chữ ký, tự treo và không replay
- Ghi ngược tag "QC không đạt" về Pancake qua `POST .../conversations/{id}/tags`
- Gọi `GET /pages/{page_id}/users` để đổi staff UUID sang tên hiển thị
- Dùng `extra_info.sentiment_analysis` có sẵn của Pancake làm đầu vào cho prompt
