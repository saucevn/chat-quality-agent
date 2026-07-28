# Thiết kế: dọn docs cho khớp hệ thống prod thật

Lập ngày 2026-07-28. Nhánh `claude/update-claude-docs-670727`.

Đặt ở `research/plans/` chứ không phải `docs/`: VitePress build mọi `.md` dưới
`docs/`, nên để đây thì tài liệu nội bộ sẽ lọt lên site người dùng cuối.

## Vấn đề

VPS prod đã chạy (build từ source, không watchtower — runbook ở
`.claude/deploy-cqa-bebe-group.md`, đã gitignore). Docs thì vẫn mô tả một hệ
thống khác:

1. **Trỏ nhầm chủ sở hữu.** Repo thật là `saucevn/chat-quality-agent` (private).
   Docs trỏ về `tanviet12/chat-quality-agent` (repo public trùng tên, là
   `upstream`) và Docker Hub `buitanviet` — cả hai đều không thuộc quyền người
   dùng. Gồm: badge, 2 link docs site, 9 URL ảnh, 4 lệnh `curl`, 5 link repo.
2. **Trang docs external đã chết.** `.github/workflows/docs.yml` bị xoá ở
   `99d6e4f`, `release.yml` bị xoá ở `869fff1`. Nhưng README vẫn quảng cáo
   `tanviet12.github.io/chat-quality-agent/` ở 2 chỗ, và docs vẫn dạy cập nhật
   bằng `docker compose pull` từ Docker Hub.
