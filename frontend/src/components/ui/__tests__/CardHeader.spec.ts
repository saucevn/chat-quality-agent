// Test hành vi của CardHeader — component NỘI BỘ dùng chung bởi SectionCard
// và DataTable (xem comment ở CardHeader.vue). Trước đợt vá này chỉ được test
// gián tiếp qua hai component đó; file này thêm test trực tiếp cho prop
// `icon`/`iconColor` (vá lỗ hổng Contract 3) — phần còn lại (title/subtitle/
// slot actions) vẫn được phủ qua SectionCard.spec.ts và DataTable.spec.ts như
// comment gốc của CardHeader.vue đã ghi.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CardHeader from '../CardHeader.vue'
import { mountOptions } from './helpers'

describe('CardHeader', () => {
  it('có icon ⇒ render đúng icon trước tiêu đề', () => {
    const w = mount(CardHeader, {
      ...mountOptions(),
      props: { title: 'Hoạt động gần đây', icon: 'mdi-bell-ring' },
    })
    expect(w.find('.v-icon').exists()).toBe(true)
    expect(w.find('.v-icon').classes()).toContain('mdi-bell-ring')
  })

  // Không để lại phần tử rỗng ăn chỗ: `v-if="icon"` phải loại hẳn <v-icon>
  // khỏi DOM khi không truyền icon, không phải render icon rỗng/ẩn bằng CSS.
  it('không có icon ⇒ không render v-icon nào, không ăn chỗ', () => {
    const w = mount(CardHeader, {
      ...mountOptions(),
      props: { title: 'Hoạt động gần đây' },
    })
    expect(w.find('.v-icon').exists()).toBe(false)
  })

  it('iconColor truyền tên token theme, không cần hex', () => {
    const w = mount(CardHeader, {
      ...mountOptions(),
      props: { title: 'Chi phí AI', icon: 'mdi-currency-usd', iconColor: 'warning' },
    })
    expect(w.find('.v-icon').classes()).toContain('text-warning')
  })
})
