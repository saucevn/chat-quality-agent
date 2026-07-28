# Changelog

## v2026.07.28

### Thay đổi phá vỡ tương thích
- **Bỏ đường cài đặt qua Docker Hub.** Xoá `install.sh`, `docker-compose.hub.yml` và `scripts/release.sh`. Image trên Docker Hub thuộc một tài khoản khác và không còn được cập nhật, nên `docker compose pull` không mang lại bản mới. Cách cài và cập nhật duy nhất nay là build từ source: `docker compose up -d --build`
- **Bỏ Watchtower** khỏi tài liệu — nó chỉ hoạt động cùng đường Docker Hub vừa gỡ
- Xoá file `VERSION` (chỉ `release.sh` đọc nó, và giá trị `1.0.0` đã lệch xa thực tế). Nhãn phiên bản của image nay đặt qua biến `CQA_VERSION` lúc build

### Sửa lỗi
- **Nút Docs, chip phiên bản và nút hướng dẫn kết nối kênh mở nhầm tài liệu của người khác**: 6 liên kết trong giao diện trỏ cứng sang `tanviet12.github.io`. Nay trỏ về trang tài liệu của chính hệ thống, và gom vào một hằng số duy nhất để không tái diễn
- **Banner cập nhật đưa lệnh không chạy được**: ô lệnh kèm nút sao chép ghi `cd /opt/cqa && docker compose pull && docker compose up -d` — sai cả thư mục lẫn cách cập nhật kể từ khi chuyển sang build từ source. Nay là `cd ~/cqa && ./scripts/backup-db.sh && git pull && docker compose up -d --build`
- **Gỡ liên kết "Cài Watchtower"** trong banner cập nhật: Watchtower đã bị bỏ, và liên kết đó trỏ tới một mục tài liệu không còn tồn tại

### Hạ tầng
- Khôi phục workflow `Deploy Docs`: mỗi lần đẩy lên `main` có thay đổi trong `docs/`, site tài liệu tự build và publish lên GitHub Pages. Cần bật Settings > Pages > Source = "GitHub Actions" một lần

### Tài liệu
- Thêm [Vận hành](/guide/operations): hướng dẫn `scripts/vps-preflight.sh` và `scripts/backup-db.sh` — hai script trước đây không được nhắc ở bất kỳ đâu
- Viết lại [Cài đặt](/guide/installation) và [Cập nhật](/guide/updates) theo đúng cách deploy thật
- Sửa [Biến môi trường](/reference/env-vars): bổ sung `HTTP_PORT`, `HTTPS_PORT`, `DB_PORT_HOST`, `AI_MAX_TOKENS`, `CQA_VERSION`; sửa 5 giá trị mặc định ghi sai; nêu rõ 6 biến bị `docker-compose.yml` đặt cứng nên sửa trong `.env` không có tác dụng
- Nêu rõ ở nhiều nơi: **mất `ENCRYPTION_KEY` là mất toàn bộ credential kênh**, bản sao lưu database không cứu được
- Sửa yêu cầu RAM: bước build frontend cần nhiều hơn lúc chạy, máy 1GB không swap sẽ bị OOM-kill
- Gỡ mọi liên kết trỏ về repo và Docker Hub của tài khoản khác; ảnh trong README chuyển sang đường dẫn tương đối
- `CLAUDE.md` nay được commit vào repo

## v2026.07.27

### Sửa lỗi
- **Tin Pancake chỉ có ảnh lưu nhầm HTML**: `original_message` rỗng nên code lấy `message` — vốn là bản đã render — khiến nội dung tin thành `<div></div>`. Đo trên dữ liệu thật: 75/469 tin (16%). Rác này đi thẳng vào transcript gửi AI chấm điểm, không chỉ hiển thị sai
- **Chữ phụ khó đọc**: nhãn và chú thích dùng màu Material cứng (`#9E9E9E`) đi vòng qua theme — tương phản 2,68:1, dưới chuẩn AA. Nay dùng token, đạt 5,22:1
- **Chip phân loại tàng hình ở chế độ tối**: màu tím Material nằm trên nền cùng sắc, tương phản 1,04:1

