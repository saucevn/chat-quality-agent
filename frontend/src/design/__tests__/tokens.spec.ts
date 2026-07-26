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
})
