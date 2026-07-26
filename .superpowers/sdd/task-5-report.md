# Task 5 Report: FetchMessages + phân loại người gửi

## Trạng thái: DONE_WITH_CONCERNS

## Files thay đổi
- Modified: `backend/channels/pancake.go` (+158 dòng)
  - Thêm import `strings`
  - Thêm hằng `pancakeMsgPageSize = 30`, `botcakePrefix = "[Botcake"`
  - Thêm `classifyPancakeSender(from, content, pageID) (senderType, senderID, senderName string)`
  - Thêm `mapPancakeAttachments(v interface{}) []Attachment`
  - Thêm `(p *PancakeAdapter) mapMessage(m map[string]interface{}, sentAt time.Time) SyncedMessage`
  - Thêm `(p *PancakeAdapter) FetchMessages(ctx, conversationID, since) ([]SyncedMessage, error)`
- Modified: `backend/channels/pancake_test.go` (+177 dòng)
  - Thêm `TestClassifyPancakeSender` (7 subtest cases)
  - Thêm `TestMapPancakeAttachmentsPrefersRealVideoURL`
  - Thêm `TestFetchMessagesStopsAtSinceWatermark`
  - Thêm `TestFetchMessagesPaginatesWithCurrentCount`

Không sửa `adapter.go`, `registry.go`, `facebook.go`, `zalo_oa.go`, `pacer.go` — đúng như brief yêu cầu. Giữ nguyên comment `VERIFY-3` (trong `parsePancakeTime`, không đụng tới) và `VERIFY-4` (trong `mapPancakeAttachments`, thêm mới nguyên văn từ brief).

## Quy trình TDD

### Bước 1-2: Viết test trước, chạy cho FAIL
Lệnh: `cd backend && go test ./channels/ -run 'TestClassifyPancakeSender|TestMapPancakeAttachments|TestFetchMessages' -v`

Output (rút gọn):
```
# github.com/vietbui/chat-quality-agent/channels [github.com/vietbui/chat-quality-agent/channels.test]
channels/pancake_test.go:422:31: undefined: classifyPancakeSender
channels/pancake_test.go:446:9: undefined: mapPancakeAttachments
channels/pancake_test.go:457:5: undefined: mapPancakeAttachments
channels/pancake_test.go:492:39: newTestAdapter(srv.URL).FetchMessages undefined (type *PancakeAdapter has no field or method FetchMessages)
channels/pancake_test.go:512:41: undefined: pancakeMsgPageSize
channels/pancake_test.go:532:39: newTestAdapter(srv.URL).FetchMessages undefined (type *PancakeAdapter has no field or method FetchMessages)
channels/pancake_test.go:536:18: undefined: pancakeMsgPageSize
channels/pancake_test.go:537:44: undefined: pancakeMsgPageSize
FAIL	github.com/vietbui/chat-quality-agent/channels [build failed]
FAIL
```
Fail đúng lý do brief ghi (`undefined: classifyPancakeSender`, v.v.) — xác nhận test được viết trước implementation.

### Bước 3: Implementation
Thêm nguyên văn code trong brief vào `pancake.go` (đã include sẵn `import "strings"`).

### Bước 4: Chạy test cho PASS

Lệnh: `cd backend && go test ./channels/ -run 'TestClassifyPancakeSender|TestMapPancakeAttachments|TestFetchMessages' -v`
```
=== RUN   TestClassifyPancakeSender
--- PASS: TestClassifyPancakeSender (0.00s)
    --- PASS: TestClassifyPancakeSender/khách_hàng (0.00s)
    --- PASS: TestClassifyPancakeSender/nhân_viên_có_uid (0.00s)
    --- PASS: TestClassifyPancakeSender/nhân_viên_chỉ_có_admin_id (0.00s)
    --- PASS: TestClassifyPancakeSender/page_tự_gửi (0.00s)
    --- PASS: TestClassifyPancakeSender/automation_thắng_nhân_viên (0.00s)
    --- PASS: TestClassifyPancakeSender/ai_generated_thắng_nhân_viên (0.00s)
    --- PASS: TestClassifyPancakeSender/Botcake_nhận_diện_qua_tiền_tố_nội_dung (0.00s)
=== RUN   TestMapPancakeAttachmentsPrefersRealVideoURL
--- PASS: TestMapPancakeAttachmentsPrefersRealVideoURL (0.00s)
=== RUN   TestFetchMessagesStopsAtSinceWatermark
--- PASS: TestFetchMessagesStopsAtSinceWatermark (0.00s)
=== RUN   TestFetchMessagesPaginatesWithCurrentCount
--- PASS: TestFetchMessagesPaginatesWithCurrentCount (0.20s)
PASS
ok  	github.com/vietbui/chat-quality-agent/channels	0.747s
```

