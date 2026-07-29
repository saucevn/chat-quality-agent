// Chuỗi hiển thị dùng trong utils/format.ts — tách riêng vì đây là phần duy
// nhất trong Contract định dạng số/ngày còn khoá cứng tiếng Việt trong app
// song ngữ. Xem research/plans/... (nếu có) hoặc utils/format.ts để biết lý
// do format.ts đọc locale từ instance i18n thay vì nhận tham số.
export default {
  format_at: 'lúc',
  format_just_now: 'vừa xong',
  // Tiếng Việt không chia số ít/nhiều (DS §5.4) — chỉ một dạng, không cần "|".
  format_minutes_ago: '{count} phút trước',
  format_hours_ago: '{count} giờ trước',
  format_days_ago: '{count} ngày trước',
  format_billion_suffix: 'tỷ',
  format_million_suffix: 'tr',
  format_thousand_suffix: 'k',
}