### Tài liệu
- Hướng dẫn Pancake: sửa mô tả sai rằng Page ID luôn là chuỗi số — Shopee, Zalo, TikTok có tiền tố nền tảng (`spo_`, `zl_`, `tt_`). Theo mô tả cũ, người dùng Shopee sẽ loại bỏ đúng Page ID vì thấy có chữ
- Bổ sung mục riêng cho Shopee: số hội thoại trong CQA ít hơn Pancake do lọc bỏ đánh giá, và không phân biệt được tin tự động

## v2026.07.26.3

### Tính năng mới
- **Kênh Pancake**: Kết nối một lúc đến ~20 nền tảng (Facebook, Instagram, TikTok Business, Zalo, Shopee, Lazada, Telegram, v.v.) — chỉ hỗ trợ hội thoại inbox
- **Môi trường phát triển**: `make setup` và `make dev` cho người đóng góp code — MySQL trong Docker, backend/frontend native

### Sửa lỗi
- **Đồng bộ kênh**: Sửa lỗi `last_sync_at` cập nhật ngay cả khi đồng bộ thất bại — khiến tin nhắn tới trong lúc trục trặc bị bỏ qua vĩnh viễn (Zalo OA, Facebook, Pancake)

---

## v2026.03.30

### Tính năng mới
- **MCP Redirect URIs & Scopes**: Tạo MCP client có thể cấu hình Redirect URIs và phân quyền (read/write) — bắt buộc để kết nối Claude Web

### Sửa lỗi
- **MCP OAuth**: Fix lỗi `invalid_redirect_uri` khi Claude.ai bấm Connect — do chưa cấu hình Redirect URI lúc tạo client
- **Cron timezone**: Job chạy sai giờ (lệch 7 tiếng) do container dùng UTC — đã fix bằng cách prefix `TZ=<tenant_timezone>` vào cron expression và thêm `TZ=Asia/Ho_Chi_Minh` vào Docker

## v2026.03.26

