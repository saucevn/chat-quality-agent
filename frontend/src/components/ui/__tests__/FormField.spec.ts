// Test hành vi của FormField — DS §2.3/§3.4: thứ tự dọc bắt buộc
// Label → Field → Helper → Error, và Error THAY THẾ Helper khi có lỗi
// (không hiện cùng lúc). Cũng chốt label liên kết đúng field qua for/id.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FormField from '../FormField.vue'
import { mountOptions } from './helpers'

const fieldSlot =
  '<template #default="{ id }"><input data-test="field" :id="id" /></template>'

describe('FormField', () => {
  it('thứ tự dọc: Label → Field → Helper khi không có lỗi', () => {
    const w = mount(FormField, {
      ...mountOptions(),
      props: { label: 'Tên kênh', hint: 'Tên hiển thị nội bộ' },
      slots: { default: fieldSlot },
    })
    const tags = Array.from(w.element.children as HTMLCollectionOf<Element>).map(
      (el) => el.tagName,
    )
    expect(tags).toEqual(['LABEL', 'INPUT', 'P'])
    expect(w.element.children[2]?.textContent).toBe('Tên hiển thị nội bộ')
  })

  it('Error THAY THẾ Helper — không hiện cùng lúc khi có cả hint và error', () => {
    const w = mount(FormField, {
      ...mountOptions(),
      props: { label: 'Tên kênh', hint: 'Tên hiển thị nội bộ', error: 'Bắt buộc nhập' },
      slots: { default: fieldSlot },
    })
    const tags = Array.from(w.element.children as HTMLCollectionOf<Element>).map(
      (el) => el.tagName,
    )
    expect(tags).toEqual(['LABEL', 'INPUT', 'P'])
    expect(w.findAll('p')).toHaveLength(1)
    expect(w.find('p').text()).toBe('Bắt buộc nhập')
    expect(w.text()).not.toContain('Tên hiển thị nội bộ')
  })

  it('không render Helper/Error khi không truyền hint lẫn error', () => {
    const w = mount(FormField, {
      ...mountOptions(),
      props: { label: 'Tên kênh' },
      slots: { default: fieldSlot },
    })
    expect(w.findAll('p')).toHaveLength(0)
  })

  it('label liên kết đúng với field qua for/id', () => {
    const w = mount(FormField, {
      ...mountOptions(),
      props: { label: 'Tên kênh', inputId: 'channel-name' },
      slots: { default: fieldSlot },
    })
    const label = w.find('label')
    const input = w.find('[data-test="field"]')
    expect(label.attributes('for')).toBe('channel-name')
    expect(input.attributes('id')).toBe('channel-name')
  })
})
