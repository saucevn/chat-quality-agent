# CLAUDE.md

Hướng dẫn cho Claude Code khi làm việc trong repo này.

File này **được commit**. Đừng đặt vào đây IP máy chủ, domain prod, username hay
secret — chỗ cho những thứ đó là `.claude/`, vẫn nằm trong `.gitignore`.

## Repo này là gì

Chat Quality Agent (CQA) — hệ thống Go + Vue chấm chất lượng CSKH bằng AI.
Đồng bộ tin nhắn từ Zalo OA, Facebook Messenger, Pancake (kênh gộp ~20 nền
tảng, nhưng v1 chỉ lấy hội thoại inbox), rồi dùng Claude/Gemini đánh giá và
gửi cảnh báo qua Telegram/Email. Multi-tenant, phân quyền Owner > Admin >
Member. Tài liệu người dùng cuối ở `docs/` (VitePress); `research/` là ghi chú
nội bộ và các plan kỹ thuật, không publish.

**`docs/` là nội dung công khai.** `.github/workflows/docs.yml` tự build và
publish lên https://saucevn.github.io/chat-quality-agent/ mỗi khi `main` có
thay đổi trong `docs/`. Sửa file ở đó là sửa một website đang chạy thật —
đừng đặt vào đó IP, domain prod, username máy chủ hay thứ gì chỉ dành cho nội
bộ. Chỗ cho những thứ đó là `.claude/` (gitignore) hoặc `research/` (trong repo
nhưng VitePress không build).

Kiểm tra trước khi đẩy: `npm run docs:build` trong `docs/` — nó fail nếu có
liên kết nội bộ chết, đúng như workflow sẽ làm.

Kiến trúc 3 tầng (`README.md`):

```
Nginx (HTTP_PORT/HTTPS_PORT, SSL) → CQA App :8080 (Go/Gin + SPA tĩnh) → MySQL 8.0
```

Dev thì khác — xem phần "Chạy dev" bên dưới.

Cấu trúc: `backend/{ai,api,channels,db,engine,mcp,notifications,pkg}`,
`frontend/src/{views,components,stores,i18n,plugins,router}`.

- `backend/main.go`: load config → connect DB → `db.AutoMigrate()` → khởi
  động scheduler (`engine.NewScheduler`) → `api.SetupRouter`.
- `backend/api/router.go`: toàn bộ route định nghĩa ở đây, một file duy nhất.
  Route ghi (channels/jobs/settings/users...) đều qua
  `middleware.RequirePermission(resource, action)` với action `r`/`w`/`d`,
  hoặc `middleware.RequireRole("owner", "admin")` cho việc nhạy cảm hơn
  (xoá tenant, đổi role). File upload phục vụ tại `/api/v1/files/*filepath`,
  thư mục gốc hardcode `/var/lib/cqa/files`.
- `backend/engine/sync.go`: `SyncEngine.SyncChannel` — decrypt credentials,
  tạo adapter qua `channels.NewAdapter`, fetch conversations/messages, upsert
  vào DB. Watermark `last_sync_at` **chỉ tiến khi sync thành công**
  (`syncStatusUpdates` trong sync.go) — cột `last_sync_attempt_at` tiến ở mọi
  lần thử để scheduler giãn cách retry.
- `backend/engine/analyzer.go`: `Analyzer.runJobInternalExt` — nạp hội thoại
  theo khoảng thời gian, gọi AI (chế độ batch mặc định bật, batch size 5),
  parse JSON kết quả (`qc_analysis` hoặc `classification`), lưu
  `JobResult`, cập nhật tiến độ real-time vào `JobRun.Summary`.

## Chạy dev

Mô hình hybrid: MySQL trong Docker, backend (`go run`) và frontend (`vite`)
chạy native — xem `DEVELOPMENT.md` để biết đầy đủ.

```
make setup   # 1 lần sau khi clone: go mod download, npm ci, bật MySQL dev
make dev     # backend :8080 + frontend :3000 song song, Ctrl-C dừng cả hai
make seed    # terminal khác: tạo admin + dữ liệu demo
```

Mở `http://localhost:3000`. Đăng nhập bằng tài khoản `make seed` in ra.

**Vì sao phải qua `make` chứ không `go run .` trần:** backend không dùng
`godotenv`, `config.Load()` (`backend/config/config.go`) chỉ đọc
`os.Getenv`. Makefile `include .env.dev` rồi `export` để nạp biến trước khi
gọi `go run`. `.env.dev` được commit (chỉ chứa secret dùng riêng máy dev).