### Tính năng mới
- **Thông báo cập nhật**: Banner thông báo khi có phiên bản mới + changelog + hướng dẫn update
- **Nút Dừng job**: Có thể dừng job đang chạy từ giao diện (#7)
- **Docs + Version**: Hiển thị ở sidebar, truy cập nhanh tài liệu và changelog
- **URL ứng dụng**: Cấu hình URL trong Cài đặt để link thông báo Telegram/Email chính xác (#43)
- **Lịch chạy "Sau mỗi lần đồng bộ"**: Tự động chạy phân tích sau khi đồng bộ kênh thành công (#7, #45)
- **Cron hot-reload**: Tạo/sửa/xóa job "Theo lịch" không cần restart app

### Sửa lỗi
- **Job bị treo**: Fix infinite loop khi batchSize=0, thêm context cancellation check, check lỗi DB query (#7)
- **Facebook token**: Fix lỗi "must be called with Page Access Token" — tự động exchange User Token thành Page Token (#12, #13, #14)
- **Gemini models**: Thay gemini-2.0-flash (deprecated) bằng gemini-2.5-flash/pro
- **Lịch chạy**: Không lưu được "Lịch chạy" khi sửa công việc (#9)
- **AI model**: Job detail hiện đúng AI model từ Settings global thay vì giá trị cũ (#33)
- **Tỷ giá**: Dashboard dùng tỷ giá từ tenant settings thay vì hardcode 26000 VND (#23)
- **Install script**: Fix bị treo trên Ubuntu do interactive prompt (#35)
- **Ảnh trong đánh giá**: Hiển thị ảnh/sticker/file trong "Diễn biến cuộc chat" + lightbox zoom (#39)
- **Link Telegram**: Link thông báo dùng domain thực thay vì localhost (#43)
- **Job polling**: Spinner/progress bar dùng server status, không timeout cứng — F5 tự resume polling
- **Badge tab**: Đánh giá/Phân loại badge màu nổi hơn
- **Mobile sidebar**: Không tự mở sidebar trên điện thoại sau khi login

### Bảo mật
- Thêm security log khi từ chối truy cập file (IDOR fix)
- IDOR: Kiểm tra tenant ownership khi serve file (#22)
- Token refresh: Fix race condition gây logout bất ngờ (#26)
- OAuth state URL-encoded (#29)
- Goroutine timeout cho TriggerJob và TestRunJob (#30, #31)
- Giới hạn per_page max 100 tránh DB exhaustion (#32)
- Infinite polling: Frontend tự dừng poll sau timeout (#27, #28)
- **RBAC**: Phân quyền Member đầy đủ — backend middleware + frontend ẩn menu/nút + router guard (#42)
- **Export**: Member không có quyền ghi không được export tin nhắn
- **Tạo/xóa công ty**: Chỉ admin/owner mới được tạo và xóa công ty

### Tài liệu
- Sửa hướng dẫn lấy Telegram Group ID — dùng Telegram Web (#36)
- Thêm hướng dẫn chạy localhost (Zalo OA hỗ trợ callback localhost) (#34)
- Sửa docs Zalo OA: localhost không cần SSL (#37)
- Đơn giản hóa cài đặt Watchtower — 1 lệnh curl thay vì sửa YAML thủ công

---

## v2026.03.24

### Bug Fixes
- **Timezone**: Sửa lệch giờ 7 tiếng giữa Zalo OA và CQA — giờ hiển thị đúng GMT+7 (#5)
- **Sửa công việc**: Không lưu được "Quy tắc cho AI" khi sửa công việc phân tích (#2)
- **Đồng bộ kênh**: Chuyển sang async để tránh lỗi 504 timeout khi đồng bộ
- **Rate limit**: Tăng giới hạn mặc định lên 500/IP và 1000/user mỗi phút
- **Hiển thị ảnh**: Sửa lỗi không hiển thị ảnh từ Facebook trong tin nhắn
- **Auto-reload**: Tự tải lại khi JS chunks cũ sau deploy

### Mobile UI
- Onboarding bar: scroll ngang mượt, nút X luôn hiện
- Dashboard: ẩn tiêu đề trên mobile, date filter responsive
- Tin nhắn: toggle list/detail trên mobile thay vì xếp chồng
- Tạo công việc: stepper không còn đè chữ
- Chi tiết công việc: header compact, buttons responsive
- Bảng dữ liệu: thêm scroll ngang cho các bảng bị tràn

### CI/CD
- Tự động build + push Docker image lên Docker Hub khi push main
- Versioning theo ngày: v2026.03.24, v2026.03.24.2...
- Tự động tạo GitHub Release với changelog

### Documentation
- Thêm yêu cầu hệ thống vào hướng dẫn cài đặt
- Ảnh trong docs có thể click zoom
- Hỗ trợ macOS và Windows (Docker Desktop)

---

## [1.0.0] - 2026-03-23

### Ra mắt phiên bản đầu tiên

- Đồng bộ tin nhắn từ Zalo OA và Facebook Messenger
- Đánh giá chất lượng CSKH bằng AI (Claude / Gemini)
- Phân loại chat theo chủ đề tùy chỉnh
- Cảnh báo tự động qua Telegram và Email
- Batch AI mode — tiết kiệm chi phí gọi AI
- Dashboard với biểu đồ và thống kê
- Multi-tenant với phân quyền Owner > Admin > Member
- Tích hợp MCP cho Claude Web/Desktop
- Nginx reverse proxy + SSL tự động (Let's Encrypt)
- Docker Compose deployment
- Hỗ trợ Docker Hub images
