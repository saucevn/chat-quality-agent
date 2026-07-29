import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import tokens from '../erp-tokens.json'
import { lightColors, darkColors } from '../theme-tokens'

// Đọc bằng node:fs chứ không phải `import ... from '../tokens.css?raw'`:
// Vitest mặc định đặt css: false nên mọi import CSS bị stub thành chuỗi rỗng,
// khiến assertion dưới đây pass/fail sai. (tsconfig.app.json vì vậy có thêm
// "node" vào types.)
const here = dirname(fileURLToPath(import.meta.url))
const css = readFileSync(resolve(here, '../tokens.css'), 'utf8')
const colorKeys = Object.keys(tokens.light)

/** Tương phản WCAG giữa hai hex. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const ch = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    const [r, g, bl] = ch.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl
  }
  const [hi, lo] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (hi + 0.05) / (lo + 0.05)
}

describe('design tokens', () => {
  it('mọi token màu có mặt ở cả hai theme Vuetify', () => {
    for (const k of colorKeys) {
      expect(lightColors, `light thiếu ${k}`).toHaveProperty(k)
      expect(darkColors, `dark thiếu ${k}`).toHaveProperty(k)
    }
    // dư khoá nghĩa là có ai đó sửa tay file sinh
    expect(Object.keys(lightColors).sort()).toEqual([...colorKeys].sort())
  })

  it('giá trị theme là hex hợp lệ — Vuetify 4 không parse được OKLCH', () => {
    for (const [k, v] of Object.entries({ ...lightColors, ...darkColors })) {
      expect(v, `${k} = ${v}`).toMatch(/^#[0-9A-F]{6}$/)
    }
  })

  it('tokens.css khai báo đủ biến cho cả light và dark', () => {
    for (const k of colorKeys) {
      expect(css, `tokens.css thiếu --${k}`).toContain(`--${k}:`)
    }
    expect(css).toContain('.dark {')
    expect(css).toContain('--radius-xl:')
    expect(css).toContain('--shadow-card:')
  })

  it('các cặp tài liệu cam kết AA vẫn đạt >= 4.5:1 sau khi ép về hex', () => {
    // 8 giá trị lệch gamut đều nằm trong các cặp này — xem bảng sai số trong
    // research/plans/2026-07-26-design-tokens.md.
    const pairs: Array<['light' | 'dark', string, string]> = [
      ['light', 'foreground', 'card'],
      ['light', 'muted-foreground', 'card'],
      ['light', 'primary-foreground', 'primary'],
      ['light', 'success-fg', 'success-bg'],
      ['light', 'destructive-fg', 'destructive-bg'],
      ['light', 'solid-badge-fg', 'destructive'],
      ['dark', 'foreground', 'card'],
      ['dark', 'muted-foreground', 'card'],
      ['dark', 'primary-foreground', 'primary'],
      ['dark', 'success-fg', 'success-bg'],
      ['dark', 'destructive-fg', 'destructive-bg'],
    ]
    const failures: string[] = []
    for (const [mode, fg, bg] of pairs) {
      const m = mode === 'light' ? lightColors : darkColors
      const ratio = contrast(m[fg], m[bg])
      if (ratio < 4.5) failures.push(`${mode}.${fg} trên ${mode}.${bg} = ${ratio.toFixed(2)}:1`)
    }
    expect(failures, `Cặp không đạt AA:\n${failures.join('\n')}`).toEqual([])
  })

  it('tokens.css khai báo thang chữ và spacing, không chỉ radius/shadow', () => {
    for (const k of Object.keys(tokens.core.fontSize))
      expect(css, `thiếu --font-size-${k}`).toContain(`--font-size-${k}:`)
    for (const k of Object.keys(tokens.core.lineHeight))
      expect(css, `thiếu --line-height-${k}`).toContain(`--line-height-${k}:`)
    for (const k of Object.keys(tokens.core.letterSpacing))
      expect(css, `thiếu --tracking-${k}`).toContain(`--tracking-${k}:`)
    for (const k of Object.keys(tokens.core.fontWeight))
      expect(css, `thiếu --font-weight-${k}`).toContain(`--font-weight-${k}:`)
    for (const k of Object.keys(tokens.core.spacing))
      expect(css, `thiếu --space-${k}`).toContain(`--space-${k}:`)
  })

  it('_ds-tokens.scss cấp biến SASS cho lớp settings của Vuetify', () => {
    const scss = readFileSync(resolve(here, '../_ds-tokens.scss'), 'utf8')
    for (const k of Object.keys(tokens.core.radius))
      expect(scss, `thiếu $radius-${k}`).toContain(`$radius-${k}:`)
    for (const k of Object.keys(tokens.core.fontSize))
      expect(scss, `thiếu $font-size-${k}`).toContain(`$font-size-${k}:`)
    for (const k of Object.keys(tokens.core.lineHeight))
      expect(scss, `thiếu $line-height-${k}`).toContain(`$line-height-${k}:`)
    // bậc body-xs là quyết định B16, không có trong erp-tokens.json gốc
    expect(scss).toContain('$font-size-body-xs:')
    expect(scss).toContain('$line-height-body-xs:')
  })

  it('tokens.css định nghĩa class typography DS và lớp đệm cho class Vuetify 3 đã chết', () => {
    for (const c of ['heading-1', 'heading-2', 'heading-3', 'body-lg',
                     'body-base', 'body-sm', 'body-xs', 'label'])
      expect(css, `thiếu .text-${c}`).toContain(`.text-${c}`)

    // Vuetify 4 bỏ hẳn thang Vuetify 3; 252 chỗ trong src/ vẫn dùng.
    // Lớp đệm giữ chúng hoạt động cho tới khi Phase 2 thay hết.
    for (const c of ['h4', 'h5', 'h6', 'subtitle-1', 'subtitle-2',
                     'body-1', 'body-2', 'caption'])
      expect(css, `thiếu lớp đệm .text-${c}`).toContain(`.text-${c}`)
  })
})
