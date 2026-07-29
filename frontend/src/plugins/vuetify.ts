import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
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

export default createVuetify({
  theme: {
    defaultTheme: 'light',
    themes: {
      // Vuetify cần hex; bản OKLCH chính xác hơn nằm ở design/tokens.css và
      // dùng được ở mọi chỗ viết CSS tay (KPI, chart, badge, sidebar).
      light: { dark: false, colors: withVuetifyAliases(lightColors) },
      dark: { dark: true, colors: withVuetifyAliases(darkColors) },
    },
  },
  defaults: {
    // Token quy định: control = radius-md (8px), card = radius-xl (14px).
    // Vuetify không có sẵn thang này nên gán trực tiếp qua style.
    VCard: { elevation: 1, style: 'border-radius: var(--radius-xl);' },
    VBtn: { style: 'border-radius: var(--radius-md);' },
    VTextField: {
      variant: 'outlined',
      // 'compact', không phải 'comfortable' — xem giải thích đầy đủ ở khai báo
      // $input-font-size/$input-line-height trong vuetify-settings.scss. Tóm
      // tắt: sàn chiều cao của biến thể outlined luôn là
      // "input-font-size × input-line-height + 32px + density-modifier", cố
      // định 32px đó không đổi được qua settings. Với control-height đã đặt
      // 36px, chỉ có density-modifier = -16px (đúng bằng 'compact') mới kéo
      // sàn font xuống khớp 36px; 'comfortable' (-8px) hay 'default' (0px) đều
      // buộc sàn vượt 36px bất kể font nhỏ tới đâu.
      density: 'compact',
      style: 'border-radius: var(--radius-md);',
    },
    VSelect: {
      variant: 'outlined',
      // Lý do density 'compact': xem comment ở VTextField ngay trên.
      density: 'compact',
      style: 'border-radius: var(--radius-md);',
    },
  },
})
