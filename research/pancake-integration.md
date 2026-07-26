# Nghiên cứu tích hợp Pancake làm kênh chat đa nền tảng

Ngày: 2026-07-26 · Trạng thái: nghiên cứu xong, chưa thiết kế triển khai

Tài liệu nội bộ. Đặt ngoài `docs/` có chủ đích — workflow `docs.yml` chỉ build từ
`docs/` nên thư mục này không bị publish lên GitHub Pages.

## Nguồn

Trang `developer.pancake.biz` là SPA (Stoplight Elements), HTML gốc trỏ tới hai
file OpenAPI thật — đây là nguồn có thẩm quyền, không phải suy đoán:

- <https://developer.pancake.biz/openapi/openapi.yaml> — API Reference (4.162 dòng)
- <https://developer.pancake.biz/openapi/webhook.yaml> — Webhooks (1.011 dòng)

Bổ sung: user manual Pancake (`pancake_all_pages.docx`, 4.047 dòng) cho phần mô
hình nghiệp vụ mà spec API không nói.

## 1. Vì sao đáng tích hợp

Một adapter Pancake phủ khoảng 20 nền tảng qua cùng một API `/pages/{page_id}/...`:
Facebook, Instagram, TikTok (Business Messaging + Shop + Livestream), Zalo OA,
Zalo cá nhân, Shopee, Lazada, Tokopedia, WhatsApp, Line, Telegram, Threads,
YouTube, Google Business Profile, Airbnb, Booking.com, Mercado Libre, chat plugin.

So với việc viết từng adapter riêng, đây là chênh lệch một bậc về công sức.

## 2. Nhưng "đa kênh" không đồng nhất

`page` của Pancake là *một tài sản hội thoại trên một nền tảng*, không phải lúc
nào cũng là kênh chat:

| Nền tảng | Inbox | Comment | Review |
|---|:-:|:-:|:-:|
| Facebook, Instagram, Zalo, Shopee, TikTok, WhatsApp, Line, Telegram | ✅ | một số | một số |
| YouTube, Threads | ❌ | ✅ | — |
| Google Business Profile | ❌ | ❌ | ✅ |

Pancake phân hội thoại thành **3 loại**: tin nhắn (inbox), bình luận (comment),
đánh giá (review). Chấm chất lượng CSKH trên comment livestream hay review Google
Maps là bài toán khác hẳn tư vấn inbox — không dùng chung rubric được.

**Quyết định đã chốt: v1 chỉ lấy `type=INBOX`.**

## 3. API — dữ kiện cốt lõi

### Base URL và xác thực

Ba base URL, chọn theo từng endpoint (không ghép tuỳ tiện):

| Base URL | Dùng cho | Token |
|---|---|---|
| `https://pages.fm/api/v1` | list pages, generate token | `access_token` |
| `https://pages.fm/api/public_api/v1` | messages, tags, assign, users | `page_access_token` |
| `https://pages.fm/api/public_api/v2` | list conversations | `page_access_token` |

Token truyền qua **query param**, không có header `Authorization`.

| Token | Vòng đời |
|---|---|
| `access_token` (user) | tối đa 90 ngày, không có refresh flow — lấy lại thủ công từ UI |
| `page_access_token` (page) | **không hết hạn** trừ khi regenerate |

Hệ quả: adapter Pancake **không cần** máy móc refresh token như
[zalo_oa.go](../backend/channels/zalo_oa.go). Credentials chỉ là
`{page_id, page_access_token}`.

### Hai endpoint chính

```
GET /api/public_api/v2/pages/{page_id}/conversations
    ?page_access_token=&last_conversation_id=&type=&tags=&since=&until=&order_by=

GET /api/public_api/v1/pages/{page_id}/conversations/{conversation_id}/messages
    ?page_access_token=&current_count=
```

### Phân trang — hai cơ chế khác nhau

| | Page size | Cách lật trang | Biết hết chưa |
|---|---|---|---|
| conversations | 60 (cố định) | `last_conversation_id` = id phần tử cuối trang trước | **không có field báo hết** — dừng khi trả < 60 |
| messages | 30 (cố định) | `current_count` = index, trả 30 tin *trước* index đó | dừng khi trả < 30, hoặc dùng `Conversation.message_count` |

Messages sắp xếp **mới nhất → cũ nhất**.

### Đồng bộ incremental

- Cấp conversation: có `since`/`until` (Unix **giây**) và `order_by=updated_at`.
- Cấp message: **không có bộ lọc thời gian nào**. Phải phân trang lùi tới khi
  chạm watermark — hợp với `upsertMessage` dedup theo external ID sẵn có
  ([sync.go](../backend/engine/sync.go)).

⚠️ Spec **không nói rõ** `since`/`until` lọc theo `inserted_at` hay `updated_at`.
Phải test thực tế.

## 4. Ba cái bẫy kỹ thuật

**1. Lỗi trả HTTP 200, không phải 4xx.** Đã verify thật:

```
GET /api/v1/pages?access_token=invalid
→ HTTP 200
{"success":false,"error_code":102,"message":"Invalid access_token"}
```