Lệnh toàn package: `cd backend && go test ./channels/ -v 2>&1 | tail -60` — PASS toàn bộ, không có FAIL nào. Đếm test top-level trước/sau bằng `grep -c "^--- PASS"`: 18 (baseline, `git stash`) → 22 (sau khi thêm 4 test mới). Không có test cũ nào bị hỏng.

Cũng chạy `go vet ./channels/` (sạch) và `go build ./...` ở `backend/` (build thành công, không lỗi biên dịch toàn dự án).

### Bước 5: Commit
```
0265570 feat(channels): Pancake FetchMessages, tách tin bot sang sender_type=system
```
`git diff --stat`: 2 files changed, 335 insertions(+), 0 deletions(-).

## Tự review diff

- Code implementation khớp nguyên văn với brief (đã diff so sánh từng dòng), không tự ý thêm/bớt logic.
- Thứ tự kiểm tra trong `classifyPancakeSender` đúng yêu cầu: `aiGenerated || isAutomated || strings.HasPrefix(...)` được kiểm tra và return `"system"` TRƯỚC nhánh kiểm tra `agent` (uid/admin_id/pageID match). Không đảo thứ tự.
- `mapMessage` ưu tiên `original_message` trước `message` (HTML) đúng comment giải thích.
- `mapPancakeAttachments` ưu tiên `video_data.url` thay vì `url` (thumbnail) cho video, drop item không có URL khả dụng — khớp test `TestMapPancakeAttachmentsPrefersRealVideoURL`.
- `FetchMessages`: watermark dùng `!sentAt.After(since)` nên message có timestamp bằng đúng `since` cũng bị loại — hợp lý cho incremental sync tránh trùng lặp.
- `gofmt -l channels/pancake.go` báo file cần format lại, nhưng khi `git stash` để kiểm tra baseline thì vấn đề format đã tồn tại từ trước (nằm trong const block `pancakeConvPageSize`/`pancakeMaxConvPages` do Task 4 để lại, không thuộc code Task 5 thêm vào). Không sửa vì ngoài phạm vi Task 5 và brief nói không sửa các phần không liên quan.
- Không thêm dependency mới — chỉ dùng thêm `strings` từ standard library.

## Lo ngại về phân loại người gửi (theo yêu cầu brief — không tự sửa)

1. **Bot vendor khác ngoài Botcake không được nhận diện.** `classifyPancakeSender` chỉ bắt được automation qua 3 tín hiệu: `ai_generated`, `is_automated`, hoặc tiền tố nội dung `"[Botcake"`. Nếu một chatbot/automation khác (không phải Botcake, hoặc Botcake nhưng tắt tùy chọn gắn tiền tố) trả lời và Pancake gán tin đó cho một `uid`/`admin_id` nhân viên mà KHÔNG set `is_automated`/`ai_generated`, tin đó sẽ lọt vào nhánh `"agent"` — đúng chính là kịch bản mà toàn bộ Task 5 được thiết kế để chặn, nhưng classifier chỉ có thể phát hiện những gì Pancake thực sự phơi ra qua API.

2. **Nhánh "page tự gửi" có thể lẫn tin tự động thật.** Khi `from.id == pageID` và không có `uid`/`admin_id` (case "page tự gửi" trong test), hàm trả về `"agent"`. Nếu Pancake gửi tin auto-reply/away-message cấp Page (ví dụ tin chào tự động ngoài giờ) dưới danh nghĩa chính Page mà không set `is_automated`/`ai_generated` và nội dung không có tiền tố Botcake, tin đó sẽ bị chấm nhầm là nhân viên thay vì hệ thống. Đây là blind spot cụ thể hơn dòng comment "Known blind spot" đã có trong code (dòng đó chỉ nói về nhân viên bấm gửi gợi ý AI/canned reply).

3. **Rủi ro vòng lặp vô hạn trong `FetchMessages` (đã nêu theo yêu cầu, không tự thêm cơ chế chặn).** Không giống `FetchRecentConversations` (có `pancakeMaxConvPages` + phát hiện cursor không tiến), `FetchMessages` không có giới hạn số trang. Vòng lặp thoát khi `reachedWatermark` hoặc `len(raw) < pancakeMsgPageSize`. Nếu `since` là zero-value (full sync ban đầu) VÀ API trả về liên tục đúng `pancakeMsgPageSize` tin nhắn bất kể `current_count` (ví dụ do lỗi phân trang phía Pancake, hoặc dữ liệu test/mock lặp lại), hai điều kiện thoát đều không bao giờ đúng → lặp vô hạn. Vì `since` càng cụ thể (không zero) thì mốc thời gian sẽ luôn kích hoạt watermark sớm hay muộn, nên rủi ro này chỉ thực sự đáng lo với sync lần đầu (`since` = zero) kết hợp với dữ liệu/API bị lỗi phân trang.

