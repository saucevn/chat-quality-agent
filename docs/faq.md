# FAQ & Xử lý lỗi

## Câu hỏi thường gặp

### CQA hỗ trợ những kênh chat nào?

Hỗ trợ **Zalo OA**, **Facebook Messenger**, và **Pancake** (nền tảng gộp nhiều kênh: Instagram, TikTok, WhatsApp, Line, Telegram, Shopee, Lazada, Tokopedia, và nhiều kênh khác).

Lưu ý: qua Pancake hiện chỉ đồng bộ **hội thoại inbox**. Những kênh chỉ có bình luận (YouTube, Threads) hoặc chỉ có đánh giá (Google Business Profile) chưa dùng được.

### Nên dùng Claude hay Gemini?

| Tiêu chí | Claude | Gemini |
|----------|--------|--------|
| Chất lượng tiếng Việt | Tốt hơn | Khá |
| Chi phí | Cao hơn | Rẻ hơn nhiều |
| Tốc độ | Nhanh | Nhanh hơn |
| Khuyến nghị QC | Sonnet 4.6 | Pro 2.5 |
| Khuyến nghị Phân loại | Haiku 4.5 | Flash 2.0 |

**Kết luận**: Claude cho đánh giá QC chính xác hơn. Gemini cho phân loại đơn giản và tiết kiệm.

### Batch mode là gì? Có nên bật không?

Batch mode gom nhiều cuộc chat vào 1 lần gọi AI, tiết kiệm 60-80% chi phí token. **Nên bật** với batch size 5-10. Xem chi tiết tại [Cấu hình AI](/usage/ai-settings).

### Tại sao Zalo OA chỉ lấy được tin nhắn 48 giờ?

Do giới hạn API của Zalo. Zalo chỉ cho phép ứng dụng bên thứ 3 đọc tin nhắn trong cửa sổ 48 giờ gần nhất. Tin nhắn cũ hơn không truy cập được.

**Giải pháp**: Đặt lịch đồng bộ thường xuyên (15-30 phút/lần) để không bỏ sót tin nhắn.

### CQA cần bao nhiêu tài nguyên?

Lúc chạy ổn định (giới hạn đặt trong `docker-compose.yml`):

- **App**: 512MB
- **MySQL**: 768MB
- **Nginx**: 128MB
- **Disk**: Tùy số lượng tin nhắn, thường dưới 5GB cho 100K cuộc chat

Nhưng **lúc build cần nhiều hơn lúc chạy**: bước build frontend là chỗ ngốn RAM nhất. Máy 1GB không swap gần như chắc chắn bị OOM-kill giữa chừng. Nên có 2GB RAM, hoặc 1GB + 2GB swap. Đĩa nên còn tối thiểu 10GB vì build cache Docker ăn khá nhiều.

Chạy `./scripts/vps-preflight.sh` để script tự đo và báo.

### Có cần tên miền không?

