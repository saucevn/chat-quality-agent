import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ConfirmDialog from '../ConfirmDialog.vue'
import { mountOptions } from './helpers'

// Polyfill `visualViewport` (cần cho VOverlay bên trong VDialog) đã chuyển
// lên setupFiles dùng chung — xem frontend/src/__tests__/setup.ts.

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
