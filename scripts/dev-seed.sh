#!/usr/bin/env bash
# =============================================================================
# Chat Quality Agent - Seed dữ liệu cho DEV LOCAL
# =============================================================================
# Tạo tài khoản admin đầu tiên, tạo tenant, rồi nạp dữ liệu demo.
# Backend phải đang chạy (make dev / make backend).
#
# Dùng: make seed
#
# Luồng API (xem backend/api/router.go):
#   GET  /api/v1/setup/status                    -> còn cần setup không
#   POST /api/v1/setup                           -> tạo admin (chỉ khi chưa có user)
#   POST /api/v1/auth/login                      -> lấy access_token
#   POST /api/v1/tenants                         -> tạo tenant, trả về id
#   POST /api/v1/tenants/{id}/demo/import        -> nạp demo data

set -euo pipefail

cd "$(dirname "$0")/.."

ENV_FILE=".env.dev"
[[ -f "$ENV_FILE" ]] || { echo "Không tìm thấy $ENV_FILE"; exit 1; }

# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a

BASE="http://${SERVER_HOST:-127.0.0.1}:${SERVER_PORT:-8080}"
API="$BASE/api/v1"
EMAIL="${DEV_ADMIN_EMAIL:-dev@localhost.local}"
PASSWORD="${DEV_ADMIN_PASSWORD:-DevPass123}"
TENANT_NAME="${DEV_TENANT_NAME:-Dev Workspace}"
TENANT_SLUG="${DEV_TENANT_SLUG:-dev-workspace}"

# Trích 1 field string từ JSON phẳng, không cần jq.
# Trả về chuỗi rỗng khi không khớp - grep exit 1 sẽ giết script vì `set -e pipefail`.
json_str() {
  local matched
  matched=$(grep -o "\"$1\":\"[^\"]*\"" || true)
  printf '%s' "$matched" | head -1 | cut -d'"' -f4
}

echo "==> Kiểm tra backend tại $BASE"
if ! curl -fsS --max-time 5 "$BASE/health" >/dev/null 2>&1; then
  echo "Backend chưa chạy. Mở terminal khác và chạy: make dev"
  exit 1
fi

echo "==> Trạng thái setup"
STATUS=$(curl -fsS "$API/setup/status")
if [[ "$STATUS" == *'"needs_setup":true'* ]]; then
  echo "    Chưa có user -> tạo admin $EMAIL"
  RESP=$(curl -fsS -X POST "$API/setup" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"name\":\"Dev Admin\"}")
else
  echo "    Đã có user -> đăng nhập $EMAIL"
  RESP=$(curl -fsS -X POST "$API/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
fi
TOKEN=$(printf '%s' "$RESP" | json_str access_token)

[[ -n "$TOKEN" ]] || { echo "Không lấy được access_token. Response: $RESP"; exit 1; }
AUTH="Authorization: Bearer $TOKEN"

echo "==> Tenant"
TENANTS=$(curl -fsS "$API/tenants" -H "$AUTH")
TENANT_ID=$(printf '%s' "$TENANTS" | json_str id)

if [[ -z "$TENANT_ID" ]]; then
  echo "    Chưa có tenant -> tạo \"$TENANT_NAME\""
  RESP=$(curl -fsS -X POST "$API/tenants" \
    -H 'Content-Type: application/json' -H "$AUTH" \
    -d "{\"name\":\"$TENANT_NAME\",\"slug\":\"$TENANT_SLUG\"}")
  TENANT_ID=$(printf '%s' "$RESP" | json_str id)
  [[ -n "$TENANT_ID" ]] || { echo "Không tạo được tenant. Response: $RESP"; exit 1; }
fi
echo "    tenant_id = $TENANT_ID"

echo "==> Dữ liệu demo"
DEMO=$(curl -fsS "$API/tenants/$TENANT_ID/demo/status" -H "$AUTH")
if [[ "$DEMO" == *'"has_data":true'* ]]; then
  echo "    Tenant đã có dữ liệu, bỏ qua (dùng 'make db-reset' để làm lại từ đầu)"
else
  curl -fsS -X POST "$API/tenants/$TENANT_ID/demo/import" -H "$AUTH" >/dev/null
  echo "    Đã nạp xong dữ liệu demo"
fi

cat <<EOF

-----------------------------------------------
 Sẵn sàng. Mở http://localhost:3000 và đăng nhập:

   Email:    $EMAIL
   Mật khẩu: $PASSWORD
-----------------------------------------------
EOF
