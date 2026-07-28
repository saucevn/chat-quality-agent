#!/usr/bin/env bash
# =============================================================================
# Kiểm tra VPS trước khi deploy CQA. CHỈ ĐỌC — không sửa gì trên máy.
# =============================================================================
#   ./scripts/vps-preflight.sh [domain]
#
# Ví dụ:  ./scripts/vps-preflight.sh cqa.example.com
#
# Trả về 1 nếu có mục FAIL. Mục WARN không chặn nhưng nên đọc.

set -uo pipefail

DOMAIN="${1:-${LEGO_DOMAIN:-}}"
FAILED=0

ok()   { printf '  \033[0;32mOK\033[0m    %s\n' "$*"; }
warn() { printf '  \033[1;33mWARN\033[0m  %s\n' "$*"; }
fail() { printf '  \033[0;31mFAIL\033[0m  %s\n' "$*"; FAILED=1; }

echo "== Docker =="
if command -v docker >/dev/null 2>&1; then
  ok "docker $(docker --version | awk '{print $3}' | tr -d ,)"
  if docker info >/dev/null 2>&1; then
    ok "docker daemon chạy, user hiện tại dùng được (không cần sudo)"
  else
    fail "không gọi được docker daemon — thiếu quyền? cần 'sudo usermod -aG docker \$USER' rồi đăng nhập lại"
  fi
else
  fail "chưa cài docker"
fi

if docker compose version >/dev/null 2>&1; then
  ok "compose plugin $(docker compose version --short 2>/dev/null)"
else
  fail "thiếu docker compose plugin (v2). 'docker-compose' bản v1 KHÔNG chạy được file compose này"
fi

echo
echo "== Tài nguyên =="
if command -v free >/dev/null 2>&1; then
  TOTAL_MB=$(free -m | awk '/^Mem:/{print $2}')
  AVAIL_MB=$(free -m | awk '/^Mem:/{print $7}')
  SWAP_MB=$(free -m | awk '/^Swap:/{print $2}')
  echo "  RAM tổng ${TOTAL_MB}MB · còn trống ${AVAIL_MB}MB · swap ${SWAP_MB}MB"
  # CQA lúc chạy cần ~1.4GB (mem_limit: 768+512+128). Lúc BUILD còn cần thêm
  # cho `vue-tsc -b && vite build` — chỗ này mới là nút thắt.
  if [ "$AVAIL_MB" -lt 1500 ]; then
    if [ "$SWAP_MB" -lt 2048 ]; then
      fail "còn ${AVAIL_MB}MB, swap ${SWAP_MB}MB — build frontend nhiều khả năng bị OOM-kill. Thêm swap hoặc build ở máy khác (xem runbook)"
    else
      warn "còn ${AVAIL_MB}MB nhưng có ${SWAP_MB}MB swap — build sẽ chậm nhưng nhiều khả năng qua"
    fi
  else
    ok "đủ RAM để vừa build vừa chạy"
  fi
else
  warn "không có lệnh 'free', bỏ qua kiểm RAM"
fi

DISK_AVAIL_G=$(df -BG --output=avail / 2>/dev/null | tail -1 | tr -dc '0-9')
if [ -n "$DISK_AVAIL_G" ]; then
  echo "  Đĩa / còn trống ${DISK_AVAIL_G}GB"
  # ~2GB image + build cache Go/npm + volume MySQL + log.
  if [ "$DISK_AVAIL_G" -lt 10 ]; then
    fail "dưới 10GB — build cache Docker sẽ ăn hết. Dọn bằng 'docker system prune -a' hoặc mở rộng đĩa"
  else
    ok "đủ đĩa"
  fi
fi

echo
echo "== Cổng CQA cần =="
port_busy() {
  if command -v ss >/dev/null 2>&1; then
    ss -ltnH "sport = :$1" 2>/dev/null | grep -q . && return 0
  elif command -v netstat >/dev/null 2>&1; then
    netstat -ltn 2>/dev/null | awk '{print $4}' | grep -qE "[:.]$1\$" && return 0
  fi
  return 1
}

