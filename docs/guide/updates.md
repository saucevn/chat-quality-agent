# Cập nhật phiên bản

## Cập nhật tự động (migration)

CQA sử dụng AutoMigrate của GORM — bản mới nào có thay đổi schema thì database sẽ tự cập nhật khi ứng dụng khởi động. **Bạn không cần chạy lệnh migrate thêm nào.**

Ví dụ: phiên bản mới thêm cột `channels.last_sync_attempt_at` để theo dõi từng lần đồng bộ. Khi ứng dụng restart, cột này tự được tạo — dữ liệu cũ không bị ảnh hưởng.

::: warning AutoMigrate chỉ tiến, không lùi
Rollback code thì được, nhưng rollback lược đồ database thì không. Trước khi cập nhật một bản có thay đổi schema lớn, hãy [sao lưu database](/guide/operations) trước.
:::

## Cập nhật

CQA build image ngay trên máy chạy, nên cập nhật là kéo code mới rồi build lại:

```bash
cd ~/cqa
./scripts/backup-db.sh     # sao lưu trước, xem mục Vận hành
git pull
docker compose up -d --build
docker compose logs -f app
```

Dữ liệu MySQL nằm trong Docker volume nên không bị ảnh hưởng khi build lại image. File `.env` cũng không bị đụng tới.

Nếu `.env.example` có thêm biến mới, đối chiếu với `.env` của bạn sau khi `git pull`:

```bash
diff <(grep -oE '^[A-Z_]+' .env.example | sort -u) <(grep -oE '^[A-Z_]+' .env | sort -u)
```

## Gắn nhãn phiên bản cho image

Mặc định image được gắn nhãn `dev`. Muốn biết chính xác bản nào đang chạy, đặt `CQA_VERSION` trước khi build:

```bash
CQA_VERSION=$(git describe --tags --always) docker compose up -d --build
```

Nhãn này hiện ở chip phiên bản trên header giao diện.

## Quay lại bản cũ

```bash
cd ~/cqa
git log --oneline -10          # tìm commit tốt trước đó
git checkout <commit>
docker compose up -d --build
```

Nhắc lại: cách này quay lại được **code**, không quay lại được **lược đồ database**. Nếu bản mới đã chạy AutoMigrate thêm cột, cột đó vẫn còn — thường vô hại, nhưng nếu có thay đổi lớn thì phải khôi phục từ bản sao lưu.
