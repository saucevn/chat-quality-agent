// Test hành vi của KpiGrid — DS §3.1 CẤM #3: lưới KPI không được quá 5 thẻ.
// KpiGrid tự cảnh báo qua console.warn trong onMounted; test này chốt lại
// ranh giới đó (> 5 phải cảnh báo, <= 5 thì không) để không âm thầm trôi mất.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import KpiGrid from '../KpiGrid.vue'
import { mountOptions } from './helpers'

describe('KpiGrid', () => {
  afterEach(() => {
    // mockRestore để spy không rò sang test khác và output test còn sạch.
    vi.restoreAllMocks()
  })

  // Lọc theo tiền tố `[KpiGrid]` thay vì đếm tổng số lần gọi: Vue tự phát một
  // cảnh báo dev-mode khác không liên quan ("Slot default invoked outside of
  // render function") mỗi khi component gọi `slots.default?.()` trong
  // onMounted — không phải lỗi do sửa này gây ra, và không nằm trong phạm vi
  // sửa ở đây. Lọc theo tiền tố giữ test không phụ thuộc vào chi tiết nội bộ
  // đó trong khi vẫn chốt đúng hành vi cảnh báo của KpiGrid.
  it('cảnh báo console.warn khi có hơn 5 thẻ trong lưới', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mount(KpiGrid, {
      ...mountOptions(),
      slots: {
        default: Array.from({ length: 6 }, (_, i) => `<div data-test="card">${i}</div>`).join(''),
      },
    })
    const kpiWarnings = warnSpy.mock.calls.filter((args) => String(args[0]).includes('[KpiGrid]'))
    expect(kpiWarnings).toHaveLength(1)
  })

  it('không cảnh báo khi có đúng 5 thẻ hoặc ít hơn', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mount(KpiGrid, {
      ...mountOptions(),
      slots: {
        default: Array.from({ length: 5 }, (_, i) => `<div data-test="card">${i}</div>`).join(''),
      },
    })
    const kpiWarnings = warnSpy.mock.calls.filter((args) => String(args[0]).includes('[KpiGrid]'))
    expect(kpiWarnings).toHaveLength(0)
  })
})
