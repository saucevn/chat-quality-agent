import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StatusBadge from '../StatusBadge.vue'
import { mountOptions } from '../ui/__tests__/helpers'

describe('StatusBadge', () => {
  it('ánh xạ trạng thái sang màu token, không dùng palette Vuetify', () => {
    const cases: Array<[string, string]> = [
      ['running', 'amber'],
      ['syncing', 'amber'],
      ['success', 'success'],
      ['active', 'success'],
      ['failed', 'error'],
      ['pending', 'muted-foreground'],
      ['queued', 'muted-foreground'],
      ['disabled', 'muted-foreground'],
      ['paused', 'muted-foreground'],
    ]
    for (const [status, color] of cases) {
      const w = mount(StatusBadge, { ...mountOptions(), props: { status } })
      expect(w.attributes('data-color'), `${status} sai màu`).toBe(color)
    }
  })

  it('không bao giờ trả màu grey — grey không có trong token', () => {
    const w = mount(StatusBadge, { ...mountOptions(), props: { status: 'khong-biet' } })
    expect(w.attributes('data-color')).not.toBe('grey')
  })

  // `data-color` chỉ là chuỗi echo lại biến `color` — một ánh xạ trả về tên
  // màu không tồn tại trong theme vẫn làm test trên xanh. Test dưới đây
  // khẳng định trên DOM đã render thật: class Vuetify sinh ra từ variant
  // `tonal` là `text-<color>` (đã tự kiểm bằng cách mount VChip trực tiếp và
  // in `classes()`) — nên một ánh xạ sai (vd. trả 'grey' hoặc màu không có
  // trong theme) sẽ tạo ra class không tồn tại và bài kiểm dưới phải đỏ.
  it('chip render đúng class màu Vuetify thật trên DOM', () => {
    const cases: Array<[string, string]> = [
      ['running', 'text-amber'],
      ['success', 'text-success'],
      ['failed', 'text-error'],
      ['pending', 'text-muted-foreground'],
    ]
    for (const [status, expectedClass] of cases) {
      const w = mount(StatusBadge, { ...mountOptions(), props: { status } })
      expect(w.classes(), `${status} thiếu class ${expectedClass}`).toContain(expectedClass)
    }
  })

  // `pending`/`queued` và `disabled`/`paused` dùng chung màu nền
  // muted-foreground — chỉ opacity phân biệt hai nhóm. Nếu chỉ khẳng định
  // `data-color` thì phân biệt này có thể trôi mất lần nữa mà test vẫn xanh,
  // nên khẳng định trực tiếp style opacity render ra trên DOM.
  it('disabled/paused giảm opacity 0.6, pending/queued giữ nguyên', () => {
    for (const status of ['disabled', 'paused']) {
      const w = mount(StatusBadge, { ...mountOptions(), props: { status } })
      expect(w.attributes('style'), `${status} phải có opacity 0.6`).toContain('opacity: 0.6')
    }
    for (const status of ['pending', 'queued']) {
      const w = mount(StatusBadge, { ...mountOptions(), props: { status } })
      expect(w.attributes('style') ?? '', `${status} không được giảm opacity`).not.toContain(
        'opacity',
      )
    }
  })
})