Không bắt buộc. CQA chạy được với IP trực tiếp (http://IP-VPS). Tên miền + SSL chỉ cần khi muốn HTTPS hoặc dùng MCP với Claude Web.

### Kết nối qua Pancake khác gì kết nối Facebook/Zalo trực tiếp?

**Pancake là một hub gộp nhiều kênh**, bạn không cần tạo từng kết nối riêng cho mỗi nền tảng. Ưu điểm:
- **1 token Pancake** cho 20+ nền tảng (Facebook, Instagram, TikTok, WhatsApp, Shopee...)
- **Giao diện quản lý tập trung** tại Pancake, sau đó CQA kéo dữ liệu
- **Không cần OAuth lặp lại** khi muốn thêm kênh mới

Nhược điểm: lịch sử tin nhắn phụ thuộc vào lịch sử lưu trữ của Pancake và nền tảng thứ ba (WhatsApp 6 tháng, Facebook 14 ngày, Line không kéo được tin cũ...).

### Vì sao nhập token Pancake lại báo "Invalid access_token"?

Nguyên nhân phổ biến: nhập **slug / tên shop** thay vì **Page ID**. Token vẫn đúng, chỉ Page ID sai — nhưng Pancake báo lỗi như thể token hỏng.

| Nhập sai (slug) | Nhập đúng (Page ID) | Nền tảng |
|---|---|---|
| `nhabepduide` | `151780661361876` | Facebook |
| `spo_ThchCayVitNam1785` | `spo_950683608` | Shopee |

Lưu ý Page ID **không phải lúc nào cũng toàn số** — Shopee, Zalo, TikTok có tiền tố nền tảng (`spo_`, `zl_`, `tt_`). Dấu hiệu nhận biết: slug đọc lên nghe như tên cửa hàng, Page ID là mã máy sinh.

**Cách tìm Page ID**:
- Tại Pancake, vào Cài đặt > Công cụ > Page Access Token — payload token chứa sẵn Page ID
- Hoặc gọi API `GET https://pages.fm/api/v1/pages?access_token=<token>` để lấy danh sách Page ID

### Chi phí AI ước tính bao nhiêu?

Ví dụ đánh giá 100 cuộc chat/ngày:
- Claude Sonnet + Batch 5: ~$0.80/ngày (~600K VND/tháng)
- Claude Haiku + Batch 10: ~$0.15/ngày (~120K VND/tháng)
- Gemini Flash + Batch 10: ~$0.03/ngày (~24K VND/tháng)

### Dữ liệu có an toàn không?

- Mật khẩu được hash (bcrypt)
- API key và credential kênh chat được mã hóa AES-256
- JWT token với refresh token rotation
- Khóa tài khoản sau 5 lần đăng nhập sai (15 phút)
- HTTPS (nếu bật SSL)

---

## Xử lý lỗi

### Không truy cập được CQA sau cài đặt

```bash
# Kiểm tra container
docker compose ps

# Xem log
docker compose logs --tail=20
```

**Nguyên nhân phổ biến:**

- **Container chưa lên hẳn** → nginx chờ app `healthy`, app chờ db `healthy`. Lần `up` đầu tiên mất khoảng 70 giây trước khi nginx nhận request. Chờ rồi kiểm tra lại.
- **Cổng bị dịch vụ khác chiếm** → `docker compose ps` không thấy nginx bind được cổng. Đặt `HTTP_PORT`/`HTTPS_PORT` trong `.env`.
- **Firewall chặn** → `ufw allow 80`. Lưu ý: nếu container publish ra `0.0.0.0` thì ufw *không* chặn được nó — Docker chèn luật iptables trước chuỗi của ufw. Nghĩa là ufw thường không phải thủ phạm.
- **Build hỏng giữa chừng** → `docker compose logs app`. Thấy tiến trình bị giết lúc build frontend thì là hết RAM, xem mục tài nguyên ở trên.

### Build thất bại vì hết bộ nhớ

Bước build frontend bị OOM-kill là lỗi hay gặp nhất trên VPS nhỏ. Thêm swap rồi build lại:

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
docker compose up -d --build
```

Muốn giữ swap sau khi khởi động lại máy thì thêm dòng tương ứng vào `/etc/fstab`.

### Kênh Zalo báo lỗi xác thực

Token Zalo hết hạn (90 ngày). Bấm **Xác thực lại** trên trang kênh chat.

### Kênh Facebook không đồng bộ được

- Kiểm tra Page Access Token còn hiệu lực
- Kiểm tra Page ID đúng
- Đảm bảo token có quyền `pages_messaging`

### AI trả kết quả không chính xác

1. **Kiểm tra quy tắc** — Quy tắc quá chung chung sẽ cho kết quả không rõ ràng. Viết càng chi tiết càng tốt.
2. **Giảm batch size** — Batch size lớn giảm độ chính xác. Thử giảm về 3-5.
3. **Đổi model** — Dùng model mạnh hơn (Claude Sonnet thay Haiku, Gemini Pro thay Flash).
4. **Chạy thử** — Dùng nút "Chạy thử" để test trên 3 cuộc chat trước khi chạy thật.

### Thông báo Telegram không gửi được

- Bot Token đúng chưa? Test bằng: `https://api.telegram.org/bot<TOKEN>/getMe`
- Bot đã được thêm vào group chưa?
- Group ID đúng chưa? (phải là số âm)
- Bot có quyền gửi tin nhắn trong group không?

### Thông báo Email không gửi được

- SMTP host và port đúng chưa?
- Username/password SMTP đúng chưa?
- Với Gmail: Đã dùng App Password chưa? (không dùng mật khẩu Gmail thường)
- Port 587 (TLS) hay 465 (SSL) — thử cả 2

### SSL không hoạt động

```bash
docker compose logs nginx --tail=20
```

**Nguyên nhân phổ biến:**
- DNS chưa trỏ đúng IP → `./scripts/vps-preflight.sh cqa.yourdomain.com`
- Cổng 80 không tới được từ Internet (Let's Encrypt cần nó để xác minh) → kiểm tra firewall của nhà cung cấp VPS, không chỉ ufw
- Đang bật proxy Cloudflare (mây cam) → tắt về **DNS only** để lấy chứng chỉ lần đầu
- Đã chạm giới hạn thất bại của Let's Encrypt (5 lần/giờ/domain) → chờ hết cửa sổ rồi thử lại

### Quên mật khẩu admin

Nếu là admin duy nhất và quên mật khẩu, cần reset trực tiếp trong database:

```bash
cd ~/cqa
docker compose exec db mysql -u root -p$MYSQL_ROOT_PASSWORD cqa

# Trong MySQL:
UPDATE users SET password_hash = '$2a$10$...' WHERE email = 'admin@example.com';
```

Tốt hơn: Thêm admin mới qua API hoặc liên hệ người có quyền Owner để reset.
