# ERP Design Tokens → CQA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Áp bảng token của ERP Design System v2.0 lên frontend CQA, giữ độ chính xác màu OKLCH ở chỗ tự vẽ và cấp bản hex tương đương cho component Vuetify.

**Architecture:** Hai nguồn màu sinh ra từ **một** nguồn sự thật. `erp-tokens.json` được commit vào repo; một script build sinh ra (a) `tokens.css` chứa biến OKLCH trên `:root`/`.dark`, và (b) `theme-tokens.ts` chứa map hex nạp vào `theme.colors` của Vuetify. Không chép tay giá trị nào — chép tay là cách chắc chắn nhất để hai nguồn lệch nhau.

**Tech Stack:** Vue 3 · Vuetify 4.0.3 · Vite 8 · Vitest 4 · TypeScript — **không thêm dependency runtime**

**Nguồn:** `ERP-design-system-v2.md` (Section 1) và `erp-tokens.json`, người dùng cung cấp ngày 2026-07-26.

## Global Constraints

- **Không thêm dependency runtime mới.** Script chuyển đổi chạy bằng Node có sẵn, không cần thư viện màu.
- **Không đổi layout, không đổi cấu trúc component.** Đợt này chỉ token + theme.
- **Một nguồn sự thật:** mọi giá trị màu bắt nguồn từ `erp-tokens.json`. Cấm hard-code hex trong `.vue`.
- Vuetify 4.0.3 **không parse được OKLCH** — `cssColorRe = /^(?<fn>(?:rgb|hsl)a?)\((?<values>.+)\)/`. Theme phải nhận hex.
- Chuỗi UI qua i18n như cũ.
- Kiểm tra bằng `cd frontend && npx vue-tsc -b && npx vitest run`.

## Bối cảnh: vì sao phải làm hai nguồn

Vuetify sinh biến `--v-theme-*` dạng RGB triplet để tính opacity (`rgba(var(--v-theme-primary), .5)`), nên nó bắt buộc phải có hex. Nhưng ép toàn bộ bảng màu về sRGB làm mất đúng thứ design system coi là giá trị cốt lõi.

Đã đo sai số vòng tròn (OKLCH → hex → OKLCH) cho cả 80 giá trị. **8 giá trị lệch thấy được**, còn lại khớp:

| Token | Hex | ΔL% | ΔChroma | Chroma gốc |
|---|---|---:|---:|---:|
| `dark.destructive-fg` | `#FFAB9D` | 6.06 | 0.058 | 0.160 |
| `dark.primary` | `#8188FF` | 2.33 | 0.047 | 0.220 |
| `dark.ring` | `#8188FF` | 2.33 | 0.047 | 0.220 |
| `dark.chart-1` | `#8188FF` | 2.33 | 0.047 | 0.220 |
| `light.success-fg` | `#004324` | 1.65 | 0.028 | 0.110 |
| `light.destructive-fg` | `#970000` | 2.48 | 0.026 | 0.200 |
| `dark.primary-deep` | `#6B6EFF` | 0.50 | 0.009 | 0.220 |
| `light.destructive` | `#E7000B` | 0.60 | 0.006 | 0.245 |

Cả 8 đều là token mà tài liệu tuyên bố tỉ lệ tương phản AA (`dark.primary` "5.6:1", `light.success-fg` "5.6:1 AA on success-bg", `light.destructive-fg` "5.0:1"…). **Bản hex có thể phá vỡ chính các cam kết đó** — Task 4 kiểm chứng bằng test, không tin tài liệu.

## File Structure

