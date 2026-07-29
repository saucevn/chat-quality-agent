import { describe, it, expect } from 'vitest'
import { vnd, vndShort, pct, usd, dateTable, dateWithTime } from '../format'

describe('format vi-VN', () => {
  it('vnd dùng dấu chấm phân cách nghìn, không phần thập phân', () => {
    expect(vnd(2847621000)).toBe('2.847.621.000 ₫')
    expect(vnd(0)).toBe('0 ₫')
  })

  it('vndShort rút gọn tỷ / triệu / nghìn, dấu phẩy thập phân', () => {
    expect(vndShort(2847621000)).toBe('2,85 tỷ')
    expect(vndShort(384700000)).toBe('384,7 tr')
    expect(vndShort(14000)).toBe('14k')
    expect(vndShort(942)).toBe('942')
  })

  it('pct dùng dấu phẩy thập phân', () => {
    expect(pct(18.4)).toBe('18,4%')
    expect(pct(100)).toBe('100,0%')
  })

  it('pct hiện <0,1% thay vì làm tròn về 0,0%', () => {
    expect(pct(0.07)).toBe('<0,1%')
    expect(pct(0)).toBe('0,0%')
  })

  it('dateTable là dd/MM/yyyy, dateWithTime kèm giờ', () => {
    const d = new Date('2026-03-09T14:05:00')
    expect(dateTable(d)).toBe('09/03/2026')
    expect(dateWithTime(d)).toBe('09/03/2026 lúc 14:05')
  })

  it('usd giữ 2 số lẻ kiểu Mỹ — dùng cho chi phí AI', () => {
    expect(usd(12.3456)).toBe('$12.35')
  })
})
