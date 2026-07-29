// Ánh xạ lỗi backend sang thông báo người đọc được — ERP design system §5.3.
// Quy tắc tuyệt đối: KHÔNG BAO GIỜ hiện message raw của backend cho người
// dùng (anti-pattern #10). Mọi mã lạ đều quy về 'system.internal'.
const KNOWN = new Set([
  'auth.login.invalid_credentials',
  'auth.token.expired',
  'validation.required',
  'system.rate_limit',
  'system.internal',
])

/** Rút mã lỗi đã biết; mọi thứ khác quy về 'system.internal'. */
export function errorCode(err: unknown): string {
  const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code
  return code && KNOWN.has(code) ? code : 'system.internal'
}

/**
 * Khoá i18n tương ứng, để view gọi t(errorKey(err)).
 * Tách khỏi errorCode để test được mà không cần dựng i18n.
 */
export function errorKey(err: unknown): string {
  return `err_${errorCode(err).replace(/\./g, '_')}`
}
