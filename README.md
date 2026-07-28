# Chat Quality Agent (CQA)

Giấy phép: [MIT](LICENSE)

Hệ thống phân tích chất lượng chăm sóc khách hàng bằng AI. Tự động đồng bộ tin nhắn từ Zalo OA, Facebook Messenger và Pancake (kênh gộp đa nền tảng), dùng AI (Claude/Gemini) đánh giá chất lượng CSKH và gửi cảnh báo qua Telegram/Email.

📖 **Hướng dẫn sử dụng chi tiết nằm trong thư mục [`docs/`](docs/)** — bắt đầu từ [Cài đặt](docs/guide/installation.md).

![Dashboard](docs/public/screenshots/dashboard.png)

## Tính năng

- **Đồng bộ tin nhắn** từ Zalo OA, Facebook Messenger và Pancake — kênh gộp phủ thêm gần 20 nền tảng khác (Instagram, TikTok, Zalo cá nhân, Shopee, WhatsApp, Telegram...), hiện chỉ đồng bộ hội thoại inbox
- **Đánh giá chất lượng CSKH** bằng AI (Claude hoặc Gemini) — Đạt/Không đạt, điểm 0-100, nhận xét chi tiết
- **Phân loại chat** theo chủ đề tùy chỉnh (khiếu nại, góp ý, hỏi giá...)
- **Cảnh báo tự động** qua Telegram và Email
- **Batch AI mode** — gom nhiều cuộc chat/lần gọi AI, tiết kiệm chi phí
- **Dashboard** với biểu đồ, thống kê, cảnh báo gần đây
- **Multi-tenant** — nhiều công ty trên 1 hệ thống, phân quyền Owner > Admin > Member
- **Tích hợp MCP** cho Claude Web/Desktop
- **SSL tự động** qua Let's Encrypt (tùy chọn)

## Cài đặt nhanh

CQA build image ngay trên máy chạy, không phụ thuộc Docker Hub.

```bash
git clone https://github.com/saucevn/chat-quality-agent.git
cd chat-quality-agent
cp .env.example .env
# Sửa .env — xem docs/reference/env-vars.md
docker compose up -d --build
```

Trước khi cài lên VPS, chạy `./scripts/vps-preflight.sh` để kiểm tra RAM, ổ cứng, cổng và DNS. Build frontend cần ~1.5 GB RAM khả dụng (hoặc swap) — nhiều hơn lúc chạy.

Truy cập: **http://your-server-ip** (hoặc `http://localhost` nếu cài trên máy local) — Lần đầu sẽ hiện trang Setup để tạo tài khoản admin.

Nếu cổng 80/443 trên máy đã có dịch vụ khác, đặt `HTTP_PORT` / `HTTPS_PORT` trong `.env` rồi đưa CQA ra sau reverse proxy sẵn có.

### Bật SSL (tùy chọn)

Thêm vào file `.env`:
```
LEGO_DOMAIN=cqa.yourdomain.com
LEGO_EMAIL=admin@yourdomain.com
```

Trỏ DNS A record về IP server, sau đó restart:
```bash
docker compose restart nginx
```

SSL sẽ tự động tạo và gia hạn qua Let's Encrypt.

## Công nghệ

| Thành phần | Công nghệ |
|-----------|-----------|
| Backend | Go 1.25+ / Gin |
| Frontend | Vue 3 + Vuetify 4 + Vite |
| Database | MySQL 8.0 |
| AI | Claude (Anthropic) / Gemini (Google) |
| Reverse Proxy | Nginx + Let's Encrypt (Lego) |
| Deploy | Docker Compose |

## Kiến trúc

```
                    ┌──────────────┐
  Internet ────────>│    Nginx     │ HTTP_PORT:80 / HTTPS_PORT:443
                    │  (SSL + RP)  │ (mặc định 80/443)
                    └──────┬───────┘
                           │
                    ┌──────┴───────┐
                    │   CQA App    │ Port 8080 (internal)
                    │ Go + Vue SPA │
                    └──────┬───────┘
                           │
                    ┌──────┴───────┐
                    │   MySQL 8.0  │ Port 3306 (internal)
                    └──────────────┘
```

## Cấu trúc dự án

```
chat-quality-agent/
├── backend/            # Go API server
│   ├── ai/             # AI providers (Claude, Gemini)
│   ├── api/            # REST API handlers + middleware
│   ├── channels/       # Zalo OA, Facebook, Pancake adapters
│   ├── db/             # GORM models + MySQL
│   ├── engine/         # Analyzer + Sync + Scheduler
│   ├── mcp/            # MCP server cho Claude
│   └── notifications/  # Telegram + Email
├── frontend/           # Vue 3 SPA
├── docker/             # Nginx + SSL configs
├── docs/               # Tài liệu hướng dẫn (VitePress)
├── research/           # Tài liệu nghiên cứu nội bộ, không publish lên docs
├── scripts/            # vps-preflight.sh, backup-db.sh, dev-seed.sh
├── docker-compose.yml      # Stack production, build từ source
├── docker-compose.dev.yml  # Môi trường dev (xem DEVELOPMENT.md)
├── Makefile                # Lệnh dev: make setup / make dev / make test...
├── Dockerfile
└── DEVELOPMENT.md      # Hướng dẫn phát triển ở local
```

