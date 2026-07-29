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

  // I3 — DS §6.4 gọi đây là "a11y, không phải tuỳ chọn": slot prop
  // `describedby` phải trỏ tới ĐÚNG những phần tử mô tả đang tồn tại. Trước
  // đây nó chỉ nối `<p>` lỗi, còn `<p>` hint không hề có `id` ⇒ trình đọc màn
  // hình nghe được lỗi nhưng KHÔNG BAO GIỜ nghe được gợi ý. Không ca test nào
  // chạm tới `describedby` nên lỗi im lặng hoàn toàn.
  describe('describedby nối đúng phần tử mô tả đang hiển thị', () => {
    const a11ySlot =
      '<template #default="{ id, describedby }"><input data-test="field" :id="id" :aria-describedby="describedby" /></template>'

    function mountField(props: Record<string, unknown>) {
      return mount(FormField, {
        ...mountOptions(),
        props: { label: 'Tên kênh', inputId: 'channel-name', ...props },
        slots: { default: a11ySlot },
      })
    }

    it('chỉ có hint ⇒ describedby trỏ tới id của hint', () => {
      const w = mountField({ hint: 'Tên hiển thị nội bộ' })
      const described = w.find('[data-test="field"]').attributes('aria-describedby')
      expect(described).toBe('channel-name-hint')
      // và phần tử mang id đó phải tồn tại thật, đúng nội dung hint.
      expect(w.find('#channel-name-hint').text()).toBe('Tên hiển thị nội bộ')
    })

    it('có lỗi ⇒ describedby trỏ tới id của lỗi', () => {
      const w = mountField({ error: 'Bắt buộc nhập' })
      const described = w.find('[data-test="field"]').attributes('aria-describedby')
      expect(described).toBe('channel-name-error')
      expect(w.find('#channel-name-error').text()).toBe('Bắt buộc nhập')
    })

    // Lỗi THAY THẾ hint (§3.4) nên khi có cả hai, `<p>` hint không được render.
    // Nối thêm id hint vào lúc này là tạo idref treo — trình đọc màn hình bỏ
    // qua toàn bộ hoặc đọc rỗng. describedby chỉ được liệt kê id CÓ THẬT.
    it('có cả hint lẫn lỗi ⇒ chỉ nối id của phần tử thực sự tồn tại', () => {
      const w = mountField({ hint: 'Tên hiển thị nội bộ', error: 'Bắt buộc nhập' })
      const described = w.find('[data-test="field"]').attributes('aria-describedby')
      expect(described).toBe('channel-name-error')
      expect(w.find('#channel-name-hint').exists()).toBe(false)
      described
        ?.split(' ')
        .forEach((refId) => expect(w.find(`#${refId}`).exists()).toBe(true))
    })

    it('không hint không lỗi ⇒ describedby là undefined', () => {
      const w = mountField({})
      expect(w.find('[data-test="field"]').attributes('aria-describedby')).toBeUndefined()
    })
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
