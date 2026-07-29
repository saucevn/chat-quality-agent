// Định dạng số/tiền/ngày theo locale hiện tại của giao diện — ERP design
// system §5.4 quy định định dạng tiếng Việt (dấu CHẤM phân cách nghìn, dấu
// PHẨY thập phân); bản tiếng Anh dùng quy ước en-US (dấu PHẨY phân cách
// nghìn, dấu CHẤM thập phân). Phần trăm nhỏ hơn 0,1% hiện "<0,1%" (hoặc
// "<0.1%" ở bản Anh) chứ không làm tròn về "0,0%"/"0.0%" — làm tròn khiến
// người đọc tưởng bằng không.
//
// Locale lấy từ INSTANCE i18n toàn cục (../i18n/index.ts), KHÔNG phải tham
// số của từng hàm — quyết định có chủ ý để giữ nguyên chữ ký các hàm xuất ra
// (Contract không đổi), tránh việc 10+ story Phase 2 gọi thẳng các hàm này
// phải nhớ truyền locale (quên thì im lặng ra sai ngôn ngữ).
//
// Không có vòng lặp import: ../i18n/index.ts chỉ import các module dữ liệu
// thuần i18n/vi/*.ts và i18n/en/*.ts (object literal, không import gì khác),
// nên format.ts -> i18n -> i18n/vi,en không quay lại format.ts.
import i18n from '../i18n'

const isVi = () => i18n.global.locale.value === 'vi'

const VND_VI = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

const VND_EN = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

const USD = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/**
 * "2.847.621.000 ₫" (vi) · "₫2,847,621,000" (en)
 *
 * Tiền luôn là đồng Việt Nam bất kể ngôn ngữ giao diện — chỉ cách phân cách
 * và vị trí ký hiệu đổi theo locale, `currency` luôn là 'VND'.
 *
 * `Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })` chèn
 * U+00A0 (non-breaking space) trước "₫" thay vì dấu cách thường (U+0020).
 * Đặc tả và test đều dùng dấu cách thường, nên chuẩn hoá lại ở đây. Bản
 * en-US không chèn khoảng trắng nào trước ký hiệu (đã kiểm bằng `od -c`) nên
 * .replace là no-op ở nhánh đó, nhưng giữ chung một chỗ cho chắc.
 */
export function vnd(n: number): string {
  const formatted = isVi() ? VND_VI.format(n) : VND_EN.format(n)
  return formatted.replace(/ /g, ' ')
}

/** toFixed cố định số lẻ, đổi dấu thập phân theo locale (',' cho vi, '.' cho en) */
const decimal = (v: number, d: number): string => {
  const s = v.toFixed(d)
  return isVi() ? s.replace('.', ',') : s
}

/**
 * "2,85 tỷ" · "384,7 tr" · "14k" · "942" (vi) — "2.85B" · "384.7M" · "14K" ·
 * "942" (en).
 *
 * Khoảng trắng trước hậu tố chỉ áp dụng cho vi (giữ đúng convention cũ:
 * "2,85 tỷ" có cách, "14k" không) — bản en dùng lối viết compact number kiểu
 * Anh-Mỹ, không có khoảng trắng trước B/M/K.
 */
export function vndShort(n: number): string {
  const sep = isVi() ? ' ' : ''
  if (Math.abs(n) >= 1e9) return `${decimal(n / 1e9, 2)}${sep}${i18n.global.t('format_billion_suffix')}`
  if (Math.abs(n) >= 1e6) return `${decimal(n / 1e6, 1)}${sep}${i18n.global.t('format_million_suffix')}`
  if (Math.abs(n) >= 1e3) return `${Math.round(n / 1e3)}${i18n.global.t('format_thousand_suffix')}`
  return String(n)
}

/**
 * "18,4%" (vi) · "18.4%" (en) — số dương nhỏ hơn 0,1 trả "<0,1%"/"<0.1%".
 *
 * Dùng `Intl.NumberFormat` để lấy đúng dấu thập phân theo locale thay vì tự
 * nối chuỗi bằng `.replace('.', ',')` — cách cũ luôn ra dấu phẩy bất kể
 * locale, khiến bản tiếng Anh cũng hiện "18,4%" (sai).
 */
export function pct(n: number, decimals = 1): string {
  const fmt = new Intl.NumberFormat(isVi() ? 'vi-VN' : 'en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  if (n > 0 && n < 0.1) return `<${fmt.format(0.1)}%`
  return `${fmt.format(n)}%`
}

/** "$12.35" — chi phí AI tính bằng đô, luôn giữ quy ước Mỹ bất kể locale giao diện */
export function usd(n: number): string {
  return USD.format(n)
}

const pad = (n: number) => String(n).padStart(2, '0')
const toDate = (d: string | Date) => (d instanceof Date ? d : new Date(d))

/**
 * "09/03/2026" — `dd/MM/yyyy` ở **cả hai** locale, cố ý.
 *
 * Contract quy định `dd/MM/yyyy` không kèm ngoại lệ locale nào. Bản đầu của
 * đợt locale hoá đổi `en` sang `M/D/yyyy` cho "tự nhiên" kiểu Mỹ, nhưng
 * `3/9/2026` là **9 tháng 3** với người đọc Mỹ và **3 tháng 9** với người đọc
 * Việt. Đây là hệ thống chấm chất lượng CSKH cho thị trường Việt Nam: cùng một
 * mốc thời gian sẽ nằm cạnh báo cáo, log và dữ liệu backend vốn luôn
 * `dd/MM/yyyy`. Đọc nhầm ngày ở đó là sai nghiệp vụ, không phải bất tiện.
 *
 * Chỉ **chữ** đổi theo ngôn ngữ (xem `dateWithTime`, `dateRelative`); **số**
 * ngày tháng giữ một dạng duy nhất, không mơ hồ.
 */
export function dateTable(d: string | Date): string {
  const x = toDate(d)
  return `${pad(x.getDate())}/${pad(x.getMonth() + 1)}/${x.getFullYear()}`
}

/** "09/03/2026 lúc 14:05" (vi) · "09/03/2026 at 14:05" (en) */
export function dateWithTime(d: string | Date): string {
  const x = toDate(d)
  return `${dateTable(x)} ${i18n.global.t('format_at')} ${pad(x.getHours())}:${pad(x.getMinutes())}`
}

/**
 * "3 phút trước" · "2 ngày trước" (vi — không chia số ít/nhiều, §5.4) ·
 * "1 minute ago" · "3 minutes ago" (en — có số ít/nhiều qua pluralization
 * `{count}` của vue-i18n, xem i18n/en/format.ts).
 */
export function dateRelative(d: string | Date): string {
  const mins = Math.floor((Date.now() - toDate(d).getTime()) / 60000)
  if (mins < 1) return i18n.global.t('format_just_now')
  if (mins < 60) return i18n.global.t('format_minutes_ago', { count: mins }, mins)
  const hours = Math.floor(mins / 60)
  if (hours < 24) return i18n.global.t('format_hours_ago', { count: hours }, hours)
  const days = Math.floor(hours / 24)
  if (days < 30) return i18n.global.t('format_days_ago', { count: days }, days)
  return dateTable(d)
}