## Chạy test — LUÔN dùng `make test-go`, không `go test ./...` trần

```
make test        # test-go + test-fe
make test-go     # backend, env sạch
make test-fe     # frontend (vitest)
```

`make test-go` chủ động chạy `go test` với các biến trong `CONFIG_VARS`
(Makefile) đã bị gỡ khỏi môi trường (`env -u DB_NAME -u JWT_SECRET ...`).
Lý do: `backend/config/config_test.go` kiểm tra **giá trị mặc định** của
`config.Load()`. Nếu chạy `go test ./...` trần trong shell đã có `.env.dev`
export (ví dụ sau khi chạy `make dev`), biến như `DB_NAME=cqa_dev` lọt vào
môi trường và test fail sai — không phải bug thật.

**Trạng thái test trên `main`** (tự chạy `make test-go` để xác nhận,
2026-07-28): **pass toàn bộ**. Test `engine.TestCalculateCostUSD` từng fail vì
đơn giá Claude Haiku, đã được sửa ở PR #21 — nếu thấy tài liệu cũ nào còn nói
test này đỏ thì tài liệu đó lỗi thời.

## Deploy — luôn build từ source

**Không dùng Docker Hub.** Tài khoản `buitanviet` giữ image cũ không thuộc
quyền repo này, và workflow release đã bị gỡ. `docker-compose.yml` vì thế
build image ngay trên máy chạy:

```
docker compose up -d --build
```

Đừng đề xuất khôi phục `release.yml`, sửa `DOCKERHUB_TOKEN`, hay thêm lại
`docker-compose.hub.yml`/`install.sh` — chúng đã bị xoá có chủ đích ở lần dọn
docs 2026-07-28 (`research/plans/2026-07-28-docs-cleanup-design.md`).

Hai script vận hành, tài liệu ở `docs/guide/operations.md`:

- `scripts/vps-preflight.sh [domain]` — chỉ đọc, kiểm RAM/đĩa/cổng/DNS trước
  khi deploy. Ngưỡng FAIL về RAM cao (1500MB khả dụng) vì build frontend nặng
  hơn lúc chạy nhiều.
- `scripts/backup-db.sh` — dump MySQL, xoay vòng. Bản dump **không** chứa
  `ENCRYPTION_KEY`.

Runbook deploy đầy đủ (có IP, domain, username thật) nằm trong `.claude/` —
đã gitignore. Đừng commit nó và đừng chép nội dung sang file được commit.

## Bẫy: `gh` phân giải nhầm repo

Có một repo public trùng tên (`tanviet12/chat-quality-agent`, chính là
`upstream`). `gh` hay tự chọn nó thay vì repo thật. **Luôn truyền `--repo`:**

```
gh pr list --repo saucevn/chat-quality-agent
```

Bỏ cờ này thì kết quả trả về là của repo người khác — đã từng dẫn tới một kết
luận sai hoàn toàn về việc CI có chạy hay không.

## Quy ước code quan sát được

- Test Go dùng thư viện chuẩn (`testing`), table-driven, không có
  testify trong repo.
- Log có prefix theo module: `[sync]`, `[analyzer]`, `[analyzer-batch]`,
  `[security]`.
- Lỗi bọc bằng `fmt.Errorf("...: %w", err)`.
- ID dùng UUID qua `pkg.NewUUID()`; secret mã hoá AES-256-GCM qua
  `pkg.Encrypt`/`pkg.Decrypt` với `cfg.EncryptionKey`.
- Route ghi luôn qua `middleware.RequirePermission("<resource>", "r"|"w"|"d")`
  hoặc `middleware.RequireRole(...)`.
- Tài liệu và comment viết bằng tiếng Việt.

## Thêm một loại kênh chat mới

Interface `channels.ChannelAdapter` (`backend/channels/adapter.go`) chỉ có
3 method: `FetchRecentConversations`, `FetchMessages`, `HealthCheck`. Nhưng
để một channel type mới thật sự dùng được, phải sửa nhiều nơi vì **không có
danh sách channel type dùng chung** — mỗi nơi hardcode string riêng:

- `backend/channels/registry.go` — thêm case trong `NewAdapter` (switch theo
  `channelType`).
- `backend/api/handlers/channels.go` — validation `oneof` trên field
  `ChannelType` (hiện tại: `oneof=zalo_oa facebook pancake`).
