// Sinh tokens.css (OKLCH) và theme-tokens.ts (hex) từ erp-tokens.json.
//
// Vuetify 4.0.3 không parse được OKLCH — cssColorRe của nó chỉ nhận
// rgb()/rgba()/hsl()/hsla() hoặc hex — nên component Vuetify phải dùng hex,
// còn CSS tự viết dùng OKLCH gốc (chính xác hơn, không bị kẹp gamut).
//
// KHÔNG sửa tay hai file sinh ra; sửa JSON rồi chạy lại `npm run tokens:build`.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const DESIGN = resolve(here, '../src/design')
const tokens = JSON.parse(readFileSync(resolve(DESIGN, 'erp-tokens.json'), 'utf8'))

const OKLCH = /^oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+)\s*)?\)$/

/** OKLCH → sRGB hex. Màu ngoài gamut bị kẹp — xem bảng sai số trong plan. */
function oklchToHex(L, C, H) {
  const a = C * Math.cos((H * Math.PI) / 180)
  const b = C * Math.sin((H * Math.PI) / 180)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
  const hex = lin
    .map((v) => {
      v = Math.min(Math.max(v, 0), 1)
      v = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055
      return Math.round(v * 255)
        .toString(16)
        .padStart(2, '0')
        .toUpperCase()
    })
    .join('')
  return `#${hex}`
}

const colorKeys = Object.keys(tokens.light)

function hexMap(mode) {
  const out = {}
  for (const k of colorKeys) {
    const raw = tokens[mode]?.[k]?.$value
    const m = raw && OKLCH.exec(raw)
    if (!m) throw new Error(`${mode}.${k}: không parse được "${raw}"`)
    out[k] = oklchToHex(Number(m[1]) / 100, Number(m[2]), Number(m[3]))
  }
  return out
}

const cssVars = (mode) => colorKeys.map((k) => `  --${k}: ${tokens[mode][k].$value};`).join('\n')

const core = tokens.core
const radius = Object.entries(core.radius)
  .map(([k, v]) => `  --radius-${k}: ${v.$value};`)
  .join('\n')
const shadow = Object.entries(core.shadow)
  .map(([k, v]) => {
    const s = v.$value
    return `  --shadow-${k}: ${s.x} ${s.y} ${s.blur} ${s.spread} ${s.color};`
  })
  .join('\n')
const duration = Object.entries(core.duration)
  .map(([k, v]) => `  --duration-${k}: ${v.$value};`)
  .join('\n')
const easing = Object.entries(core.easing)
  .map(([k, v]) => `  --ease-${k}: ${v.$value};`)
  .join('\n')
const font = Object.entries(core.font)
  .map(([k, v]) => `  --font-${k}: ${v.$value};`)
  .join('\n')

const css = `/* SINH TỰ ĐỘNG bởi scripts/build-tokens.mjs — đừng sửa tay.
   Sửa src/design/erp-tokens.json rồi chạy: npm run tokens:build */
:root {
${cssVars('light')}
${radius}
${shadow}
${duration}
${easing}
${font}
}

.dark {
${cssVars('dark')}
}
`

const ts = `// SINH TỰ ĐỘNG bởi scripts/build-tokens.mjs — đừng sửa tay.
// Vuetify 4.0.3 không parse được OKLCH nên theme phải dùng hex.
// Giá trị OKLCH gốc nằm ở tokens.css và chính xác hơn ở mọi chỗ dùng được.
export const lightColors: Record<string, string> = ${JSON.stringify(hexMap('light'), null, 2)}

export const darkColors: Record<string, string> = ${JSON.stringify(hexMap('dark'), null, 2)}
`

mkdirSync(DESIGN, { recursive: true })
writeFileSync(resolve(DESIGN, 'tokens.css'), css)
writeFileSync(resolve(DESIGN, 'theme-tokens.ts'), ts)
console.log(`đã sinh tokens.css và theme-tokens.ts (${colorKeys.length} token màu)`)
