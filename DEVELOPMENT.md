# Phát triển ở local

Môi trường dev chạy theo mô hình **hybrid**: MySQL trong Docker, còn backend và
frontend chạy native trên máy để hot-reload nhanh và debug dễ.

```
localhost:3000   Vite dev server (Vue 3)   <- mở trình duyệt ở đây
       |  proxy /api, /oauth, /mcp
localhost:8080   go run . (Gin)
       |
127.0.0.1:3306   MySQL 8.0 (Docker, container cqa-dev-db)
```

## Yêu cầu

| Công cụ | Phiên bản |
|---|---|
| Go | >= 1.25 |
| Node.js | >= 20 |
| Docker | có Compose v2 |

Không cần cài MySQL trên máy. Nếu máy bạn đã có MySQL 9.x qua Homebrew thì cũng
không ảnh hưởng — dev dùng MySQL 8.0 trong Docker ở cổng 3306 (bind 127.0.0.1).

## Bắt đầu

```bash
make setup    # cài dependency + bật MySQL (chạy 1 lần sau khi clone)
make dev      # chạy backend + frontend, Ctrl-C để dừng cả hai
make seed     # ở terminal khác: tạo admin + nạp dữ liệu demo
```

Mở http://localhost:3000 và đăng nhập bằng tài khoản `make seed` in ra
(mặc định `dev@localhost.local` / `DevPass123`).

`make` không có tham số sẽ liệt kê toàn bộ lệnh.

## Các lệnh hay dùng

| Lệnh | Việc |
|---|---|
| `make dev` | Backend + frontend song song |
| `make backend` / `make frontend` | Chạy riêng từng phần |
| `make seed` | Tạo admin, tenant và dữ liệu demo |
| `make db-reset` | Xoá sạch DB dev, backend sẽ tự AutoMigrate lại |
| `make db-shell` | Mở mysql client trong container |
| `make test` | `go test ./...` + Vitest |
| `make clean` | Xoá DB dev, node_modules, binary Go |

## Vì sao phải chạy qua `make`

Backend không dùng `godotenv` — `config.Load()` trong
[backend/config/config.go](backend/config/config.go) chỉ đọc `os.Getenv`, nên
`go run .` trần sẽ crash vì thiếu `JWT_SECRET`. Makefile `include .env.dev` rồi
`export` để nạp biến trước khi gọi `go run`.

`.env.dev` **được commit** vào repo: toàn bộ giá trị là secret dùng riêng cho máy
dev, MySQL chỉ bind vào 127.0.0.1 và không chứa dữ liệu thật. Nhờ vậy clone về là
chạy được ngay. File production `.env` vẫn nằm trong `.gitignore` như cũ.

Nếu thêm biến có khoảng trắng vào `.env.dev`, nhớ bọc nháy (`KEY="hai chữ"`) vì
`scripts/dev-seed.sh` dùng `source` để đọc file này.

## Tách biệt với production

Dev không đụng gì tới stack production:

| | Dev | Production |
|---|---|---|
| File compose | `docker-compose.dev.yml` | `docker-compose.yml` |
| Compose project | `cqa-dev` | mặc định |
| Container DB | `cqa-dev-db` | `cqa-db` |
| Volume | `cqa-dev_cqa_dev_mysql` | `mysql_data` |
| Database | `cqa_dev` | `cqa` |
| Biến môi trường | `.env.dev` | `.env` |

Lưu ý: cả hai cùng bind cổng 3306, nên đừng chạy đồng thời hai stack.

## Upload file

Đường dẫn lưu file được hardcode là `/var/lib/cqa/files`
([backend/api/router.go](backend/api/router.go)). Chỉ khi cần test tính năng
upload mới phải chạy (lệnh này cần sudo):

```bash
make init-storage
```

## Test

```bash
make test
```

Hai test sau **đang fail sẵn trên `main`**, không liên quan tới môi trường dev:

- `ai/prompts_test.go` — không build được: `BuildQCPrompt` giờ nhận 2 tham số
  nhưng test vẫn gọi với 1.
- `engine/analyzer_test.go` — `TestCalculateCostUSD/claude_haiku_cheap` kỳ vọng
  chi phí trong khoảng cũ, đơn giá trong code đã đổi.

`make test-go` cố tình chạy `go test` với môi trường đã gỡ hết biến của
`.env.dev` (xem `CONFIG_VARS` trong Makefile), vì `config_test.go` kiểm tra giá
trị mặc định — nếu để `DB_NAME=cqa_dev` lọt vào nó sẽ báo fail sai.
