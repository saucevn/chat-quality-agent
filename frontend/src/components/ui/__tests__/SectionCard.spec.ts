// Test hành vi của SectionCard: header chỉ hiện khi có title HOẶC slot
// actions; slot mặc định luôn render bất kể header có hay không.
// Header thực chất là CardHeader.vue (dùng chung với DataTable) nên selector
// DOM là '.card-header', không phải '.section-card__header' (tên cũ, trước
// khi tách header thành component riêng).
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SectionCard from '../SectionCard.vue'
import { mountOptions } from './helpers'

describe('SectionCard', () => {
  it('không render header khi không có title và không có slot actions', () => {
    const w = mount(SectionCard, {
      ...mountOptions(),
      slots: { default: '<p data-test="body">Nội dung</p>' },
    })
    expect(w.find('.card-header').exists()).toBe(false)
    expect(w.find('[data-test="body"]').exists()).toBe(true)
  })

  it('render header khi có title dù không có slot actions', () => {
    const w = mount(SectionCard, {
      ...mountOptions(),
      props: { title: 'Cấu hình đồng bộ' },
      slots: { default: '<p data-test="body">Nội dung</p>' },
    })
    expect(w.find('.card-header').exists()).toBe(true)
    expect(w.find('h2').text()).toBe('Cấu hình đồng bộ')
  })

  it('render header khi có slot actions dù không có title', () => {
    const w = mount(SectionCard, {
      ...mountOptions(),
      slots: {
        default: '<p data-test="body">Nội dung</p>',
        actions: '<button data-test="action-btn">Sửa</button>',
      },
    })
    expect(w.find('.card-header').exists()).toBe(true)
    expect(w.find('[data-test="action-btn"]').exists()).toBe(true)
  })

  it('slot mặc định luôn render bất kể có header hay không', () => {
    const withHeader = mount(SectionCard, {
      ...mountOptions(),
      props: { title: 'x', subtitle: 'y' },
      slots: { default: '<p data-test="body">Nội dung</p>' },
    })
    expect(withHeader.find('[data-test="body"]').exists()).toBe(true)

    const withoutHeader = mount(SectionCard, {
      ...mountOptions(),
      slots: { default: '<p data-test="body">Nội dung</p>' },
    })
    expect(withoutHeader.find('[data-test="body"]').exists()).toBe(true)
  })

  // Vá lỗ hổng Contract 3: `icon`/`iconColor` phải chuyển tiếp được xuống
  // CardHeader — SectionCard không tự vẽ icon, chỉ forward prop.
  it('chuyển tiếp icon/iconColor xuống CardHeader dùng chung', () => {
    const w = mount(SectionCard, {
      ...mountOptions(),
      props: { title: 'Chi phí AI', icon: 'mdi-currency-usd', iconColor: 'warning' },
      slots: { default: '<p data-test="body">Nội dung</p>' },
    })
    const icon = w.find('.v-icon')
    expect(icon.exists()).toBe(true)
    expect(icon.classes()).toContain('mdi-currency-usd')
    expect(icon.classes()).toContain('text-warning')
  })
})
