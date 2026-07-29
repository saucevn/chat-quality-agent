import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StatusBadge from '../StatusBadge.vue'
import vuetify from '../../plugins/vuetify'
import { mountOptions } from '../ui/__tests__/helpers'

// Toàn bộ trạng thái mà app thật phát ra, kèm màu mong đợi. Danh sách này là
// bản sao của bảng "Ánh xạ trạng thái CQA ↔ màu" trong
// research/plans/2026-07-29-ui-upgrade/README.md §Contract.
const CASES: Array<[string, string]> = [
  ['running', 'amber'],
  ['syncing', 'amber'],
  ['warning', 'amber'],
  ['partial', 'amber'],
  ['success', 'success'],
  ['active', 'success'],
  ['pass', 'success'],
  ['sent', 'success'],
  ['failed', 'error'],
  ['error', 'error'],
  ['pending', 'muted-foreground'],
  ['queued', 'muted-foreground'],
  ['disabled', 'muted-foreground'],
  ['paused', 'muted-foreground'],
  ['inactive', 'muted-foreground'],
  ['cancelled', 'muted-foreground'],
]

describe('StatusBadge', () => {
  it('ánh xạ trạng thái sang màu token, không dùng palette Vuetify', () => {
    for (const [status, color] of CASES) {
      const w = mount(StatusBadge, { ...mountOptions(), props: { status } })
      expect(w.attributes('data-color'), `${status} sai màu`).toBe(color)
    }
  })

  it('không bao giờ trả màu grey — grey không có trong token', () => {
    const w = mount(StatusBadge, { ...mountOptions(), props: { status: 'khong-biet' } })
    expect(w.attributes('data-color')).not.toBe('grey')
  })

  // Trạng thái lạ: `t()` của vue-i18n trả về CHÍNH KHOÁ khi thiếu bản dịch, nên
  // không có fallback thì người dùng nhìn thấy chuỗi kỹ thuật `status_xxx` ngay
  // trên giao diện (và console đầy cảnh báo "Not found ... key").
  it('trạng thái lạ hiện nguyên mã, không rớt ra chuỗi khoá thô status_*', () => {
    const w = mount(StatusBadge, { ...mountOptions(), props: { status: 'khong-biet' } })
    expect(w.text()).not.toContain('status_')
    expect(w.text()).toBe('khong-biet')
  })

  // Mọi trạng thái trong bảng ánh xạ phải có nhãn dịch thật, không rơi vào
  // nhánh fallback — nếu rơi thì nhãn sẽ đúng bằng chính mã trạng thái.
  it('mọi trạng thái trong bảng ánh xạ đều có nhãn i18n', () => {
    for (const [status] of CASES) {
      const w = mount(StatusBadge, { ...mountOptions(), props: { status } })
      expect(w.text(), `thiếu khoá status_${status}`).not.toBe(status)
      expect(w.text()).not.toContain('status_')
    }
  })

  // Đính chính lời khai cũ ở chỗ này: bài kiểm class DOM KHÔNG chứng minh màu
  // có trong theme. `computeColor` của Vuetify
  // (node_modules/vuetify/lib/composables/color.js) đẩy thẳng `text-${color}`
  // vào class với mọi chuỗi không phải CSS color, không đối chiếu theme — nên
  // nếu cả ánh xạ lẫn kỳ vọng cùng là 'mau-bia' thì bài kiểm vẫn xanh. Nó chỉ
  // chốt rằng biến `color` thật sự chảy tới DOM (variant tonal ⇒ `text-<color>`).
  it('chip render đúng class màu Vuetify thật trên DOM', () => {
    for (const [status, color] of CASES) {
      const w = mount(StatusBadge, { ...mountOptions(), props: { status } })
      expect(w.classes(), `${status} thiếu class text-${color}`).toContain(`text-${color}`)
    }
  })

  // Đây mới là bài kiểm "màu có thật trong theme": đối chiếu thẳng với theme
  // của plugin thật. Đổi một ánh xạ sang 'grey' hay bất kỳ tên bịa nào thì bài
  // này đỏ, dù bài kiểm class ở trên có được sửa theo hay không.
  it('mọi màu trong bảng ánh xạ đều là token có thật trong theme', () => {
    const themeColors = vuetify.theme.themes.value.light.colors
    for (const [, color] of CASES) {
      expect(Object.keys(themeColors), `theme không có token màu "${color}"`).toContain(color)
    }
  })

  // `pending`/`queued` và `disabled`/`paused` dùng chung màu nền
  // muted-foreground — chỉ opacity phân biệt hai nhóm. Nếu chỉ khẳng định
  // `data-color` thì phân biệt này có thể trôi mất lần nữa mà test vẫn xanh,
  // nên khẳng định trực tiếp style opacity render ra trên DOM.
  it('disabled/paused/inactive/cancelled giảm opacity 0.6, pending/queued giữ nguyên', () => {
    for (const status of ['disabled', 'paused', 'inactive', 'cancelled']) {
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
