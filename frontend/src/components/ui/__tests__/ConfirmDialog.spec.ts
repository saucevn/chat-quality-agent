import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ConfirmDialog from '../ConfirmDialog.vue'
import { mountOptions } from './helpers'

// Polyfill `visualViewport` (cần cho VOverlay bên trong VDialog) đã chuyển
// lên setupFiles dùng chung — xem frontend/src/__tests__/setup.ts.

const base = { modelValue: true, title: 'Xoá kênh', message: 'Không hoàn tác được.' }

describe('ConfirmDialog', () => {
  // Bản trước khẳng định `text-error` và qua đó KHOÁ CỨNG hành vi sai: với
  // variant 'text' nút xác nhận destructive nhẹ ngang nút Huỷ. Vuetify sinh
  // `text-<color>` cho variant text và `bg-<color>` cho variant flat — nên
  // `bg-error` mới là bằng chứng nút có nền đặc theo §2.1.
  it('destructive thì nút xác nhận là nền error ĐẶC, không phải chữ error', () => {
    const w = mount(ConfirmDialog, {
      ...mountOptions(),
      props: { ...base, confirmLabel: 'Xoá vĩnh viễn', destructive: true },
      attachTo: document.body,
    })
    const btn = document.querySelector('[data-test="confirm"]')
    expect(btn?.className).toContain('bg-error')
    expect(btn?.className).toContain('v-btn--variant-flat')
    expect(btn?.className).not.toContain('v-btn--variant-text')
    w.unmount()
  })

  // Hộp thoại phải có đúng MỘT nút chính. Nếu cả hai cùng variant text thì
  // không còn thứ bậc — đây là chốt chặn cho điều đó.
  it('nút Huỷ nhẹ hơn nút xác nhận về trọng lượng thị giác', () => {
    const w = mount(ConfirmDialog, {
      ...mountOptions(),
      props: { ...base, confirmLabel: 'Xoá vĩnh viễn', destructive: true },
      attachTo: document.body,
    })
    const confirm = document.querySelector('[data-test="confirm"]')
    const cancel = [...document.querySelectorAll('.v-card-actions .v-btn')].find(
      (b) => b !== confirm,
    )
    expect(cancel?.className).toContain('v-btn--variant-text')
    expect(confirm?.className).toContain('v-btn--variant-flat')
    w.unmount()
  })

  it('không destructive thì nút xác nhận vẫn là nền primary đặc', () => {
    const w = mount(ConfirmDialog, {
      ...mountOptions(),
      props: { ...base, confirmLabel: 'Đồng ý' },
      attachTo: document.body,
    })
    const btn = document.querySelector('[data-test="confirm"]')
    expect(btn?.className).toContain('bg-primary')
    expect(btn?.className).toContain('v-btn--variant-flat')
    w.unmount()
  })

  it('phát confirm khi bấm nút xác nhận', async () => {
    const w = mount(ConfirmDialog, {
      ...mountOptions(),
      props: { ...base, confirmLabel: 'Đồng ý' },
      attachTo: document.body,
    })
    ;(document.querySelector('[data-test="confirm"]') as HTMLElement).click()
    await w.vm.$nextTick()
    expect(w.emitted('confirm')).toHaveLength(1)
    w.unmount()
  })

  // Không `persistent` thì ESC đóng được hộp thoại NGAY TRONG LÚC lệnh xoá đang
  // bay. VOverlay không thêm class nào cho prop này (đã kiểm
  // node_modules/vuetify/lib/components/VOverlay/VOverlay.js — chỉ có nhánh
  // `if (!props.persistent) isActive.value = false`), nên phải kiểm bằng hành
  // vi: bắn Escape lên `window` đúng như listener của Vuetify đăng ký.
  const pressEscape = async (w: ReturnType<typeof mount>) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await w.vm.$nextTick()
  }

  it('đang loading thì ESC KHÔNG đóng được hộp thoại', async () => {
    const w = mount(ConfirmDialog, {
      ...mountOptions(),
      props: { ...base, confirmLabel: 'Xoá vĩnh viễn', destructive: true, loading: true },
      attachTo: document.body,
    })
    await pressEscape(w)
    expect(w.emitted('update:modelValue')).toBeUndefined()
    w.unmount()
  })

  it('không loading thì ESC vẫn đóng được như bình thường', async () => {
    const w = mount(ConfirmDialog, {
      ...mountOptions(),
      props: { ...base, confirmLabel: 'Xoá vĩnh viễn', destructive: true },
      attachTo: document.body,
    })
    await pressEscape(w)
    expect(w.emitted('update:modelValue')?.at(-1)).toEqual([false])
    w.unmount()
  })
})
