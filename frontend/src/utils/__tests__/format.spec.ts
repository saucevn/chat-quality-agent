import { describe, it, expect, afterEach, vi } from 'vitest'
import { vnd, vndShort, pct, usd, dateTable, dateWithTime, dateRelative } from '../format'

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

// dateRelative gọi Date.now() nội bộ nên phải giả lập đồng hồ hệ thống —
// nếu không test sẽ nhấp nháy tuỳ thời điểm chạy thật.
describe('dateRelative — 5 nhánh và các ranh giới', () => {
  // Giờ hệ thống giả lập, dùng chung cho mọi test trong khối này.
  const now = new Date(2026, 2, 9, 14, 5, 0, 0)

  afterEach(() => {
    vi.useRealTimers()
  })

  it('nhánh "vừa xong": dưới 1 phút, kể cả sát ranh giới 59,999s', () => {
    vi.useFakeTimers()
    vi.setSystemTime(now)
    expect(dateRelative(new Date(now.getTime()))).toBe('vừa xong')
    expect(dateRelative(new Date(now.getTime() - 59999))).toBe('vừa xong')
  })

  it('ranh giới mins=1: vừa qua mốc 1 phút thì hiện "1 phút trước"', () => {
    vi.useFakeTimers()
    vi.setSystemTime(now)
    expect(dateRelative(new Date(now.getTime() - 60000))).toBe('1 phút trước')
  })

  it('ranh giới mins=59→60: 59 vẫn là phút, 60 chuyển sang giờ', () => {
    vi.useFakeTimers()
    vi.setSystemTime(now)
    expect(dateRelative(new Date(now.getTime() - 59 * 60000))).toBe('59 phút trước')
    expect(dateRelative(new Date(now.getTime() - 60 * 60000))).toBe('1 giờ trước')
  })

  it('ranh giới hours=23→24: 23 vẫn là giờ, 24 chuyển sang ngày', () => {
    vi.useFakeTimers()
    vi.setSystemTime(now)
    expect(dateRelative(new Date(now.getTime() - 23 * 3600000))).toBe('23 giờ trước')
    expect(dateRelative(new Date(now.getTime() - 24 * 3600000))).toBe('1 ngày trước')
  })

  it('ranh giới days=29→30: 29 vẫn là ngày, 30 rơi về định dạng dateTable', () => {
    vi.useFakeTimers()
    vi.setSystemTime(now)
    expect(dateRelative(new Date(now.getTime() - 29 * 86400000))).toBe('29 ngày trước')
    const d30 = new Date(now.getTime() - 30 * 86400000)
    // Ở mốc 30 ngày, hàm rơi hẳn về dateTable — so khớp với chính dateTable
    // để không phụ thuộc vào cách tính chuỗi ngày/tháng/năm thủ công.
    expect(dateRelative(d30)).toBe(dateTable(d30))
  })
})