WEB_PORT_BUSY=0
for p in 80 443; do
  if port_busy "$p"; then
    WEB_PORT_BUSY=1
    fail ":$p đang bị chiếm. Xem ai giữ: sudo ss -ltnp 'sport = :$p'"
  else
    ok ":$p trống"
  fi
done

if [ "$WEB_PORT_BUSY" -eq 1 ]; then
  warn "Máy đã có reverse proxy — ĐỪNG giành 80/443 của nó. Cách đi: đặt"
  warn "HTTP_PORT/HTTPS_PORT trong .env, ĐỂ TRỐNG LEGO_DOMAIN (để proxy sẵn có lo"
  warn "TLS), rồi khai báo CQA ở proxy đó. Xem mục 'Khi 80/443 đã bị chiếm' trong runbook."
fi

if port_busy 3306; then
  warn ":3306 đang bị chiếm — đặt DB_PORT_HOST=3307 (hoặc số khác) trong .env"
else
  ok ":3306 trống"
fi

echo
echo "== Va chạm với container sẵn có =="
for n in cqa-nginx cqa-app cqa-db; do
  if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -qx "$n"; then
    fail "đã có container tên '$n' — xoá hoặc đổi container_name trước khi up"
  fi
done
docker ps -a --format '{{.Names}}' 2>/dev/null | grep -qxE 'cqa-(nginx|app|db)' || ok "không trùng tên container"

PUBLIC_PORTS=$(docker ps --format '{{.Names}}\t{{.Ports}}' 2>/dev/null | grep '0\.0\.0\.0:' || true)
if [ -n "$PUBLIC_PORTS" ]; then
  warn "các container sau đang publish ra 0.0.0.0 (mở với Internet):"
  echo "$PUBLIC_PORTS" | sed 's/^/          /'
  warn "ufw KHÔNG chặn được chúng — Docker chèn iptables trước chuỗi của ufw. Xem mục tường lửa trong runbook."
fi

echo
echo "== DNS =="
if [ -z "$DOMAIN" ]; then
  warn "chưa truyền domain — bỏ qua. Dùng: $0 cqa.example.com"
else
  RESOLVED=$(dig +short "$DOMAIN" A 2>/dev/null | tail -1)
  # -4 là bắt buộc: máy có IPv6 thì ifconfig.me trả về địa chỉ v6, đem so với
  # bản ghi A (v4) sẽ báo lệch oan.
  PUBIP4=$(curl -4 -s --max-time 5 https://ifconfig.me 2>/dev/null)
  echo "  $DOMAIN (bản ghi A) -> ${RESOLVED:-(không phân giải được)}"
  echo "  IPv4 công khai của máy này -> ${PUBIP4:-(không lấy được)}"
  if [ -z "$RESOLVED" ]; then
    fail "DNS chưa trỏ. lego sẽ thất bại và nginx vào vòng lặp crash — thêm A record TRƯỚC khi bật SSL"
  elif [ -z "$PUBIP4" ]; then
    warn "không lấy được IPv4 của máy — tự đối chiếu $RESOLVED bằng tay (ip -4 addr)"
  elif [ "$RESOLVED" != "$PUBIP4" ]; then
    fail "DNS trỏ về $RESOLVED nhưng IPv4 máy này là $PUBIP4. Nếu đang bật proxy Cloudflare (mây cam), tắt về 'DNS only' để lấy chứng chỉ lần đầu"
  else
    ok "DNS khớp IPv4 máy này"
  fi
fi

echo
if [ "$FAILED" -eq 0 ]; then
  echo "Không có mục FAIL. Đọc kỹ các WARN rồi tiếp tục theo runbook."
else
  echo "Có mục FAIL — xử lý xong hãy deploy."
fi
exit "$FAILED"