Adapter **phải kiểm tra `body.success`**, khác hẳn pattern của
`facebook.go`/`zalo_oa.go` hiện tại. Mã lỗi quan sát được: `101` (thiếu token),
`102` (token sai). Danh sách đầy đủ không được công bố. Mọi response có
`x-request-id` — nên log để support trace.

**2. Rate limit 5 req/giây/page**, vượt → `429`. **Không có header quota** —
đã probe 16 request liên tiếp, response chỉ có `x-request-id`, không có
`X-RateLimit-*` hay `Retry-After`. Phải tự implement token bucket phía client.
Sync engine hiện chưa có throttle nào.

**3. Timestamp không có timezone suffix** (`2024-12-25T11:06:07.000000`).
Webhook ghi UTC, REST không nói rõ. Mỗi page lại có múi giờ riêng ảnh hưởng báo
cáo. Rủi ro lệch giờ — phải verify.

## 5. Chất lượng dữ liệu — phần quan trọng nhất

### Tin bot lẫn vào, chỉ tách được một phần

| Nguồn | Tách được? | Cách |
|---|---|---|
| Automation / POS | ✅ | `from.is_automated` |
| AI sinh tin | ✅ | `from.ai_generated` |
| Botcake | ⚠️ một phần | prefix `[Botcake Reply]` trong **nội dung** — là **tuỳ chọn UI phải bật thủ công per-page**, không phải field |
| Trợ lý AI Pancake gợi ý | ❌ | nhân viên bấm Tab chọn rồi Enter → tin đi dưới danh nghĩa nhân viên, không dấu vết |
| Mẫu trả lời nhanh | ❌ | sau khi render biến `#{FULL_NAME}` trông y hệt tin viết tay |
| Chữ ký page tự chèn | ❌ | tối đa 150 ký tự nối vào cuối mọi tin |

**Quyết định đã chốt:** map tin bot sang `sender_type = "system"` (model đã hỗ trợ
giá trị này), vẫn lưu để giữ ngữ cảnh hội thoại nhưng không tính vào điểm nhân viên.

### `assignee` ≠ người thật sự trả lời

Tuỳ chế độ xoay vòng, hội thoại có thể được gán cho người chưa nhắn gì. Manual
cảnh báo trực tiếp: *"Kết quả của việc lọc theo người được phân công này sẽ có
thể bị ảnh hưởng bởi chế độ phân công xoay vòng"*.

→ Attribute theo `from.uid` của **từng message**. Dùng `assignee_ids` riêng cho
metric "bỏ rơi hội thoại".

### Tin nhắn bị mất có hệ thống

- Nhân viên trả lời **ngoài** Pancake không được ghi nhận. Với LineOA, tin thậm
  chí không hiển thị.
- Heuristic phát hiện ZNS của Zalo *"đôi khi nhận nhầm tin thường thành ZNS"* →
  OA lớn hoặc có chatbot sẽ mất tin.
- TikTok: tin từ khách EEA/Thuỵ Sĩ/UK không hiển thị.
- Meta "Định tuyến trò chuyện": chỉ 1 app được trả lời tại 1 thời điểm.
- Kênh thoại (Messenger call, Zalo ZCC…) không có transcript.

### Backfill lịch sử chênh lệch lớn

| Nền tảng | Kéo được tin cũ |
|---|---|
| WhatsApp Co-existence | 6 tháng |
| Facebook, Threads | 14 ngày |
| Shopee | 2 tuần |
| TikTok Business Messaging | 100 hội thoại gần nhất |
| **Line** | **0 — không hỗ trợ** |

→ "Chấm hồi cứu toàn bộ lịch sử" không khả thi đồng đều. Phải nêu rõ theo kênh.

### Tag dùng làm nhãn AI được không?

Được, nhưng **chỉ như weak label, phải map thủ công theo từng tenant**. Taxonomy
tự do, thực tế trộn nhiều chiều ngữ nghĩa ("Đã xử lý", "Khách VIP", "Đã chốt").
Bốn cảnh báo:

- Bulk tag **không vào thống kê**.
- Timestamp thẻ ghi theo **ngày thao tác**, không theo thời gian hội thoại → không
  join theo ngày được.
- Lịch sử gắn thẻ/phân công chỉ giữ **100 bản ghi gần nhất**.
- Đồng bộ thẻ giữa page gộp theo **tên**, thẻ cũ *"bị xóa vĩnh viễn"* → tag ID
  không ổn định theo thời gian.

## 6. Định vị sản phẩm

Pancake **đã có**: thời gian phản hồi, tỷ lệ phản hồi theo nhân viên, CSAT 1–5
sao, sentiment realtime (`extra_info.sentiment_analysis`), gợi ý câu trả lời.

Pancake **không có** — đây là chỗ CQA bổ sung:

1. Chấm **nội dung** theo rubric (tư vấn đúng chưa, có xin thông tin không, có xử
   lý phản đối không, có vi phạm script không). Pancake đo *bao nhiêu* và *nhanh
   thế nào*, không đo *tốt thế nào*.