| File | Trách nhiệm |
|---|---|
| `frontend/src/design/erp-tokens.json` | Bản sao token gốc — nguồn sự thật duy nhất |
| `frontend/scripts/build-tokens.mjs` | Sinh `tokens.css` + `theme-tokens.ts`. Chứa toàn bộ phép OKLCH→sRGB |
| `frontend/src/design/tokens.css` | *(sinh ra)* biến OKLCH trên `:root`/`.dark` + radius/shadow/motion |
| `frontend/src/design/theme-tokens.ts` | *(sinh ra)* map hex cho `theme.colors` |
| `frontend/src/plugins/vuetify.ts` | *(sửa)* nạp theme từ `theme-tokens.ts`, bỏ hex Material cũ |
| `frontend/src/main.ts` | *(sửa)* import `tokens.css` |
| `frontend/src/layouts/DefaultLayout.vue` | *(sửa)* đồng bộ class `.dark` khi đổi theme |
| `frontend/src/design/__tests__/tokens.spec.ts` | Test parity JSON↔CSS↔theme, định dạng hex, tương phản AA |
| 5 file view/layout | *(sửa)* thay hex hard-code bằng token |

**Thứ tự:** Task 1 sinh file, Task 2–3 nối dây, Task 4 kiểm chứng a11y, Task 5 dọn hex.

---

### Task 1: Script sinh token + hai file đầu ra

**Files:**
- Create: `frontend/src/design/erp-tokens.json` (chép từ `/Users/dev/Downloads/erp-tokens.json`)
- Create: `frontend/scripts/build-tokens.mjs`
- Create: `frontend/src/design/tokens.css` *(do script sinh)*
- Create: `frontend/src/design/theme-tokens.ts` *(do script sinh)*
- Modify: `frontend/package.json` — thêm script `tokens:build`

**Interfaces:**
- Consumes: —
- Produces:
  - `tokens.css` — biến `--background`, `--card`, … trên `:root`, ghi đè trên `.dark`; kèm `--radius-*`, `--shadow-*`, `--duration-*`, `--ease-*`, `--font-*`
  - `theme-tokens.ts` — `export const lightColors: Record<string, string>` và `export const darkColors: Record<string, string>`, giá trị hex 7 ký tự

- [ ] **Step 1: Chép token gốc vào repo**

```bash
mkdir -p frontend/src/design frontend/scripts
cp /Users/dev/Downloads/erp-tokens.json frontend/src/design/erp-tokens.json
```

- [ ] **Step 2: Viết script sinh**

```js
// frontend/scripts/build-tokens.mjs
//
// Sinh tokens.css (OKLCH) và theme-tokens.ts (hex) từ erp-tokens.json.
// Vuetify 4.0.3 không parse được OKLCH — cssColorRe chỉ nhận rgb()/hsl()/hex —
// nên component Vuetify phải dùng hex, còn CSS tự viết dùng OKLCH gốc.
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
      return Math.round(v * 255).toString(16).padStart(2, '0').toUpperCase()
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
const radius = Object.entries(core.radius).map(([k, v]) => `  --radius-${k}: ${v.$value};`).join('\n')
const shadow = Object.entries(core.shadow)
  .map(([k, v]) => {
    const s = v.$value
    return `  --shadow-${k}: ${s.x} ${s.y} ${s.blur} ${s.spread} ${s.color};`
  })
  .join('\n')
const duration = Object.entries(core.duration).map(([k, v]) => `  --duration-${k}: ${v.$value};`).join('\n')
const easing = Object.entries(core.easing).map(([k, v]) => `  --ease-${k}: ${v.$value};`).join('\n')
const font = Object.entries(core.font).map(([k, v]) => `  --font-${k}: ${v.$value};`).join('\n')

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
```

- [ ] **Step 3: Thêm npm script**

Trong `frontend/package.json`, thêm vào `"scripts"`:

```json
    "tokens:build": "node scripts/build-tokens.mjs",
```

- [ ] **Step 4: Chạy và kiểm giá trị đầu ra**

Run: `cd frontend && npm run tokens:build`
Expected: `đã sinh tokens.css và theme-tokens.ts (40 token màu)`

