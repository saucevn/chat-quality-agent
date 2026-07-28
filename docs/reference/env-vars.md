# Biến môi trường

Danh sách đầy đủ các biến môi trường trong file `.env`.

::: warning Sáu biến bị docker compose đặt cứng
Khi chạy bằng `docker compose`, các biến `APP_ENV`, `SERVER_HOST`, `SERVER_PORT`, `DB_HOST`, `DB_PORT` và `TZ` được đặt thẳng trong `docker-compose.yml` và **không đọc từ `.env`**. Sửa chúng trong `.env` sẽ không có tác dụng.

Lý do: trong container chúng chỉ có đúng một giá trị hợp lệ. Riêng `SERVER_HOST` mặc định của ứng dụng là `127.0.0.1` — để nguyên thì nginx không gọi vào được và mọi request đều 502.

Các giá trị mặc định ghi ở bảng dưới là mặc định của **ứng dụng** (khi chạy binary trực tiếp), không phải giá trị compose áp vào.
:::

## Bắt buộc

| Biến | Mô tả | Tạo giá trị |
|------|-------|-------|
| `DB_PASSWORD` | Mật khẩu MySQL cho user CQA | `openssl rand -base64 18` |
| `MYSQL_ROOT_PASSWORD` | Mật khẩu root MySQL | `openssl rand -base64 18` |
| `JWT_SECRET` | Secret cho JWT tokens, tối thiểu 32 ký tự | `openssl rand -hex 32` |
| `ENCRYPTION_KEY` | Khoá AES-256-GCM, **đúng 32 ký tự** | `openssl rand -base64 24` |

::: danger ENCRYPTION_KEY — sao lưu ra ngoài máy chủ ngay
Ứng dụng kiểm tra độ dài đúng 32 ký tự rồi dùng thẳng chuỗi đó làm khoá AES-256. Mọi credential kênh (token Pancake, secret Zalo/Facebook) được mã hoá bằng khoá này.

Mất khoá là **không giải mã lại được**, kể cả khi còn nguyên bản sao lưu database — phải nối lại toàn bộ kênh từ đầu. Cất vào trình quản lý mật khẩu, để riêng khỏi chỗ chứa bản dump.

`openssl rand -hex 16` cũng ra 32 ký tự và vẫn hợp lệ, nhưng chỉ được 128 bit entropy; `openssl rand -base64 24` cũng đúng 32 ký tự mà được 192 bit.
:::

## Server

| Biến | Mô tả | Mặc định |
|------|-------|----------|
| `SERVER_PORT` | Port của ứng dụng | `8080` |
| `SERVER_HOST` | Host bind | `127.0.0.1` |
| `APP_ENV` | Môi trường (`development` / `production`) | `development` |
| `APP_URL` | URL công khai (cho links trong notification) | _(trống)_ |

## Cổng trên máy chủ

Chỉ cần đặt khi cổng mặc định đã bị dịch vụ khác chiếm.

| Biến | Mô tả | Mặc định |
|------|-------|----------|
| `HTTP_PORT` | Cổng host cho nginx HTTP | `80` |
| `HTTPS_PORT` | Cổng host cho nginx HTTPS | `443` |
| `DB_PORT_HOST` | Cổng host cho MySQL, luôn chỉ bind vào `127.0.0.1` | `3306` |

Máy đã có reverse proxy sẵn thì đặt `HTTP_PORT`/`HTTPS_PORT` và **để trống `LEGO_DOMAIN`** để proxy đó lo TLS. Xem [Cài đặt](/guide/installation).

## Database

| Biến | Mô tả | Mặc định |
|------|-------|----------|
| `DB_HOST` | MySQL host | `localhost` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_USER` | MySQL username | `cqa` |
| `DB_PASSWORD` | MySQL password | _(trống — bắt buộc)_ |
| `DB_NAME` | Tên database | `cqa` |

## AI

| Biến | Mô tả | Mặc định |
|------|-------|----------|
| `AI_MAX_TOKENS` | Giới hạn token đầu ra mỗi lần gọi AI | `16384` |

## Rate Limiting

| Biến | Mô tả | Mặc định |
|------|-------|----------|
| `RATE_LIMIT_PER_IP` | Số request/phút cho mỗi IP | `500` |
| `RATE_LIMIT_PER_USER` | Số request/phút cho mỗi user | `1000` |

## SSL (tùy chọn)

| Biến | Mô tả | Mặc định |
|------|-------|----------|
| `LEGO_DOMAIN` | Domain cho SSL tự động (Let's Encrypt) | _(trống = HTTP mode)_ |
| `LEGO_EMAIL` | Email cho Let's Encrypt | _(trống)_ |

::: tip
Để trống `LEGO_DOMAIN` nếu bạn không cần SSL hoặc đã có reverse proxy riêng (Cloudflare, Caddy...).
:::

::: warning Trỏ DNS trước khi bật LEGO_DOMAIN
Container nginx chạy lego ở chế độ standalone **trước khi** nginx khởi động. DNS chưa trỏ về máy này thì lego thất bại, container thoát, và `restart: unless-stopped` đẩy nó vào vòng lặp crash. Let's Encrypt còn giới hạn 5 lần thất bại mỗi giờ mỗi domain.

Kiểm tra trước bằng `./scripts/vps-preflight.sh <domain>`.
:::

## Build

| Biến | Mô tả | Mặc định |
|------|-------|----------|
| `CQA_VERSION` | Nhãn phiên bản gắn vào image lúc build | `dev` |

## Tạo giá trị bảo mật

```bash
# Mật khẩu database
openssl rand -base64 18

# JWT secret (tối thiểu 32 ký tự)
openssl rand -hex 32

# Encryption key (đúng 32 ký tự)
openssl rand -base64 24
```