2. Chấm **hồi cứu 100% hội thoại** — CSAT phụ thuộc khách chủ động bấm sao, và
   Pancake tự thừa nhận attribution hỏng khi *"khách tự gửi đánh giá, hoặc chưa
   ai trả lời tin nhắn"*.
3. Báo cáo **cross-page / cross-channel** về chất lượng một nhân viên.

Không có chồng lấn nghiêm trọng. Nên tránh làm lại: sentiment realtime, gợi ý câu
trả lời, CSAT sao, thời gian phản hồi trung bình.

## 7. Cơ hội: ghi ngược kết quả về Pancake

Pancake có API ghi:

| Việc | Endpoint |
|---|---|
| Gắn/gỡ tag | `POST .../conversations/{id}/tags` với `{"action":"add","tag_id":"..."}` |
| Phân công | `POST .../conversations/{id}/assign` |
| Đánh dấu đã đọc | `POST .../conversations/{id}/read` |

→ CQA có thể gắn tag "QC không đạt" **ngay trong màn hình nhân viên đang dùng**,
thay vì để kết quả nằm riêng ở dashboard. Hiện `Job.outputs` mới chỉ có
Telegram/Email. Đây là hướng sản phẩm đáng cân nhắc cho v2.

## 8. Webhook — v1 không dùng

Có 5 event (`messaging`, `conversation`, `post`, `subscription`, `connect_status`)
nhưng ràng buộc vận hành nặng:

- Bật phải **liên hệ support Pancake**, không self-service.
- **Không có chữ ký/HMAC/secret** — phải tự bảo vệ endpoint.
- **Tự treo** nếu trong 30 phút error rate > 80% *và* ≥ 300 request lỗi. Bật lại
  thủ công và **không replay event đã miss**.
- Duplicate delivery được xác nhận → cần idempotent theo `request_id`, và với
  event `conversation` so sánh field `version` (tăng đơn điệu).
- Tốn slot subscription — docs mâu thuẫn (1 slot vs 2 slot), cần hỏi support.

**Kết luận: v1 dùng polling.** Kể cả sau này bật webhook vẫn phải giữ polling đối
soát vì cơ chế không replay.

## 9. Việc cần làm để tích hợp

Dựa trên bản đồ adapter hiện có ([adapter.go](../backend/channels/adapter.go),
[registry.go](../backend/channels/registry.go)):

**Bắt buộc — backend**
1. Tạo `backend/channels/pancake.go`: `PancakeCredentials{PageID, PageAccessToken}`
   + implement 3 method `FetchRecentConversations` / `FetchMessages` / `HealthCheck`.
2. Thêm `case "pancake"` vào `registry.go`.
3. Sửa validation `binding:"required,oneof=zalo_oa facebook"` trong
   `api/handlers/channels.go` → thêm `pancake`.
4. Token bucket 5 req/s/page.
5. Kiểm tra `body.success` thay vì HTTP status.

**Thay đổi chạm vào code cũ**
6. Thêm field danh tính người gửi vào `SyncedMessage` — hiện struct này không có,
   nên `Message.SenderExternalID` trong DB **không bao giờ được set**. Không có
   nó thì không chấm điểm theo từng nhân viên được. Chạm cả 2 adapter cũ.

**Frontend — 7 file, không có điểm tập trung**

Không có constant/enum dùng chung; mỗi file hard-code riêng danh sách channel
type: `views/Channels.vue`, `views/Channels/ChannelDetail.vue`, `views/Dashboard.vue`,
`views/Messages.vue` (2 chỗ riêng biệt), `components/JobWizard/StepInput.vue`,
`i18n/vi.ts`, `i18n/en.ts`.

**Không cần đụng**: `pkg/crypto.go` (mã hoá dùng chung), `engine/sync.go` (gọi qua
interface chung, trừ khi cần callback đặc thù — Pancake không cần vì token không
hết hạn).

## 10. Cần verify bằng token thật

Những điểm spec không nói rõ hoặc mâu thuẫn:

| # | Vấn đề |
|---|---|
| 1 | `since`/`until` lọc theo `inserted_at` hay `updated_at`? |
| 2 | Enum `type`: schema ghi `LIVESTREAM`, mô tả param ghi `COMMENT_LIVESTREAM`/`POST` — mâu thuẫn |
| 3 | Timezone thật của `inserted_at`/`updated_at` |
| 4 | Attachment type cho audio/voice và file/document — không có trong enum (`photo`, `video`, `sticker`, `template`, `system_message`) |
| 5 | Giá trị thật của `Page.platform` — spec khai `type: string`, không có enum/example |
| 6 | Retention dữ liệu thô (chỉ biết thống kê UI giới hạn 180 ngày) |
| 7 | Bật webhook tốn 1 hay 2 slot |

## 11. Quyết định đã chốt

| Vấn đề | Quyết định |
|---|---|
| Phạm vi loại hội thoại | **Chỉ `type=INBOX`** cho v1 |
| Tin bot/automation | Map sang **`sender_type = "system"`**, vẫn lưu để giữ ngữ cảnh, không tính điểm nhân viên |
| Cơ chế sync | **Polling**, không dùng webhook ở v1 |
