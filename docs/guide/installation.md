# Cài đặt

## Yêu cầu hệ thống

| | Tối thiểu | Khuyến nghị (10-50 kênh) |
|---|---|---|
| CPU | 1 vCPU | 2 vCPU |
| RAM | 2 GB (hoặc 1 GB + 2 GB swap) | 2 GB |
| Ổ cứng | 10 GB | 20 GB |
| OS | Ubuntu 20.04+ / Debian 11+ / AlmaLinux 8+ | Ubuntu 22.04 LTS |

::: warning RAM lúc build cao hơn lúc chạy
CQA build image ngay trên máy chạy. Bước nặng nhất là build frontend (`vue-tsc -b && vite build`) — máy chỉ có 1 GB RAM và không có swap thì gần như chắc chắn bị OOM-kill giữa chừng.

Lúc chạy ổn định thì nhẹ hơn: giới hạn bộ nhớ trong compose là 768 MB (MySQL) + 512 MB (app) + 128 MB (nginx).
:::

Yêu cầu: **Docker** và **Docker Compose plugin v2**. Lệnh `docker-compose` bản v1 không chạy được file compose này.

Hỗ trợ macOS và Windows (qua [Docker Desktop](https://www.docker.com/products/docker-desktop/)) nếu muốn chạy trên máy cá nhân.

## Kiểm tra máy chủ trước khi cài

Repo có sẵn script kiểm tra, **chỉ đọc, không sửa gì** trên máy:

```bash
./scripts/vps-preflight.sh cqa.example.com
```

Script kiểm Docker, RAM/đĩa, cổng 80/443/3306, container trùng tên, và đối chiếu bản ghi A của domain với IPv4 công khai của máy. Có mục `FAIL` thì xử lý xong hãy cài. Xem chi tiết ở [Vận hành](/guide/operations).

## Cài đặt

CQA build image ngay trên máy chạy, không phụ thuộc Docker Hub.

```bash
git clone https://github.com/saucevn/chat-quality-agent.git ~/cqa
cd ~/cqa
cp .env.example .env
```

Mở file `.env`, điền các giá trị bắt buộc:

```bash
# Tạo secrets ngẫu nhiên
openssl rand -base64 18   # DB_PASSWORD
openssl rand -base64 18   # MYSQL_ROOT_PASSWORD
openssl rand -hex 32      # JWT_SECRET
openssl rand -base64 24   # ENCRYPTION_KEY — ra đúng 32 ký tự
```

::: danger ENCRYPTION_KEY phải đúng 32 ký tự, và phải sao lưu ra ngoài máy chủ
Mọi credential kênh (token Pancake, secret Zalo/Facebook) được mã hoá AES-256-GCM bằng khoá này. Mất khoá là **không giải mã lại được**, phải nối lại toàn bộ kênh từ đầu — kể cả khi vẫn còn bản sao lưu database.

Cất khoá vào trình quản lý mật khẩu ngay sau khi tạo, đừng chỉ để trên máy chủ.
:::

Chạy:

```bash
docker compose up -d --build
```

Lần đầu build mất vài phút. Truy cập:

- Nếu trên VPS: `http://<IP-VPS>`
- Nếu trên máy local: `http://localhost`

Lần đầu sẽ hiện trang Setup để tạo tài khoản admin.

## Khi cổng 80/443 đã có dịch vụ khác

Máy đã chạy reverse proxy sẵn (nginx, Caddy, Traefik...) thì đừng giành cổng của nó. Đặt trong `.env`:

```
HTTP_PORT=8081
HTTPS_PORT=8444
LEGO_DOMAIN=
```

Để trống `LEGO_DOMAIN` để proxy sẵn có lo TLS, rồi khai báo CQA ở proxy đó trỏ về `127.0.0.1:8081`.

Tương tự, nếu cổng 3306 đã bận, đặt `DB_PORT_HOST=3307`.

## Chạy trên localhost (Mac / Windows)

Bạn có thể chạy CQA trên chính máy cá nhân bằng Docker Desktop để test trước khi deploy VPS.

**Lưu ý kết nối kênh chat:**

- **Zalo OA**: Hỗ trợ callback URL là `http://localhost` — có thể test đầy đủ trên máy local
- **Facebook Fanpage**: Yêu cầu HTTPS — không dùng localhost được, cần deploy lên VPS với domain + SSL

## Kiểm tra trạng thái

```bash
cd ~/cqa
docker compose ps
```

Kết quả bình thường:

```
NAME        STATUS         PORTS
cqa-app     Up (healthy)
cqa-db      Up (healthy)   127.0.0.1:3306->3306/tcp
cqa-nginx   Up             0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

`cqa-app` không publish cổng nào ra ngoài — nó chỉ mở `8080` trong mạng nội bộ của compose để nginx gọi vào. Đây là chủ ý, không phải lỗi.

Thứ tự khởi động có ràng buộc: nginx chờ app `healthy`, app chờ db `healthy`. Cộng cả hai khoảng chờ khởi động thì lần `up` đầu tiên mất khoảng 70 giây trước khi nginx nhận request — nếu bấm vào sớm mà thấy chưa lên thì chờ thêm rồi kiểm tra lại.

## Xem log

```bash
docker compose logs -f        # Xem tất cả
docker compose logs app -f    # Chỉ xem app
docker compose logs nginx -f  # Chỉ xem nginx
```

## Gỡ cài đặt

```bash
cd ~/cqa
docker compose down -v   # -v xóa cả database
```

::: warning Lưu ý
`docker compose down -v` sẽ xóa toàn bộ dữ liệu (database, tin nhắn, kết quả). Nếu chỉ muốn dừng mà giữ dữ liệu, dùng `docker compose down` (không có `-v`).
:::

## Bước tiếp theo

- [Cập nhật phiên bản](/guide/updates) — Kéo code mới và build lại
- [Tên miền & SSL](/guide/domain-ssl) — Trỏ domain và bật HTTPS
- [Thiết lập ban đầu](/guide/initial-setup) — Tạo admin, cấu hình AI
- [Vận hành](/guide/operations) — Sao lưu database, kiểm tra máy chủ
- **Phát triển:** Xem `DEVELOPMENT.md` ở gốc repo nếu muốn chạy từ mã nguồn để đóng góp code hoặc custom development