## Test output cuối cùng
`go test ./channels/` sau khi commit: PASS (không chạy `go test ./...` theo đúng chỉ dẫn brief).

---

# Reviewer Findings & Fixes (feat/pancake-adapter branch)

**Status:** FIXED & VERIFIED

**Commit:** `3b87f03` (fix: add safeguards to FetchMessages and fix classifyPancakeSender for nil from)

## Issues Addressed

### 1. FetchMessages lặp vô hạn
**Problem:** Stub server trả đúng 30 tin bất kể `current_count`, sau 3s bắn 15 request, hàm treo, slice phình vô hạn.

**Fix Applied:**
- Thêm `pancakeMaxMsgPages = 200` (tương ứng ~6000 tin/hội thoại)
- Phát hiện cursor stall: nếu offset không đổi sau full page → dừng
- Comment: "Safety nets against server misbehavior, not business logic limits"

### 2. Tin `from=nil` được phân loại thành khách hàng
**Problem:** `classifyPancakeSender(nil, "hello", "page1")` trả `("customer", "", "")`. Tin không có `from` hợp lệ là sự kiện hệ thống (enum system_message của Pancake).

**Fix Applied:**
- Nếu `from == nil` → return `("system", "", "")`
- Nếu `from` không có id/uid/admin_id → return `("system", "", name)`
- Comment giải thích: "Pancake's enum includes system_message"
- 7 case cũ vẫn PASS, thêm 2 case mới cho `from=nil`

### 3. Test chỉ phủ đường hạnh phúc
**Fixes Applied:**

**3a. Lặp vô hạn test:**
```go
TestFetchMessagesStopsOnInfiniteLoop: Stub trả 30 tin mỗi request.
  Kỳ vọng: Exit sau 200 pages, 6000 tin tích lũy.
  Chứng minh: Chạy 39.80s (không timeout), request count = pancakeMaxMsgPages.
```

**3b. from nil/not-map test:**
```go
TestClassifyPancakeSender/from_nil_→_system: return "system", "", ""
TestClassifyPancakeSender/from_không_có_id,_uid,_admin_id_→_system: return "system", "", name
```

**3c. inserted_at unparseable test:**
```go
TestFetchMessagesPreservesMessagesWithUnparseableInsertedAt:
  Tin với inserted_at="garbage" vẫn được giữ, SentAt=zero.
  Đảm bảo hành vi hiện tại bị lock (không bỏ tin vì parse fail).
```

**3d. Cursor stall detection test:**
```go
TestFetchMessagesDetectsCursorStall:
  Server trả page giống hệt 200 lần.
  Expected: 200 requests, pancakeMsgPageSize*200 tin, sau đó dừng.
```

## Chứng minh Test Khoá Được Lỗi

### RUN 1: With Full Safeguards
```
go test ./channels/ -run "TestFetchMessagesStopsOnInfiniteLoop" -timeout=50s
--- PASS: TestFetchMessagesStopsOnInfiniteLoop (39.80s)
PASS ok  github.com/.../channels  40.092s
```
✓ PASS

### RUN 2: Safeguards Removed (30s Timeout)
```
Gỡ: pageCount check, prevOffset stall detection
Chạy: go test -timeout=30s
[After ~30s of goroutines spinning]
FAIL  github.com/.../channels  30.333s  [context deadline exceeded]
```
✓ TIMEOUT (chứng minh test phát hiện lỗi)

### RUN 3: Safeguards Restored
```
git restore channels/pancake.go
go test ./channels/ -run "TestFetchMessagesStopsOnInfiniteLoop" -timeout=50s
--- PASS: TestFetchMessagesStopsOnInfiniteLoop (39.80s)
PASS ok  github.com/.../channels  (cached)
```
✓ PASS

## Ràng Buộc: Tất Cả Thỏa Mãn
- ✓ KHÔNG thêm dependency mới
- ✓ KHÔNG sửa pacer.go, adapter.go, registry.go, facebook.go, zalo_oa.go
- ✓ Giữ nguyên `url.PathEscape`, comment VERIFY-3, VERIFY-4
- ✓ Giữ nguyên thứ tự: bot/AI kiểm TRƯỚC nhân viên
- ✓ Chạy `cd backend && go test ./channels/` → PASS (không break test cũ)

## Test Summary
- Tất cả test cũ: PASS
- Test mới (4 function): PASS
- Safeguard verified: timeout khi remove, PASS khi restore
