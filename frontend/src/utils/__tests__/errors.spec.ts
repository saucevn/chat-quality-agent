import { describe, it, expect } from 'vitest'
import { errorCode, errorKey } from '../errors'

describe('errorCode', () => {
  it('lấy mã lỗi đã biết từ phản hồi axios', () => {
    expect(errorCode({ response: { data: { code: 'auth.token.expired' } } }))
      .toBe('auth.token.expired')
  })

  it('quy mọi lỗi lạ về system.internal — KHÔNG lộ message raw của backend', () => {
    expect(errorCode(new Error('pq: duplicate key value violates unique constraint')))
      .toBe('system.internal')
    expect(errorCode(undefined)).toBe('system.internal')
  })

  it('errorKey đổi dấu chấm thành gạch dưới để tra i18n', () => {
    expect(errorKey({ response: { data: { code: 'system.rate_limit' } } }))
      .toBe('err_system_rate_limit')
  })
})
