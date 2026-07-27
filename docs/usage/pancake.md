# Kết nối Pancake

[Pancake](https://pancake.vn) là nền tảng quản lý tin nhắn đa kênh — gộp inbox của nhiều nền tảng (Facebook, Instagram, TikTok, Zalo, Shopee, WhatsApp, Telegram và nhiều nền tảng khác) vào một nơi quản lý duy nhất.

Nếu bạn đang dùng Pancake, kết nối CQA qua Pancake là cách đơn giản nhất để lấy tin nhắn: chỉ cần nhập **Page ID** và **Page Access Token** lấy từ Pancake, không phải tự tạo App Developer, xin quyền, hay xác thực OAuth riêng cho từng nền tảng như khi kết nối trực tiếp [Zalo OA](/usage/channels#zalo-oa) hay [Facebook](/usage/facebook). Cùng một cách kết nối này áp dụng cho khoảng 20 nền tảng mà Pancake hỗ trợ — mỗi page/kênh trên Pancake kết nối với CQA bằng đúng 2 thông tin đó.

## Điều kiện

- Bạn đã có tài khoản Pancake, đăng nhập được vào [pancake.vn](https://pancake.vn) (hay pages.fm).
- Page/kênh cần lấy tin nhắn (Facebook, Zalo, Shopee...) đã được kết nối và hoạt động trên Pancake. CQA lấy dữ liệu qua Pancake, không tự kết nối trực tiếp tới nền tảng gốc.

## Bước 1: Lấy Page Access Token

Trong Pancake, vào **Cài đặt** → **Công cụ** → **Page Access Token**. Tìm page cần kết nối trong danh sách, sao chép **Page Access Token** tương ứng.

## Bước 2: Lấy Page ID

Page ID là mã Pancake gán cho page. **Định dạng khác nhau tuỳ nền tảng** — Facebook là chuỗi số thuần, các nền tảng khác có tiền tố:

| Nền tảng | Ví dụ Page ID |
|---|---|
| Facebook | `151780661361876` |
| Zalo | `zl_3373773340310816362` |
| Shopee | `spo_950683608` |
| TikTok | `tt_6711731671916708866` |

Có thể lấy bằng một trong hai cách:

- **Trong payload của Page Access Token** vừa lấy ở Bước 1 — Page ID được mã hoá sẵn trong token.
- **Gọi API `GET /pages`** của Pancake: `https://pages.fm/api/v1/pages?access_token=...` — kết quả trả về danh sách page bạn quản lý, mỗi page có trường `id` dạng số, đó chính là Page ID.

::: danger Đừng nhầm Page ID với slug trên URL
Trang quản lý page trong Pancake thường hiển thị một **slug** dạng chữ trên URL (ví dụ `nhabepduide`) — đây **không phải** Page ID.

Nếu bạn dán nhầm slug này vào ô Page ID khi kết nối CQA, Pancake sẽ trả về lỗi:

> `Invalid access_token`

Thông báo này dễ khiến bạn tưởng **Page Access Token bị sai hoặc hỏng** — nhưng thực chất token vẫn đúng, chỉ là **Page ID sai**.

Cách phân biệt chắc chắn nhất: slug là **tên shop/trang dễ đọc** (`nhabepduide`, `spo_ThchCayVitNam1785`), còn Page ID là **mã máy sinh** — hoặc toàn số, hoặc tiền tố nền tảng cộng chuỗi số (`spo_950683608`). Nếu chuỗi bạn đang cầm đọc lên nghe như tên cửa hàng thì đó là slug.
:::

## Bước 3: Tạo kênh trong CQA

Trong CQA, vào **Kênh chat** → **Kết nối kênh mới** → chọn **Pancake**:
- **Page ID**: số đã lấy ở Bước 2
- **Page Access Token**: token đã lấy ở Bước 1

## Kiểm tra kết nối

Sau khi nhập Page ID và Token, CQA tự động kiểm tra kết nối. Nếu thành công, kênh chuyển sang trạng thái **"Hoạt động"**.

::: info Không có nút "Kết nối lại"
Page Access Token của Pancake **không hết hạn** — khác Zalo OA (phải xác thực lại định kỳ) hay Facebook (token có hạn). Vì vậy kênh Pancake không có nút **Xác thực lại / Kết nối lại**. Nếu kết nối báo lỗi, nguyên nhân thường là Page ID hoặc Token nhập sai — kiểm tra lại theo cảnh báo ở Bước 2.
:::

## Nền tảng nào dùng được

CQA lấy tin nhắn qua Pancake bằng cách đọc **hội thoại inbox**. Bình luận (comment) và đánh giá (review) chưa được hỗ trợ, nên nền tảng chỉ có bình luận hoặc chỉ có đánh giá — không có inbox — thì chưa dùng được qua CQA:

| Nền tảng | Dùng được qua CQA? | Lý do |
|---|---|---|
| Facebook, Instagram, TikTok (Business Messaging/Shop/Livestream), Zalo OA, Zalo cá nhân, Shopee, Lazada, Tokopedia, WhatsApp, Line, Telegram, Airbnb, Booking.com, Mercado Libre, chat plugin website | ✅ Dùng được | Có hội thoại inbox |
| YouTube, Threads | ❌ Chưa dùng được | Chỉ có bình luận, không có inbox |
| Google Business Profile | ❌ Chưa dùng được | Chỉ có đánh giá, không có inbox |

## Lịch sử tin nhắn kéo về được

Khi đồng bộ lần đầu, lượng tin nhắn cũ kéo về được **khác nhau theo từng nền tảng** — do giới hạn từ chính nền tảng gốc, không phải do CQA:

| Nền tảng | Lịch sử kéo về được |
|---|---|
| WhatsApp (Co-existence) | 6 tháng |
| Facebook, Threads | 14 ngày |
| Shopee | 2 tuần |
| TikTok (Business Messaging) | 100 hội thoại gần nhất |
| Line | Không kéo được tin cũ |

Với các nền tảng không có trong bảng trên, hãy đồng bộ thử và đối chiếu thực tế.

## Tin nhắn tự động không được tính điểm

Tin do chatbot, phần mềm tự động, hoặc AI gửi được CQA đánh dấu là **tin hệ thống** — vẫn lưu lại để giữ ngữ cảnh hội thoại, nhưng **không tính vào điểm chất lượng của nhân viên**.

Có 2 trường hợp CQA **không tách được** là tin tự động, do giới hạn từ chính Pancake — nên biết trước để không hiểu nhầm kết quả chấm điểm:
- Bot của bên thứ ba (không phải Pancake) không khai báo cờ tự động khi gửi tin.
- Tin auto-reply do chính Page cấu hình gửi tự động.

Vì CQA không phát hiện được hai trường hợp này, tin có thể bị chấm điểm như tin do nhân viên viết.

## Riêng Shopee

**Số hội thoại trong CQA sẽ ít hơn trong Pancake.** Shopee trả về cả hội thoại
đánh giá (`RATING`) lẫn chat inbox. CQA chỉ lấy inbox, nên nếu Pancake hiển thị
60 hội thoại mà CQA chỉ đồng bộ 13 thì đó là đúng, không phải mất dữ liệu.

**Không phân biệt được tin tự động.** Shopee không cho biết tin nào do hệ thống
hoặc chương trình gửi. Hệ quả: tin phát thông báo hàng loạt (kiểu *"THÔNG BÁO
LỊCH HOẠT ĐỘNG TẾT"*) và sự kiện hệ thống (*"… đã tham gia cuộc trò chuyện"*)
đều bị tính là tin của nhân viên khi chấm điểm. Nếu shop dùng nhiều tin phát
hàng loạt, hãy tính đến điều này khi đọc kết quả đánh giá.

**Không chấm điểm theo từng nhân viên được** — giống Zalo, Shopee chỉ trả về id
của gian hàng chứ không cho biết nhân viên nào trả lời.

## Zalo qua Pancake không chấm theo từng nhân viên

Với các nền tảng khác, CQA biết chính xác nhân viên nào gửi từng tin nhắn. Riêng **Zalo** kết nối qua Pancake thì không — Zalo chỉ trả về ID tài khoản OA dùng chung cho cả page, không cho biết nhân viên nào thực sự gõ tin. Vì vậy chấm điểm theo từng nhân viên **không áp dụng được** cho kênh Zalo kết nối qua Pancake.