Run: `cd frontend && grep -E '"(primary|background|chart-1)"' src/design/theme-tokens.ts | head -6`
Expected: `light.primary` = `#564AFA`, `light.background` = `#FCFCFC`, `light.chart-1` = `#564AFA`, `dark.primary` = `#8188FF`.
Nếu lệch, phép chuyển đổi sai — dừng lại, đừng đi tiếp.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/design frontend/scripts frontend/package.json
git commit -m "build(frontend): sinh design token OKLCH + hex từ một nguồn sự thật"
```

---

### Task 2: Nạp token vào Vuetify và trang

**Files:**
- Modify: `frontend/src/plugins/vuetify.ts`
- Modify: `frontend/src/main.ts`

**Interfaces:**
- Consumes: `lightColors`, `darkColors` từ `src/design/theme-tokens.ts`
- Produces: theme Vuetify `light`/`dark` chứa đủ 40 khoá màu; biến OKLCH có mặt trên `document.documentElement`

- [ ] **Step 1: Thay theme trong `plugins/vuetify.ts`**

Thay toàn bộ khối `theme` bằng:

```ts
import { lightColors, darkColors } from '../design/theme-tokens'

// ...

  theme: {
    defaultTheme: 'light',
    themes: {
      // Vuetify cần hex; bản OKLCH chính xác hơn nằm ở design/tokens.css và
      // dùng được ở mọi chỗ viết CSS tay (KPI, chart, badge, sidebar).
      light: { dark: false, colors: lightColors },
      dark: { dark: true, colors: darkColors },
    },
  },
```

Giữ nguyên khối `defaults` ở bước này — Task 3 mới chỉnh radius.

- [ ] **Step 2: Import tokens.css trong `main.ts`**

Thêm dòng import **trước** `import vuetify from './plugins/vuetify'`:

```ts
import './design/tokens.css'
```

Thứ tự quan trọng: `plugins/vuetify.ts` import `vuetify/styles`, nên đặt token trước để biến có sẵn khi Vuetify khởi tạo.

- [ ] **Step 3: Kiểm tra biên dịch**

Run: `cd frontend && npx vue-tsc -b`
Expected: không lỗi.

Run: `cd frontend && npx vitest run`
Expected: 5 test cũ vẫn PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/plugins/vuetify.ts frontend/src/main.ts
git commit -m "feat(frontend): nạp bảng màu ERP vào Vuetify theme và :root"
```

---

### Task 3: Đồng bộ class `.dark` và radius

Vuetify đổi theme bằng class riêng của nó, không đụng `.dark`. Không đồng bộ thì khối `.dark` trong `tokens.css` **không bao giờ kích hoạt** — mọi CSS tay kẹt ở màu light kể cả khi app đang ở dark mode.

**Files:**
- Modify: `frontend/src/layouts/DefaultLayout.vue`
- Modify: `frontend/src/plugins/vuetify.ts`

**Interfaces:**
- Consumes: `useTheme()` (đã dùng sẵn ở `DefaultLayout.vue:257`), biến `--radius-*` từ `tokens.css`
- Produces: `document.documentElement.classList` chứa `dark` khi và chỉ khi theme là dark

- [ ] **Step 1: Đồng bộ class**

Trong `DefaultLayout.vue`, thay hàm `toggleTheme` (khoảng dòng 423) và thêm đồng bộ lúc mount:

```ts
function syncDarkClass(dark: boolean) {
  // Khối .dark trong design/tokens.css bám vào class này. Vuetify không tự gắn.
  document.documentElement.classList.toggle('dark', dark)
}

function toggleTheme() {
  theme.global.name.value = isDark.value ? 'light' : 'dark'
  syncDarkClass(theme.global.current.value.dark)
}

onMounted(() => syncDarkClass(isDark.value))
```

Nếu `onMounted` chưa có trong import từ `vue`, thêm vào.

- [ ] **Step 2: Chỉnh radius mặc định theo token**

Design system quy định control 8px, card 14px. Vuetify không có thang đó. Trong `plugins/vuetify.ts`, sửa khối `defaults`:

