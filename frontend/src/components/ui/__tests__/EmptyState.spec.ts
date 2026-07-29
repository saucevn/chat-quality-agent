import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import EmptyState from '../EmptyState.vue'
import { mountOptions } from './helpers'

describe('EmptyState', () => {
  it('hiện đủ 3 yếu tố bắt buộc: icon, tiêu đề, hành động', () => {
    const w = mount(EmptyState, {
      ...mountOptions(),
      props: { title: 'Chưa có kênh nào', actionLabel: 'Kết nối kênh đầu tiên' },
    })
    expect(w.find('.v-icon').exists()).toBe(true)
    expect(w.text()).toContain('Chưa có kênh nào')
    expect(w.text()).toContain('Kết nối kênh đầu tiên')
  })

  it('phát sự kiện action khi bấm nút', async () => {
    const w = mount(EmptyState, {
      ...mountOptions(),
      props: { title: 'x', actionLabel: 'Thử lại' },
    })
    await w.find('button').trigger('click')
    expect(w.emitted('action')).toHaveLength(1)
  })

  it('variant error dùng nút outlined, variant khác dùng nút flat', () => {
    const err = mount(EmptyState, {
      ...mountOptions(),
      props: { title: 'x', actionLabel: 'y', variant: 'error' as const },
    })
    const first = mount(EmptyState, {
      ...mountOptions(),
      props: { title: 'x', actionLabel: 'y', variant: 'first-run' as const },
    })
    expect(err.find('button').classes()).toContain('v-btn--variant-outlined')
    expect(first.find('button').classes()).toContain('v-btn--variant-flat')
  })

  it('không render mô tả khi không truyền', () => {
    const w = mount(EmptyState, { ...mountOptions(), props: { title: 'x' } })
    expect(w.find('[data-test="description"]').exists()).toBe(false)
  })

  // Chốt ở tầng KIỂU, không phải tầng chạy. Bảng "Quy tắc 4 trạng thái" bắt
  // nhánh lỗi phải có nút thử lại và cấm nuốt lỗi; với `actionLabel?` optional
  // thì một trạng thái lỗi câm vẫn qua `vue-tsc` sạch sẽ.
  //
  // Nếu ai đó nới union về lại một khối phẳng, `@ts-expect-error` dưới đây
  // thành thừa và `vue-tsc -b` đỏ ngay tại dòng này với
  // `TS2578 Unused '@ts-expect-error' directive` — đúng chỗ reviewer nhìn thấy.
  it('variant error thiếu actionLabel là lỗi kiểu', () => {
    const w = mount(EmptyState, {
      ...mountOptions(),
      // @ts-expect-error -- cố ý thiếu actionLabel ở variant error
      props: { variant: 'error' as const, title: 'Không tải được dữ liệu' },
    })
    expect(w.exists()).toBe(true)
  })

  // Ca đối trọng: các variant khác VẪN được phép không có CTA (§3.2 cho phép
  // nhánh rỗng chỉ có số cụ thể). Nếu union siết nhầm cả hai nhánh thì ca này
  // đỏ ở tầng kiểu.
  it('variant không phải error vẫn được phép không có actionLabel', () => {
    const w = mount(EmptyState, {
      ...mountOptions(),
      props: { variant: 'no-data' as const, title: 'Không có kết quả nào khớp bộ lọc' },
    })
    expect(w.find('button').exists()).toBe(false)
  })
})
