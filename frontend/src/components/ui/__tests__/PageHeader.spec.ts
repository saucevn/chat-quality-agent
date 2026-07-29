// Test hành vi của PageHeader: subtitle/breadcrumbs chỉ hiện khi được truyền,
// slot actions luôn render nội dung được đưa vào.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PageHeader from '../PageHeader.vue'
import { mountOptions } from './helpers'

describe('PageHeader', () => {
  it('render subtitle khi có prop subtitle, không render khi thiếu', () => {
    const withSub = mount(PageHeader, {
      ...mountOptions(),
      props: { title: 'Kênh chat', subtitle: 'Quản lý kết nối' },
    })
    expect(withSub.find('h1').text()).toBe('Kênh chat')
    expect(withSub.find('p').exists()).toBe(true)
    expect(withSub.find('p').text()).toBe('Quản lý kết nối')

    const noSub = mount(PageHeader, { ...mountOptions(), props: { title: 'Kênh chat' } })
    expect(noSub.find('h1').text()).toBe('Kênh chat')
    expect(noSub.find('p').exists()).toBe(false)
  })

  it('render breadcrumbs chỉ khi có mảng breadcrumbs không rỗng', () => {
    const withCrumbs = mount(PageHeader, {
      ...mountOptions(),
      props: {
        title: 'Chi tiết kênh',
        breadcrumbs: [{ title: 'Trang chủ', to: '/' }, { title: 'Kênh chat' }],
      },
    })
    expect(withCrumbs.find('.v-breadcrumbs').exists()).toBe(true)

    const noCrumbs = mount(PageHeader, { ...mountOptions(), props: { title: 'x' } })
    expect(noCrumbs.find('.v-breadcrumbs').exists()).toBe(false)

    const emptyCrumbs = mount(PageHeader, {
      ...mountOptions(),
      props: { title: 'x', breadcrumbs: [] },
    })
    expect(emptyCrumbs.find('.v-breadcrumbs').exists()).toBe(false)
  })

  it('render nội dung slot actions', () => {
    const w = mount(PageHeader, {
      ...mountOptions(),
      props: { title: 'x' },
      slots: { actions: '<button data-test="action-btn">Thêm kênh</button>' },
    })
    expect(w.find('[data-test="action-btn"]').exists()).toBe(true)
    expect(w.find('[data-test="action-btn"]').text()).toBe('Thêm kênh')
  })
})
