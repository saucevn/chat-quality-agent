// Định dạng số/tiền/ngày theo quy ước tiếng Việt — ERP design system §5.4.
// Dấu CHẤM phân cách nghìn, dấu PHẨY thập phân. Phần trăm nhỏ hơn 0,1% hiện
// "<0,1%" chứ không làm tròn về "0,0%" — làm tròn khiến người đọc tưởng bằng
// không.
const VND = new Intl.NumberFormat('vi-VN', {
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
 * "2.847.621.000 ₫"
 *
 * `Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })` chèn
 * U+00A0 (non-breaking space) trước "₫" thay vì dấu cách thường (U+0020).
 * Đặc tả và test đều dùng dấu cách thường, nên chuẩn hoá lại ở đây.
 */
export function vnd(n: number): string {
  return VND.format(n).replace(/ /g, ' ')
}

/** "2,85 tỷ" · "384,7 tr" · "14k" · "942" */
export function vndShort(n: number): string {
  const comma = (v: number, d: number) => v.toFixed(d).replace('.', ',')
  if (Math.abs(n) >= 1e9) return `${comma(n / 1e9, 2)} tỷ`
  if (Math.abs(n) >= 1e6) return `${comma(n / 1e6, 1)} tr`
  if (Math.abs(n) >= 1e3) return `${Math.round(n / 1e3)}k`
  return String(n)
}

/** "18,4%" — số dương nhỏ hơn 0,1 trả "<0,1%" */
export function pct(n: number, decimals = 1): string {
  if (n > 0 && n < 0.1) return '<0,1%'
  return `${n.toFixed(decimals).replace('.', ',')}%`
}

/** "$12.35" — chi phí AI tính bằng đô, giữ quy ước Mỹ */
export function usd(n: number): string {
  return USD.format(n)
}

const pad = (n: number) => String(n).padStart(2, '0')
const toDate = (d: string | Date) => (d instanceof Date ? d : new Date(d))

/** "09/03/2026" */
export function dateTable(d: string | Date): string {
  const x = toDate(d)
  return `${pad(x.getDate())}/${pad(x.getMonth() + 1)}/${x.getFullYear()}`
}

/** "09/03/2026 lúc 14:05" */
export function dateWithTime(d: string | Date): string {
  const x = toDate(d)
  return `${dateTable(x)} lúc ${pad(x.getHours())}:${pad(x.getMinutes())}`
}

/** "3 phút trước" · "2 ngày trước" — tên tháng/thứ không viết hoa (§5.4) */
export function dateRelative(d: string | Date): string {
  const mins = Math.floor((Date.now() - toDate(d).getTime()) / 60000)
  if (mins < 1) return 'vừa xong'
  if (mins < 60) return `${mins} phút trước`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} giờ trước`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} ngày trước`
  return dateTable(d)
}