## Phát triển ở local

Môi trường dev chạy MySQL trong Docker, backend và frontend chạy native để hot-reload nhanh. Xem chi tiết tại [DEVELOPMENT.md](DEVELOPMENT.md).

```bash
make setup    # cài dependency + bật MySQL (chạy 1 lần sau khi clone)
make dev      # chạy backend + frontend
```

## Hướng dẫn sử dụng

1. **Kết nối kênh chat**: Cài đặt > Kênh chat > Kết nối Facebook/Zalo/Pancake
2. **Đồng bộ tin nhắn**: Bấm "Đồng bộ ngay" hoặc chờ tự động
3. **Cấu hình AI**: Cài đặt > AI > Chọn Claude/Gemini + nhập API key
4. **Tạo công việc**: Công việc > Tạo mới > Wizard 6 bước
5. **Chạy phân tích**: Chi tiết công việc > Chạy thử hoặc Chạy ngay
6. **Xem kết quả**: Chi tiết công việc > Kết quả đánh giá

## Biến môi trường

| Biến | Mô tả | Bắt buộc |
|------|-------|----------|
| `DB_PASSWORD` | Mật khẩu MySQL | Có |
| `MYSQL_ROOT_PASSWORD` | Mật khẩu root MySQL | Có |
| `JWT_SECRET` | Secret cho JWT tokens (min 32 ký tự) | Có |
| `ENCRYPTION_KEY` | Key 32 bytes cho AES-256-GCM | Có |
| `LEGO_DOMAIN` | Domain cho SSL tự động | Không |
| `LEGO_EMAIL` | Email cho Let's Encrypt | Không |
| `APP_URL` | URL công khai (cho links notification) | Không |
| `HTTP_PORT` | Cổng HTTP trên host (mặc định `80`) | Không |
| `HTTPS_PORT` | Cổng HTTPS trên host (mặc định `443`) | Không |
| `CQA_VERSION` | Nhãn phiên bản gắn vào image lúc build (mặc định `dev`) | Không |

Xem đầy đủ trong [.env.example](.env.example) và [docs/reference/env-vars.md](docs/reference/env-vars.md).

> **Giữ `ENCRYPTION_KEY` ở nơi khác ngoài máy chủ.** Mọi credential kênh được mã hoá AES-256-GCM bằng khoá này; mất khoá thì phải nối lại toàn bộ kênh từ đầu, kể cả khi còn bản sao lưu database.

## Screenshots

| | |
|---|---|
| ![Setup](docs/public/screenshots/setup.png) | ![Dashboard](docs/public/screenshots/dashboard.png) |
| Trang Setup lần đầu | Dashboard |
| ![Kết nối kênh](docs/public/screenshots/ket-noi-kenh-chat.png) | ![Tạo công việc](docs/public/screenshots/tao-cong-viec.png) |
| Kết nối kênh chat | Tạo công việc |
| ![Kết quả QC](docs/public/screenshots/ket-qua-cong-viec-danh-gia.png) | ![Kết quả phân loại](docs/public/screenshots/ket-qua-cong-viec-phan-loai.png) |
| Kết quả đánh giá QC | Kết quả phân loại |
| ![Chi tiết tin nhắn](docs/public/screenshots/chi-tiet-tin-nhan-va-danh-gia.png) | ![Chi tiết kênh](docs/public/screenshots/chi-tiet-kenh-chat.png) |
| Chi tiết tin nhắn + đánh giá | Chi tiết kênh chat |

## Changelog

Xem lịch sử thay đổi tại: **[CHANGELOG.md](CHANGELOG.md)**

## Tài liệu

Toàn bộ tài liệu nằm trong thư mục [`docs/`](docs/), đọc trực tiếp trên GitHub được:

- [Cài đặt](docs/guide/installation.md) · [Cập nhật](docs/guide/updates.md) · [Tên miền & SSL](docs/guide/domain-ssl.md) · [Vận hành](docs/guide/operations.md)
- [Kết nối kênh chat](docs/usage/channels.md) · [Facebook](docs/usage/facebook.md) · [Pancake](docs/usage/pancake.md)
- [Biến môi trường](docs/reference/env-vars.md) · [REST API](docs/reference/api.md) · [FAQ](docs/faq.md)

Muốn xem dạng website, chạy `npm install && npm run docs:dev` trong `docs/`.

## License

[MIT](LICENSE) - SePay
