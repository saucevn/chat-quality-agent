import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ConfirmDialog from '../ConfirmDialog.vue'
import { mountOptions } from './helpers'

// happy-dom không cài `visualViewport` — VOverlay của Vuetify (bên trong
// VDialog) tham chiếu biến toàn cục này không qua `window.` nên thiếu nó gây
// ReferenceError trước khi component kịp mount. Polyfill tối thiểu, chỉ ảnh
// hưởng file test này.
if (typeof globalThis.visualViewport === 'undefined') {
  // @ts-expect-error -- stub tối thiểu cho môi trường test, không đầy đủ API thật
  globalThis.visualViewport = {
    width: 1024,
    height: 768,
    offsetLeft: 0,
    offsetTop: 0,
    addEventListener: () => {},
    removeEventListener: () => {},
  }
}

describe('ConfirmDialog', () => {
  it('destructive thì nút xác nhận mang màu error', () => {
    const w = mount(ConfirmDialog, {
      ...mountOptions(),
      props: {
        modelValue: true, title: 'Xoá kênh', message: 'Không hoàn tác được.',
        confirmLabel: 'Xoá vĩnh viễn', destructive: true,
      },
      attachTo: document.body,
    })
    const btn = document.querySelector('[data-test="confirm"]')
    expect(btn?.className).toContain('text-error')
    w.unmount()
  })

  it('phát confirm khi bấm nút xác nhận', async () => {
    const w = mount(ConfirmDialog, {
      ...mountOptions(),
      props: { modelValue: true, title: 'x', message: 'y', confirmLabel: 'Đồng ý' },
      attachTo: document.body,
    })
    ;(document.querySelector('[data-test="confirm"]') as HTMLElement).click()
    await w.vm.$nextTick()
    expect(w.emitted('confirm')).toHaveLength(1)
    w.unmount()
  })
})
