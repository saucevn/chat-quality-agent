#!/usr/bin/env bash
# =============================================================================
# Sao lưu MySQL của CQA ra .sql.gz, tự xoá bản cũ.
# =============================================================================
# Chạy tay:
#   ./scripts/backup-db.sh
#
# Chạy theo lịch (crontab -e), 2h sáng hằng ngày:
#   0 2 * * * $HOME/cqa/scripts/backup-db.sh >> $HOME/cqa/backup.log 2>&1
#
# Biến điều chỉnh được (đều có mặc định):
#   CQA_ENV_FILE         mặc định <thư mục script>/../.env
#   CQA_BACKUP_DIR       mặc định $HOME/cqa-backups
#   CQA_BACKUP_KEEP_DAYS mặc định 14
#   CQA_DB_CONTAINER     mặc định cqa-db
#
# LƯU Ý: bản dump KHÔNG chứa ENCRYPTION_KEY. Có DB mà mất key thì toàn bộ
# credential kênh (Pancake/Zalo/Facebook) vẫn không giải mã được. Sao lưu cả
# .env ra nơi khác.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${CQA_ENV_FILE:-$SCRIPT_DIR/../.env}"
BACKUP_DIR="${CQA_BACKUP_DIR:-$HOME/cqa-backups}"
KEEP_DAYS="${CQA_BACKUP_KEEP_DAYS:-14}"
CONTAINER="${CQA_DB_CONTAINER:-cqa-db}"

die() { echo "[backup-db] LỖI: $*" >&2; exit 1; }

[ -f "$ENV_FILE" ] || die "không thấy file env: $ENV_FILE"

# Bới đúng hai khoá cần thay vì `source .env`: file .env có thể chứa giá trị
# nhiều dấu ngoặc/ký tự lạ, source vào là shell diễn giải nhầm.
read_env() {
  grep -E "^$1=" "$ENV_FILE" | head -1 | cut -d= -f2- | sed 's/^"//; s/"$//'
}

MYSQL_ROOT_PASSWORD="$(read_env MYSQL_ROOT_PASSWORD)"
DB_NAME="$(read_env DB_NAME)"
DB_NAME="${DB_NAME:-cqa}"

[ -n "$MYSQL_ROOT_PASSWORD" ] || die "MYSQL_ROOT_PASSWORD rỗng trong $ENV_FILE"
docker inspect -f '{{.State.Running}}' "$CONTAINER" 2>/dev/null | grep -q true \
  || die "container $CONTAINER không chạy"

mkdir -p "$BACKUP_DIR"
OUT="$BACKUP_DIR/cqa-$(date +%F-%H%M).sql.gz"
TMP="$OUT.partial"
trap 'rm -f "$TMP"' EXIT

# MYSQL_PWD thay cho -p<pass>: mật khẩu không lọt vào `ps` trong container.
# set -o pipefail đảm bảo mysqldump hỏng thì cả pipeline hỏng, không đẻ ra
# file .gz hợp lệ nhưng rỗng ruột.
docker exec -e MYSQL_PWD="$MYSQL_ROOT_PASSWORD" "$CONTAINER" \
  mysqldump -u root \
    --single-transaction --quick --routines --triggers \
    --default-character-set=utf8mb4 \
    "$DB_NAME" \
  | gzip > "$TMP"

gzip -t "$TMP" || die "file nén hỏng, giữ nguyên bản cũ"
[ -s "$TMP" ] || die "dump rỗng"

mv "$TMP" "$OUT"
trap - EXIT

find "$BACKUP_DIR" -name 'cqa-*.sql.gz' -mtime "+$KEEP_DAYS" -delete

echo "[backup-db] $(date -Is) OK $OUT ($(du -h "$OUT" | cut -f1))"
