import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import { VBtn } from 'vuetify/components'
import { lightColors, darkColors } from '../design/theme-tokens'

/**
 * Bổ sung các tên màu ngữ nghĩa mà Vuetify dùng nhưng bảng token ERP không có.
 *
 * Token ERP theo quy ước shadcn (`card`, `destructive`, `amber`), còn Vuetify
 * dùng `surface`, `error`, `warning`. Không ánh xạ thì `color="error"` và
 * `color="warning"` rải khắp app sẽ mất màu.
 *
 * `info` không có token tương ứng — design system cố ý giữ bảng màu hẹp
 * (60/30/10) và không định nghĩa màu "thông tin" riêng, nên dùng lại primary.
 *
 * Các khoá `on-*` cho Vuetify biết màu chữ đặt trên nền tương ứng. Quan trọng ở
 * dark mode: primary sáng cần chữ tối mới đạt AA, nếu để Vuetify tự đoán sẽ ra
 * chữ trắng và tương phản chỉ còn ~2.8:1.
 */
function withVuetifyAliases(c: Record<string, string>): Record<string, string> {
  return {
    ...c,
    surface: c.card,
    error: c.destructive,
    warning: c.amber,
    info: c.primary,
    'on-background': c.foreground,
    'on-surface': c['card-foreground'],
    'on-primary': c['primary-foreground'],
    'on-secondary': c['secondary-foreground'],
    'on-error': c['destructive-foreground'],
    'on-warning': c['amber-foreground'],
    // KHÔNG dùng solid-badge-fg ở đây: nó là #FCFCFC ở cả hai theme, mà `success`
    // dark lại là xanh sáng (#51DAA7) — chữ gần trắng trên nền đó chỉ 1.71:1.
    // `primary-foreground` mới là cặp đảo theo theme (sáng ở light, tối ở dark).
    'on-success': c['primary-foreground'],
    // Màu nhận diện kênh còn dùng làm nền đặc (avatar), nên phải khai báo chữ
    // đặt trên nó. `solid-badge-fg` là #FCFCFC ở cả hai theme nên không phân nhánh.
    'on-channel-zalo': c['solid-badge-fg'],
    'on-channel-facebook': c['solid-badge-fg'],
    'on-channel-pancake': c['solid-badge-fg'],
  }
}

// Vuetify sinh các biến này thành --v-*. CQA trước đây không đặt cái nào nên
// ăn mặc định medium-emphasis 0.60 — đó là nguyên nhân của mục nợ
// "#7F7F84 on #FFFFFF = 3.98:1" xuất hiện ở 7 route trong
// tests/contrast/baseline.json. DS §6.1 yêu cầu muted đạt AA.
const sharedVariables = {
  'high-emphasis-opacity': 0.9,
  'medium-emphasis-opacity': 0.72,
  'disabled-opacity': 0.5,
  'border-opacity': 0.12,
}

export default createVuetify({
  theme: {
    defaultTheme: 'light',
    themes: {
      // Vuetify cần hex; bản OKLCH chính xác hơn nằm ở design/tokens.css và
      // dùng được ở mọi chỗ viết CSS tay (KPI, chart, badge, sidebar).
      light: { dark: false, colors: withVuetifyAliases(lightColors), variables: sharedVariables },
      dark: { dark: true, colors: withVuetifyAliases(darkColors), variables: sharedVariables },
    },
  },
  aliases: {
    // DS §2.1: size `icon` = 36×36, variant ghost, BẮT BUỘC aria-label.
    IconBtn: VBtn,
  },
  defaults: {
    IconBtn: { icon: true, variant: 'text', density: 'comfortable' },
    VBtn: { color: 'primary', variant: 'flat' },
    VCard: { elevation: 1, style: 'border-radius: var(--radius-xl);' },
    // hideDetails 'auto' bỏ khoảng trống message thừa dưới field khi không có
    // lỗi — nguyên nhân form CQA trông rời rạc.
    //
    // density 'compact', KHÔNG phải 'comfortable' — đây là kết quả đo, không
    // phải sở thích. Với biến thể outlined, sàn chiều cao của VField là
    //   max(control-height, input-font-size × input-line-height + 32px + density-modifier)
    // và hằng 32px đó viết chết trong VField.sass, không ghi đè qua settings
    // được. Với control-height 36px, chỉ modifier -16px (đúng bằng 'compact')
    // mới kéo sàn xuống khớp 36px; 'comfortable' (-8px) cho ra 48px — đã đo
    // trên DOM thật ở localhost:3001. Xem thêm comment ở $input-font-size
    // trong src/design/vuetify-settings.scss.
    VTextField: { variant: 'outlined', density: 'compact', hideDetails: 'auto' },
    VSelect: { variant: 'outlined', density: 'compact', hideDetails: 'auto' },
    VTextarea: { variant: 'outlined', density: 'compact', hideDetails: 'auto' },
    VAutocomplete: { variant: 'outlined', density: 'compact', hideDetails: 'auto' },
    VCombobox: { variant: 'outlined', density: 'compact', hideDetails: 'auto' },
    VFileInput: { variant: 'outlined', density: 'compact', hideDetails: 'auto' },
    VSwitch: { inset: true, color: 'primary', hideDetails: 'auto' },
    VCheckbox: { color: 'primary', hideDetails: 'auto' },
    VChip: { variant: 'tonal' },
    VDialog: { maxWidth: 420 }, // quyết định A9
  },
})