```ts
  defaults: {
    // Token quy định: control = radius-md (8px), card = radius-xl (14px).
    // Vuetify không có sẵn thang này nên gán trực tiếp qua style.
    VCard: { elevation: 1, style: 'border-radius: var(--radius-xl);' },
    VBtn: { style: 'border-radius: var(--radius-md);' },
    VTextField: { variant: 'outlined', density: 'comfortable', style: 'border-radius: var(--radius-md);' },
    VSelect: { variant: 'outlined', density: 'comfortable', style: 'border-radius: var(--radius-md);' },
  },
```

- [ ] **Step 3: Kiểm tra bằng mắt**

Run: `make dev` ở repo root, mở http://localhost:3000, đăng nhập, bấm nút đổi theme.
Expected: nền/chữ/card đổi màu; DevTools thấy `<html class="dark">` khi ở dark mode; chạy trong console `getComputedStyle(document.documentElement).getPropertyValue('--card')` trả `oklch(16% 0.02 285)`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/layouts/DefaultLayout.vue frontend/src/plugins/vuetify.ts
git commit -m "feat(frontend): đồng bộ class .dark và radius theo token"
```

---

### Task 4: Test parity và tương phản AA

Task quan trọng nhất. Nó bắt hai lớp lỗi mắt không thấy: hai nguồn màu lệch nhau, và bản hex phá cam kết AA của tài liệu.

**Files:**
- Create: `frontend/src/design/__tests__/tokens.spec.ts`
- Modify: `frontend/tsconfig.app.json` *(nếu cần `resolveJsonModule`)*

**Interfaces:**
- Consumes: `erp-tokens.json`, `theme-tokens.ts`, `tokens.css`

- [ ] **Step 1: Viết test**

```ts
// frontend/src/design/__tests__/tokens.spec.ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import tokens from '../erp-tokens.json'
import { lightColors, darkColors } from '../theme-tokens'

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
    // 8 giá trị lệch gamut đều nằm trong các cặp này — xem bảng sai số trong plan.
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
```

- [ ] **Step 2: Chạy test**

Run: `cd frontend && npx vitest run src/design`
Expected: 4 test.

**Nếu test tương phản FAIL, đừng sửa test** — đó là phát hiện thật: bản hex phá cam kết AA của tài liệu. Ghi lại cặp nào hỏng và tỉ lệ thật, rồi báo lên để quyết định (giảm chroma trong token nguồn, hay chấp nhận và ghi ngoại lệ).

- [ ] **Step 3: Bật `resolveJsonModule` nếu `vue-tsc` báo lỗi import JSON**

Trong `frontend/tsconfig.app.json`, thêm vào `compilerOptions`:

```json
    "resolveJsonModule": true,
```

Run: `cd frontend && npx vue-tsc -b`
Expected: không lỗi.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/design/__tests__ frontend/tsconfig.app.json
git commit -m "test(frontend): khoá parity token và tương phản AA của bản hex"
```

---

### Task 5: Dọn hex hard-code

**Files:**
- Create: `frontend/src/design/chart-tokens.ts`
- Modify: `frontend/src/views/Dashboard.vue` (dòng ~135, 385, 393, 400, 412)
- Modify: `frontend/src/views/Jobs/JobDetail.vue` (dòng ~459, 464, 506, 621, 626, 664, 750, 924, 925)
- Modify: `frontend/src/views/Messages.vue` (dòng ~292, 479)
- Modify: `frontend/src/views/NotificationLogs.vue` (dòng ~41)
- Modify: `frontend/src/layouts/DefaultLayout.vue` (dòng ~160)

**Interfaces:**
- Consumes: biến CSS từ `tokens.css`
- Produces: `chartTokens()` — đọc màu biểu đồ từ CSS var

- [ ] **Step 1: Viết helper cho chart.js**