- **7 file frontend**, mỗi file tự liệt kê channel type bằng ternary/switch
  riêng (đã xác nhận bằng grep, không phải suy đoán):
  `frontend/src/components/JobWizard/StepInput.vue`,
  `frontend/src/i18n/en.ts`, `frontend/src/i18n/vi.ts`,
  `frontend/src/views/Channels.vue`,
  `frontend/src/views/Channels/ChannelDetail.vue`,
  `frontend/src/views/Dashboard.vue`, `frontend/src/views/Messages.vue`.

Nếu định thêm channel type mới, cân nhắc trước: có đáng tạo một danh sách
dùng chung (constant ở backend, enum/composable ở frontend) để tránh phải
sửa rải rác thế này lần sau — nhưng đó là quyết định thiết kế, không tự ý
làm nếu không được yêu cầu.

## Những cái bẫy đã biết

- **Vuetify 4.0.3 không parse được màu OKLCH.** Trong
  `frontend/node_modules/vuetify/lib/util/colorUtils.js`,
  `cssColorRe = /^(?<fn>(?:rgb|hsl)a?)\((?<values>.+)\)/` — chỉ khớp
  `rgb()/rgba()/hsl()/hsla()`, không khớp `oklch()`. Nếu định dùng design
  token dạng OKLCH cho theme Vuetify (`frontend/src/plugins/vuetify.ts`),
  phải convert sang hex/rgb/hsl trước.
- **`SenderExternalID` của Zalo OA (`backend/channels/adapter.go`) là id
  tài khoản OA dùng chung**, Zalo không cho biết nhân viên nào gõ tin — nên
  không chấm điểm theo từng nhân viên được với Zalo. Pancake trả UUID nhân
  viên (chấm được theo người), Facebook trả page id cho tin nhắn agent.
- **Tài liệu API Pancake chính thức mô tả sai vài chỗ** — xem
  `research/pancake-integration.md` (đã đối chiếu với response API thật).
- **`last_sync_at` vs `last_sync_attempt_at`** (`backend/db/models/channel.go`,
  `backend/engine/sync.go`): `last_sync_at` là watermark dữ liệu, chỉ tiến
  khi sync thành công; `last_sync_attempt_at` tiến ở mọi lần thử, dùng để
  scheduler giãn retry. Trước đây có bug `last_sync_at` tiến cả khi fail
  (đã sửa, ảnh hưởng Zalo OA + Facebook, không riêng Pancake) — cẩn thận
  đừng lặp lại lỗi này khi sửa logic sync.
- **`ENCRYPTION_KEY` phải đúng 32 ký tự** — `backend/config/config.go:62`
  kiểm `len(cfg.EncryptionKey) != 32` và dùng thẳng chuỗi đó làm khoá AES-256.
  Mất khoá là mất toàn bộ credential kênh, bản sao lưu DB không cứu được.
- **`backend/api/handlers/version.go` trỏ tới repo GitHub của người khác** —
  tính năng kiểm tra phiên bản mới đang hỏi releases của
  `tanviet12/chat-quality-agent`. Chưa sửa, đã tách thành việc riêng; docs
  hiện không hứa hẹn tính năng này nữa.
- Đường dẫn upload file hardcode `/var/lib/cqa/files`
  (`backend/api/router.go`, `backend/engine/sync.go`) — tạo bằng
  `make init-storage` (cần sudo), chỉ cần khi test tính năng upload.
- **Module path là `github.com/vietbui/chat-quality-agent`** (`go.mod`), không
  khớp tên chủ repo. Đổi sẽ chạm mọi import — đừng tự ý sửa.

## Nơi tra cứu thêm

- `DEVELOPMENT.md` — chi tiết môi trường dev, mô hình hybrid, tách biệt
  dev/production.
- `docs/guide/operations.md` — preflight, sao lưu, khôi phục.
- `.github/workflows/` — `ci.yml` (test Go + Vue, chạy trên mọi PR) và
  `docs.yml` (publish docs lên Pages khi `main` đổi). Không có workflow nào
  build hay push Docker image; xem mục Deploy ở trên để biết vì sao.
- `docs/reference/env-vars.md` — bảng biến môi trường, kèm ghi chú 6 biến bị
  compose đặt cứng.
- `research/pancake-integration.md` — nghiên cứu API Pancake đầy đủ, có
  trích dẫn nguồn (OpenAPI spec chính thức + user manual).
- `research/plans/` — các plan kỹ thuật đã thực hiện.
- `CHANGELOG.md` — lịch sử thay đổi theo phiên bản.
