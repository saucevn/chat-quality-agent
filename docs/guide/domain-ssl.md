# Tên miền & SSL

CQA hỗ trợ SSL tự động qua Let's Encrypt. Certificate được tạo và gia hạn hoàn toàn tự động.

## Trỏ tên miền

1. Đăng nhập vào nhà cung cấp domain (123HOST, GoDaddy, Cloudflare...)
2. Tạo bản ghi DNS:
   - **Loại**: A
   - **Tên**: `cqa` (hoặc tên bạn muốn, ví dụ `chat`)
   - **Giá trị**: IP VPS của bạn
   - **TTL**: 300 (hoặc Auto)

3. Chờ DNS cập nhật (thường 5-15 phút). Kiểm tra:

```bash
./scripts/vps-preflight.sh cqa.yourdomain.com
```

Script đối chiếu bản ghi A với IPv4 công khai của chính máy này — chắc chắn hơn `ping`, vốn có thể trả về IP của proxy.

::: warning Trỏ DNS xong rồi mới bật LEGO_DOMAIN
Container nginx chạy lego **trước khi** nginx khởi động. DNS chưa trỏ đúng thì lego thất bại, container thoát, và `restart: unless-stopped` đẩy nó vào vòng lặp crash. Let's Encrypt giới hạn 5 lần thất bại mỗi giờ mỗi domain — đừng thử lại liên tục.

Đang dùng Cloudflare thì để bản ghi ở **DNS only** (mây xám) khi lấy chứng chỉ lần đầu; bật proxy lại sau, với SSL/TLS mode **Full (strict)**. Đừng dùng Flexible — nó tạo vòng lặp chuyển hướng với khối redirect 80→443 của nginx.
:::

## Bật SSL

Mở file `.env` trên VPS:

```bash
nano ~/cqa/.env
```

Thêm hoặc sửa 2 dòng:

```env
LEGO_DOMAIN=cqa.yourdomain.com
LEGO_EMAIL=admin@yourdomain.com
```

Khởi động lại:

```bash
cd ~/cqa
docker compose up -d
```

CQA sẽ tự động:
- Tạo SSL certificate từ Let's Encrypt
- Chuyển hướng HTTP → HTTPS
- Kiểm tra và gia hạn certificate mỗi 7 ngày

Truy cập: `https://cqa.yourdomain.com`

## Chạy không cần SSL (HTTP only)

Nếu không cần SSL (ví dụ test local, mạng nội bộ, hoặc đã có reverse proxy riêng lo TLS), **không cần** điền `LEGO_DOMAIN`. CQA sẽ tự chạy ở chế độ HTTP trên cổng `HTTP_PORT` — mặc định 80.

## Kiểm tra SSL

```bash
docker compose logs nginx --tail=20
```

Bạn sẽ thấy:

```
Certificate obtained for cqa.yourdomain.com
Starting nginx with SSL...
```

Hoặc kiểm tra trên trình duyệt — bấm vào icon khóa bên cạnh URL để xem thông tin certificate.

## Xử lý lỗi SSL

| Lỗi | Nguyên nhân | Cách sửa |
|-----|-------------|----------|
| `Could not obtain certificate` | DNS chưa trỏ đúng | Chạy `./scripts/vps-preflight.sh <domain>` để đối chiếu bản ghi A với IP máy |
| `Too many requests` | Đã chạm giới hạn của Let's Encrypt | Chờ hết cửa sổ giới hạn; đừng thử lại liên tục |
| `Port 80 already in use` | Máy đã có reverse proxy khác | Đừng dừng nó — đặt `HTTP_PORT`/`HTTPS_PORT` trong `.env`, để trống `LEGO_DOMAIN` và cho proxy sẵn có lo TLS |

## Bước tiếp theo

- [Thiết lập ban đầu](/guide/initial-setup) — Tạo admin, cấu hình AI
