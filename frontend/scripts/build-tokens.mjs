// Sinh tokens.css (OKLCH), theme-tokens.ts (hex) và _ds-tokens.scss (biến
// SASS) từ erp-tokens.json.
//
// Vuetify 4.0.3 không parse được OKLCH — cssColorRe của nó chỉ nhận
// rgb()/rgba()/hsl()/hsla() hoặc hex — nên component Vuetify phải dùng hex,
// còn CSS tự viết dùng OKLCH gốc (chính xác hơn, không bị kẹp gamut).
//
// KHÔNG sửa tay ba file sinh ra; sửa JSON rồi chạy lại `npm run tokens:build`.
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

const mapValues = (g) => Object.fromEntries(Object.entries(g).map(([k, v]) => [k, v.$value]))

// Bậc body-xs không có trong erp-tokens.json — quyết định B16 của đợt nâng
// cấp giao diện: 91 chỗ dùng text-caption là chữ nhỏ thường, không phải nhãn
// viết hoa, nên không dùng chung bậc `label` được.
const EXTRA_SCALE = {
  fontSize: { 'body-xs': '12px' },
  lineHeight: { 'body-xs': '16px' },
}
const scale = (group) => ({ ...mapValues(core[group]), ...(EXTRA_SCALE[group] ?? {}) })

const cssBlock = (prefix, obj) =>
  Object.entries(obj).map(([k, v]) => `  --${prefix}-${k}: ${v};`).join('\n')

const radius = cssBlock('radius', mapValues(core.radius))
const shadow = Object.entries(core.shadow)
  .map(([k, v]) => {
    const s = v.$value
    return `  --shadow-${k}: ${s.x} ${s.y} ${s.blur} ${s.spread} ${s.color};`
  })
  .join('\n')
const duration = cssBlock('duration', mapValues(core.duration))
const easing = cssBlock('ease', mapValues(core.easing))
const font = cssBlock('font', mapValues(core.font))
const fontSize = cssBlock('font-size', scale('fontSize'))
const lineHeight = cssBlock('line-height', scale('lineHeight'))
const tracking = cssBlock('tracking', mapValues(core.letterSpacing))
const fontWeight = cssBlock('font-weight', mapValues(core.fontWeight))
const spacing = cssBlock('space', mapValues(core.spacing))

// Bậc DS → class tiện ích. Vuetify 4 dùng thang Material 3 nên không có sẵn
// .text-h5/.text-body-2/... của Vuetify 3, mà app đang dùng chúng 252 lần.
const TYPO_CLASSES = {
  'heading-1': ['heading-1', 'bold', 'tight', 'display'],
  'heading-2': ['heading-2', 'semibold', 'snug', 'display'],
  'heading-3': ['heading-3', 'semibold', 'normal', 'body'],
  'body-lg': ['body-lg', 'regular', 'normal', 'body'],
  'body-base': ['body-base', 'regular', 'normal', 'body'],
  'body-sm': ['body-sm', 'medium', 'normal', 'body'],
  'body-xs': ['body-xs', 'regular', 'normal', 'body'],
  label: ['label', 'semibold', 'wide', 'body'],
}

const typoClasses = Object.entries(TYPO_CLASSES)
  .map(([name, [size, weight, track, family]]) => {
    const upper = name === 'label' ? '\n  text-transform: uppercase;' : ''
    return `.text-${name} {
  font-family: var(--font-${family});
  font-size: var(--font-size-${size});
  line-height: var(--line-height-${size});
  font-weight: var(--font-weight-${weight});
  letter-spacing: var(--tracking-${track});${upper}
}`
  })
  .join('\n')

