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
})
