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
    'on-success': c['solid-badge-fg'],
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
      density: 'comfortable',
      style: 'border-radius: var(--radius-md);',
    },
    VSelect: {
      variant: 'outlined',
      density: 'comfortable',
      style: 'border-radius: var(--radius-md);',
    },
  },
})
