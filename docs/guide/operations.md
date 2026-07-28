# Vận hành

Hai script trong thư mục `scripts/` phục vụ việc chạy CQA trên máy chủ thật.

## Kiểm tra máy chủ trước khi deploy

```bash
./scripts/vps-preflight.sh cqa.example.com
```

Script **chỉ đọc**, không sửa gì trên máy. Truyền domain là tuỳ chọn — bỏ trống thì bỏ qua phần kiểm DNS (script cũng tự đọc `LEGO_DOMAIN` từ môi trường nếu có).

Nó kiểm 5 nhóm:

| Nhóm | Kiểm gì |
|---|---|
| Docker | Đã cài chưa, daemon gọi được không cần `sudo` không, có compose plugin v2 không |
| Tài nguyên | RAM còn trống, swap, đĩa `/` còn trống |
| Cổng | 80, 443, 3306 có đang bị chiếm không |
| Va chạm | Đã có container tên `cqa-nginx`/`cqa-app`/`cqa-db` chưa; container nào đang publish ra `0.0.0.0` |
| DNS | Bản ghi A của domain có khớp IPv4 công khai của máy không |

Script thoát với mã `1` nếu có mục `FAIL`. Mục `WARN` không chặn nhưng nên đọc.

### Vài ngưỡng đáng biết

- **RAM:** `FAIL` khi còn dưới 1500 MB *và* swap dưới 2048 MB. Ngưỡng cao vì bước build frontend nặng hơn lúc chạy nhiều.
- **Đĩa:** `FAIL` khi dưới 10 GB — build cache của Docker sẽ ăn hết. Dọn bằng `docker system prune -a`.
- **Cổng 80/443 bận:** đừng giành cổng của reverse proxy sẵn có. Đặt `HTTP_PORT`/`HTTPS_PORT` và để trống `LEGO_DOMAIN` — xem [Cài đặt](/guide/installation).
- **DNS lệch:** nếu đang bật proxy Cloudflare (mây cam), tắt về *DNS only* để lấy chứng chỉ lần đầu. Bật lại sau, với SSL/TLS mode **Full (strict)**.

::: warning ufw không chặn được cổng Docker publish
Container publish ra `0.0.0.0` thì Docker chèn luật iptables **trước** chuỗi của ufw. `ufw deny` sẽ không có tác dụng với cổng đó. Muốn giới hạn thì đổi cách publish (bind vào `127.0.0.1`) chứ đừng trông vào ufw.
:::

## Sao lưu database

Compose **không** có sẵn cơ chế sao lưu. MySQL nằm trong Docker volume, không có gì tự dump nó. Dùng script:

```bash
./scripts/backup-db.sh
```

Script dump database ra `$HOME/cqa-backups/cqa-<ngày>-<giờ>.sql.gz`, kiểm tra file nén không hỏng và không rỗng trước khi giữ lại, rồi xoá các bản cũ hơn 14 ngày.

Điều chỉnh bằng biến môi trường:

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `CQA_ENV_FILE` | `<thư mục script>/../.env` | File `.env` để đọc mật khẩu root MySQL và tên database |
| `CQA_BACKUP_DIR` | `$HOME/cqa-backups` | Nơi chứa bản dump |
| `CQA_BACKUP_KEEP_DAYS` | `14` | Giữ bản dump bao nhiêu ngày |
| `CQA_DB_CONTAINER` | `cqa-db` | Tên container MySQL |

### Chạy theo lịch

```bash
# crontab -e — 2h sáng hằng ngày
0 2 * * * $HOME/cqa/scripts/backup-db.sh >> $HOME/cqa/backup.log 2>&1
```

::: danger Bản dump KHÔNG chứa ENCRYPTION_KEY
Credential của các kênh (Pancake, Zalo OA, Facebook) nằm trong database ở dạng đã mã hoá AES-256-GCM. Khoá giải mã là `ENCRYPTION_KEY` trong file `.env`, **không** nằm trong bản dump.

Khôi phục database mà không có đúng khoá cũ thì mọi kênh vẫn phải nối lại từ đầu. Sao lưu cả `.env` ra nơi khác — và để ở chỗ khác với bản dump.
:::

### Đưa bản sao lưu ra khỏi máy chủ

Bản dump nằm cùng máy với database thì không cứu được bạn khi mất máy. Copy về máy khác, ví dụ:

```bash
rsync -avz --remove-source-files vps:~/cqa-backups/ ~/cqa-backups-offsite/
```

## Khôi phục

```bash
gunzip < cqa-2026-07-28-0200.sql.gz | docker exec -i cqa-db mysql -u root -p"$MYSQL_ROOT_PASSWORD" cqa
```

::: warning Backup chưa restore thử thì chưa gọi là backup
Hãy thử khôi phục vào một database rỗng ít nhất một lần, trước khi bạn thật sự cần tới nó.
:::