3. **Đường cài đặt sai.** `docker-compose.yml` đã sửa thành build-from-source ở
   PR #24/#25, có `HTTP_PORT`/`HTTPS_PORT`, healthcheck app, `depends_on:
   service_healthy`. Docs vẫn dạy `install.sh` → `docker compose pull` →
   Watchtower, cổng cứng 80/443, `/opt/cqa`.
4. **Hai script ops mới không có tài liệu.** `scripts/vps-preflight.sh` và
   `scripts/backup-db.sh` (thêm ở `76eff84`) không được nhắc ở bất kỳ file docs
   nào. Bản thân chúng lại tham chiếu "runbook" — file không có trong repo.
5. **`docs/reference/env-vars.md` sai.** Thiếu 5 biến, sai 5 giá trị mặc định,
   không nói 6 biến bị compose ép cứng nên sửa trong `.env` là vô tác dụng.

## Nguyên tắc

1. Docs chỉ mô tả cái repo này tự chạy được: `git clone` + `docker compose up -d
   --build`. Không có bước nào cần tài sản của tài khoản khác.
2. Link ngoài chỉ giữ khi là thao tác người dùng buộc phải làm ở nơi khác
   (Facebook Developers, BotFather, Anthropic Console, Zalo Developers...).
   Link trỏ về tài sản `tanviet12`/`buitanviet` gỡ hết.
3. Thông tin prod thật (`cqa.bebe.group`, IP, tên user) **không** vào docs công
   khai — ở lại runbook đã gitignore. Docs dùng placeholder.
4. Không sửa lịch sử CHANGELOG. Mục cũ nói "hỗ trợ Docker Hub images" là đúng
   tại thời điểm đó; thêm mục mới thay vì viết lại quá khứ.

## Thay đổi

### Xoá

| File | Vì sao |
|---|---|
| `install.sh` | `REPO=` trỏ raw.githubusercontent của `tanviet12`; repo thật private nên curl 404 |
| `docker-compose.hub.yml` | Pull image `buitanviet/*`; không còn workflow nào build image đó |
| `scripts/release.sh` | Push image lên namespace `buitanviet`, không có quyền; đã mồ côi, không file nào gọi |
| `VERSION` | Consumer duy nhất là `release.sh`; nội dung `1.0.0` lệch với CHANGELOG `v2026.07.27`; compose dùng `${CQA_VERSION:-dev}` chứ không đọc file này |

### Sửa

| File | Thay đổi |
|---|---|
| `README.md` | Bỏ badge Docker Hub; 2 link docs site → `docs/`; 9 ảnh raw URL → đường dẫn tương đối; bỏ "Cách 1: install.sh"; clone → `saucevn`; sơ đồ nêu `HTTP_PORT`/`HTTPS_PORT`; bảng biến thêm port + `CQA_VERSION`; cấu trúc dự án bỏ file đã xoá |
| `docs/guide/installation.md` | Một đường build-from-source; `/opt/cqa` → `~/cqa`; sửa bảng `docker compose ps` (app chỉ `expose`, có healthcheck); RAM nêu rõ build cần ~1.5GB khả dụng hoặc swap; thêm bước chạy `vps-preflight.sh` |
| `docs/guide/updates.md` | Viết lại: `git pull` + `docker compose up -d --build`; xoá mục Watchtower và lệnh curl hub.yml; giữ AutoMigrate; gỡ khẳng định "tự động báo bản mới" |
| `docs/reference/env-vars.md` | Thêm `HTTP_PORT`, `HTTPS_PORT`, `DB_PORT_HOST`, `AI_MAX_TOKENS`, `CQA_VERSION`; sửa mặc định `RATE_LIMIT_PER_IP` 100→500, `RATE_LIMIT_PER_USER` 300→1000, `SERVER_HOST`→`127.0.0.1`, `APP_ENV`→`development`, `DB_HOST`→`localhost`; nêu 6 biến compose ép cứng; cảnh báo mất `ENCRYPTION_KEY` |
| `docs/guide/domain-ssl.md` | `/opt/cqa` → `~/cqa`; sửa mục "Port 80 already in use" để chỉ sang `HTTP_PORT` |
| `docs/faq.md` | Bỏ `docker rmi buitanviet/...`; sửa "ufw allow 80" (ufw không chặn được cổng Docker publish — `vps-preflight.sh:117`); `/opt/cqa`; sửa "chờ 30 giây" thành ~70s theo `start_period` thật |
| `docs/guide/introduction.md` | Yêu cầu RAM khớp preflight |
| `docs/index.md` | Bỏ nút GitHub trỏ `tanviet12` |
| `docs/.vitepress/config.ts` | Bỏ socialLink `tanviet12`; thêm `operations` vào sidebar |
| `CHANGELOG.md`, `docs/changelog.md` | Thêm mục mới cho lần dọn này |
| `.gitignore` | Bỏ dòng `CLAUDE.md` |

### Thêm

**`docs/guide/operations.md`** — tài liệu hai script ops:

- `vps-preflight.sh`: chạy trước khi deploy, kiểm RAM/disk/cổng/DNS. Nêu rõ
  ngưỡng FAIL (RAM khả dụng < 1500MB và swap < 2048MB) vì build frontend
  (`vue-tsc -b && vite build`) là chỗ ngốn RAM nhất.
- `backup-db.sh`: dump MySQL, xoay vòng theo `CQA_BACKUP_KEEP_DAYS`, biến
  `CQA_ENV_FILE`/`CQA_BACKUP_DIR`/`CQA_DB_CONTAINER`. Kèm cảnh báo: bản dump
  **không** chứa `ENCRYPTION_KEY`, mất key thì mọi credential kênh không giải mã
  lại được.
- Mục khôi phục và nhắc "backup chưa restore thử thì chưa gọi là backup".

**`CLAUDE.md`** (chuyển từ ngoài git vào repo) — cập nhật:

- Gỡ khẳng định `engine.TestCalculateCostUSD` đang fail. **Đã verify**: `make
  test-go` ngày 2026-07-28 pass toàn bộ, PR #21 sửa đơn giá rồi.
- Thêm quy tắc deploy build-từ-source và lý do (không sở hữu `buitanviet`).
- Thêm bẫy `gh` phân giải nhầm sang repo public trùng tên → luôn truyền
  `--repo saucevn/chat-quality-agent`.
- Thêm hai script ops và trỏ tới runbook private.
- Ghi rõ file này giờ đã commit, nên không đặt IP/domain/secret vào đây.

## Ngoài phạm vi

- **`backend/api/handlers/version.go:19`** hardcode
  `api.github.com/repos/tanviet12/chat-quality-agent/releases/latest`. Tính năng
  "báo bản mới" đang hỏi release của repo người khác, mà repo thật lại private
  nên đổi URL cũng trả 404. Lần này chỉ gỡ khẳng định tương ứng trong docs; sửa
  code tách task riêng để không trộn code vào PR docs.
- **Module path `github.com/vietbui/chat-quality-agent`** (`go.mod`) — đổi sẽ
  chạm mọi import trong repo, không thuộc việc dọn docs.
- **7 ảnh screenshot không file docs nào tham chiếu** — để nguyên, xoá ảnh là
  quyết định khác.

## Kiểm chứng

1. `grep -rn "tanviet12\|buitanviet" --include="*.md" --include="*.ts" .` chỉ
   còn kết quả trong `research/` và `.superpowers/` (ghi chép lịch sử).
2. `npm run docs:build` trong `docs/` chạy sạch, không dead link.
3. `make test` pass.
4. Mọi lệnh trong `docs/guide/installation.md` và `updates.md` chỉ dùng repo này.
