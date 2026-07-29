import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StatusBadge from '../StatusBadge.vue'
import vuetify from '../../plugins/vuetify'
import { lightColors, darkColors } from '../../design/theme-tokens'
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

// `error` là ALIAS Vuetify của token `destructive` (plugins/vuetify.ts
// §withVuetifyAliases). theme-tokens.ts — nguồn sự thật của màu — chỉ có tên
// token gốc, nên phải quy đổi trước khi tra. Bài "alias khớp theme thật" ở
// dưới chặn bảng này trôi khỏi plugin.
const TOKEN_ALIAS: Record<string, string> = { error: 'destructive' }
const tok = (name: string) => TOKEN_ALIAS[name] ?? name

const THEMES: Array<['light' | 'dark', Record<string, string>]> = [
  ['light', lightColors],
  ['dark', darkColors],
]

// WCAG 2.1 §Relative luminance + §Contrast ratio. Không dùng lại hàm nào của
// app: bài kiểm phải độc lập với code đang được kiểm.
type RGB = [number, number, number]
const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB
function luminance([r, g, b]: RGB): number {
  const f = (c: number) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
function ratio(a: RGB, b: RGB): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((p, q) => q - p) as [number, number]
  return (l1 + 0.05) / (l2 + 0.05)
}
/** Trộn `fg` ở độ mờ `alpha` lên `bg` — nền HIỆU DỤNG mà mắt thật sự thấy. */
function blend(fg: RGB, bg: RGB, alpha: number): RGB {
  return fg.map((c, i) => c * alpha + bg[i]! * (1 - alpha)) as RGB
}

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

  // Bảng alias phải khớp plugin thật, nếu không mọi phép tính tương phản dưới
  // đây tra nhầm token mà vẫn xanh.
  it('bảng quy đổi alias khớp theme Vuetify thật', () => {
    for (const [mode, colors] of THEMES) {
      const themeColors = vuetify.theme.themes.value[mode]!.colors as Record<string, string>
      for (const [, color] of CASES) {
        expect(themeColors[color], `${mode}.${color} lệch token ${tok(color)}`).toBe(
          colors[tok(color)],
        )
      }
    }
  })

  // ĐIỂM CHẶN MERGE. `make test-contrast` (Playwright) KHÔNG bắt được lỗi này ở
  // Phase 1 vì chưa view nào render StatusBadge — Phase 2 mới có 78 chỗ dùng.
  // Nên tương phản phải được tính BẰNG SỐ ngay tại đây.
  //
  // Nền hiệu dụng KHÔNG phải `card`: variant tonal vẽ nền bằng chính màu chip ở
  // độ mờ `data-underlay-opacity` (đọc thẳng từ component, không phải hằng số
  // chép tay) phủ lên `card` ⇒ phải alpha-blend trước khi tính tỉ lệ.
  it('mọi trạng thái đạt >= 4.5:1 chữ trên nền card, ở cả light lẫn dark', () => {
    const failures: string[] = []
    for (const [status] of CASES) {
      const w = mount(StatusBadge, { ...mountOptions(), props: { status } })
      const bgToken = tok(w.attributes('data-color')!)
      const fgToken = tok(w.attributes('data-text-token')!)
      const alpha = Number(w.attributes('data-underlay-opacity'))
      expect(Number.isFinite(alpha), `${status}: không đọc được độ mờ nền`).toBe(true)

      for (const [mode, colors] of THEMES) {
        const fg = colors[fgToken]
        const chipColor = colors[bgToken]
        const card = colors.card
        expect(fg, `${mode} thiếu token chữ ${fgToken}`).toBeDefined()
        expect(chipColor, `${mode} thiếu token nền ${bgToken}`).toBeDefined()

        const effectiveBg = blend(hex(chipColor!), hex(card!), alpha)
        const r = ratio(hex(fg!), effectiveBg)
        if (r < 4.5) {
          failures.push(
            `${mode}.${status}: ${r.toFixed(2)}:1 — chữ ${fgToken} trên ${bgToken}@${alpha} / card`,
          )
        }
      }
    }
    expect(failures, `Dưới ngưỡng AA 4.5:1:\n${failures.join('\n')}`).toEqual([])
  })

  // `pending`/`queued` và `disabled`/`paused` dùng chung màu nền
  // muted-foreground — chỉ độ mờ NỀN phân biệt hai nhóm.
  it('nhóm dừng mờ hơn nhóm chờ, và chỉ mờ ở phần nền', () => {
    const opacityOf = (status: string) => {
      const w = mount(StatusBadge, { ...mountOptions(), props: { status } })
      return Number(w.attributes('data-underlay-opacity'))
    }
    const active = opacityOf('pending')
    for (const status of ['disabled', 'paused', 'inactive', 'cancelled']) {
      expect(opacityOf(status), `${status} phải có nền mờ hơn pending`).toBeLessThan(active)
    }
    for (const status of ['queued', 'running', 'success', 'failed']) {
      expect(opacityOf(status), `${status} không được giảm độ mờ nền`).toBe(active)
    }
  })

  // ĐIỂM CHẶN MERGE. Cách làm mờ cũ (`style="opacity: .6"` trên chính chip) phủ
  // lên CẢ chữ lẫn nền và kéo tương phản xuống ≈2.0:1. Bài kiểm tương phản ở
  // trên đọc màu từ token nên KHÔNG thấy được lớp phủ đó — ca này canh riêng nó.
  it('không chip nào bị phủ opacity ở cấp thẻ gốc', () => {
    for (const [status] of CASES) {
      const w = mount(StatusBadge, { ...mountOptions(), props: { status } })
      const style = w.attributes('style') ?? ''
      // Chỉ bắt khai báo `opacity:` đứng riêng — biến `--sb-underlay-opacity`
      // có chứa chuỗi "opacity" nhưng là biến, không phủ lên thẻ gốc.
      expect(/(^|;)\s*opacity\s*:/.test(style), `${status} bị phủ opacity: ${style}`).toBe(false)
    }
  })

  // Prop `label` (vá lỗ hổng Contract 1: Dashboard cần "Nghiêm trọng"/"Cần cải
  // thiện" thay vì "Lỗi"/"Cảnh báo" chung chung do i18n dựng ra).
  describe('prop label', () => {
    it('có label ⇒ hiện đúng chuỗi đó, không phải nhãn i18n', () => {
      const w = mount(StatusBadge, {
        ...mountOptions(),
        props: { status: 'error', label: 'Nghiêm trọng' },
      })
      expect(w.text()).toBe('Nghiêm trọng')
    })

    it('không có label ⇒ vẫn ra nhãn i18n như cũ', () => {
      const w = mount(StatusBadge, { ...mountOptions(), props: { status: 'error' } })
      expect(w.text()).toBe('Lỗi')
    })

    // CA QUAN TRỌNG NHẤT: `label` chỉ đổi CHỮ, tuyệt đối không phải cửa sau
    // cho màu. Đặt `label` cố ý "lệch tông" so với `status` (label nghe như
    // thành công, status là lỗi) để nếu có bất kỳ nhánh code nào lỡ suy màu từ
    // nội dung `label` thay vì từ `status`, ca này sẽ đỏ ngay.
    it('màu vẫn do status quyết định kể cả khi label được truyền', () => {
      for (const [status, color] of CASES) {
        const w = mount(StatusBadge, {
          ...mountOptions(),
          props: { status, label: 'Nhãn tuỳ ý không liên quan tới màu' },
        })
        expect(w.attributes('data-color'), `${status} đổi màu theo label`).toBe(color)
      }
    })
  })
})