```ts
// frontend/src/design/chart-tokens.ts
// chart.js nhận màu dạng chuỗi CSS, không nhận biến — phải đọc giá trị đã tính.
// Gọi lại sau mỗi lần đổi theme; giá trị thay đổi theo class .dark.
export function chartTokens() {
  const s = getComputedStyle(document.documentElement)
  const g = (n: string) => s.getPropertyValue(n).trim()
  return {
    c1: g('--chart-1'), c2: g('--chart-2'), c3: g('--chart-3'),
    c4: g('--chart-4'), c5: g('--chart-5'),
    foreground: g('--foreground'),
    muted: g('--muted-foreground'),
    border: g('--border'),
    success: g('--success'),
    destructive: g('--destructive'),
  }
}
```

- [ ] **Step 2: Thay màu biểu đồ**

`Dashboard.vue`: `#5C6BC0` → `chartTokens().c1`, `#66BB6A` → `chartTokens().c4`, `#FFA726` → `chartTokens().c2`.
`JobDetail.vue` dòng 924–925: `#66BB6A` (Đạt) → `chartTokens().success`, `#EF5350` (Không đạt) → `chartTokens().destructive`.

Chart phải vẽ lại khi đổi theme — nếu dataset là `computed`, thêm phụ thuộc vào theme hiện tại để nó tính lại.

- [ ] **Step 3: Thay các hex còn lại**

Với mỗi hex còn lại trong 5 file trên, thay bằng tên màu Vuetify tương ứng (`color="primary"`, `color="success"`…) hoặc `var(--token)` nếu là CSS thuần. Liệt kê đầy đủ:

```bash
cd frontend && grep -rn --include='*.vue' -oE "#[0-9a-fA-F]{6}\b" src
```

- [ ] **Step 4: Kiểm tra**

Run: `cd frontend && npx vue-tsc -b && npx vitest run`
Expected: sạch, mọi test PASS.

Run: `cd frontend && grep -rn --include='*.vue' -oE "#[0-9a-fA-F]{6}\b" src | wc -l`
Expected: `0`

Kiểm tra bằng mắt: mở dashboard và chi tiết công việc, đổi theme, xác nhận biểu đồ đổi màu theo.

- [ ] **Step 5: Commit**

```bash
git add frontend/src
git commit -m "refactor(frontend): thay hex hard-code bằng design token"
```

---

## Sau khi xong

```bash
cd frontend && npx vue-tsc -b && npx vitest run
```

Đổi token về sau: sửa `src/design/erp-tokens.json` → `npm run tokens:build` → chạy test. Hai file sinh ra không bao giờ sửa tay.

## Rủi ro đã biết

**Bản hex có thể phá cam kết AA.** 8 giá trị lệch gamut đáng kể, tập trung đúng ở token có tuyên bố tương phản. Task 4 kiểm bằng test thật thay vì tin tài liệu.

**Vuetify có thể ghi đè màu ở chỗ ta không kiểm soát.** Nhiều component Vuetify dùng SASS variable riêng, không đọc `theme.colors` (màu ripple, một số border). Nếu sau khi áp thấy chỗ nào còn màu Material cũ, phải override qua SASS lúc build — ngoài phạm vi đợt này.

**Radius gán qua `style` là giải pháp thô.** Nó thắng CSS của Vuetify nhưng không áp cho component lồng bên trong. Phương án sạch hơn là cấu hình `sass.variables` trong `vite.config.ts` — cần đo lại thời gian build.

## Nằm ngoài phạm vi đợt này

- Toàn bộ Section 2 của design system (Button, Card, Input, Badge, Table, Dialog, CMDK…) — code React + `cva` + Radix, Vuetify có API riêng, không chép được dòng nào.
- Section 3–4: KPI grid, empty state, skeleton thay spinner, filter bar, layout template.
- Typography scale — Vuetify có thang `text-*` riêng, map lại là việc khác.
- Section 5 (voice & microcopy) và Section 7 (anti-patterns).