// LỚP ĐỆM — Vuetify 4 bỏ thang Vuetify 3 (đã xác minh: .text-h5 và
// .text-body-2 không tồn tại trong dist/vuetify.css). 252 chỗ trong src/ vẫn
// dùng và đang render sai cỡ. Lớp đệm sửa ngay mà không phải đụng file view
// nào — view thuộc sở hữu của các story Phase 2.
// Phase 2 thay dần sang class DS; Story 3B thêm test chặn chúng quay lại.
const LEGACY_ALIAS = {
  h4: 'heading-1', h5: 'heading-2', h6: 'heading-3',
  'subtitle-1': 'body-base', 'subtitle-2': 'body-sm',
  'body-1': 'body-base', 'body-2': 'body-sm', caption: 'body-xs',
}
const legacyClasses = Object.entries(LEGACY_ALIAS)
  .map(([old, ds]) => `.text-${old} { /* ĐÃ LỖI THỜI → .text-${ds} */
  font-size: var(--font-size-${ds});
  line-height: var(--line-height-${ds});
}`)
  .join('\n')

// Nối token font vào Vuetify: $body-font-family của Vuetify 4 là
// var(--v-font-body, 'Roboto', sans-serif), và biến đó xuất hiện 183 lần
// trong dist/vuetify.css — một dòng là đủ cho toàn app.
// Focus: DS §1.6 có hai cơ chế song song; quyết định A15 chọn cơ chế CSS toàn
// cục, bỏ ring per-component.
// .font-mono: 5 chỗ trong src/ dùng class này mà không nơi nào định nghĩa —
// Vuetify không có utility tên đó.
const globalRules = `:root {
  --v-font-body: var(--font-body);
}

:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
  box-shadow: var(--shadow-focus);
}

.bg-primary :focus-visible {
  outline-color: #fff;
}

.font-mono {
  font-family: var(--font-mono);
}`

const css = `/* SINH TỰ ĐỘNG bởi scripts/build-tokens.mjs — đừng sửa tay.
   Sửa src/design/erp-tokens.json rồi chạy: npm run tokens:build */
:root {
${cssVars('light')}
${radius}
${shadow}
${duration}
${easing}
${font}
${fontSize}
${lineHeight}
${tracking}
${fontWeight}
${spacing}
}

.dark {
${cssVars('dark')}
}

${typoClasses}
${legacyClasses}
${globalRules}
`

const ts = `// SINH TỰ ĐỘNG bởi scripts/build-tokens.mjs — đừng sửa tay.
// Vuetify 4.0.3 không parse được OKLCH nên theme phải dùng hex.
// Giá trị OKLCH gốc nằm ở tokens.css và chính xác hơn ở mọi chỗ dùng được.
export const lightColors: Record<string, string> = ${JSON.stringify(hexMap('light'), null, 2)}

export const darkColors: Record<string, string> = ${JSON.stringify(hexMap('dark'), null, 2)}
`

const scssBlock = (prefix, obj) =>
  Object.entries(obj).map(([k, v]) => `$${prefix}-${k}: ${v};`).join('\n')

const scss = `// SINH TỰ ĐỘNG bởi scripts/build-tokens.mjs — đừng sửa tay.
// Biến SASS cho lớp settings của Vuetify (src/design/vuetify-settings.scss).
// Vuetify cần giá trị literal lúc biên dịch (nó nhân chia $border-radius-root),
// nên không dùng var() được — phải là biến SASS thật.
${scssBlock('radius', mapValues(core.radius))}

${scssBlock('font-size', scale('fontSize'))}

${scssBlock('line-height', scale('lineHeight'))}

${scssBlock('tracking', mapValues(core.letterSpacing))}

${scssBlock('font-weight', mapValues(core.fontWeight))}

${scssBlock('space', mapValues(core.spacing))}
`

mkdirSync(DESIGN, { recursive: true })
writeFileSync(resolve(DESIGN, 'tokens.css'), css)
writeFileSync(resolve(DESIGN, 'theme-tokens.ts'), ts)
writeFileSync(resolve(DESIGN, '_ds-tokens.scss'), scss)
console.log(`đã sinh tokens.css và theme-tokens.ts (${colorKeys.length} token màu)`)
