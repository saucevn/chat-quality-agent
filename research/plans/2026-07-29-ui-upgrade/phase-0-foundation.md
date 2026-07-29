# Phase 0 — Nền tảng (CHẶN)

> **Đọc `README.md` cùng thư mục trước.** Global Constraints và Decision
> register ở đó áp cho mọi step dưới đây.
>
> **REQUIRED SUB-SKILL:** `superpowers:subagent-driven-development` hoặc
> `superpowers:executing-plans`.

**Goal:** Đặt toàn bộ số đo của ERP design system vào lớp biến SASS của
Vuetify, sửa pipeline token đang bỏ rơi thang chữ, và tách i18n thành module
— để 15 story sau chạy song song mà không đụng nhau.

**Architecture:** `erp-tokens.json` sinh ra **ba** artifact thay vì hai:
`tokens.css` (CSS var, cho CSS tay), `theme-tokens.ts` (hex, cho Vuetify
theme), và **`_ds-tokens.scss` (biến SASS, cho lớp settings của Vuetify)**.
Một file `vuetify-settings.scss` viết tay `@forward 'vuetify/settings'` với
các biến lấy từ `_ds-tokens.scss`; `vite-plugin-vuetify` nhận file đó qua
`styles.configFile` và biên dịch lại CSS Vuetify từ source.

**Tech Stack:** Vite 8 · vite-plugin-vuetify 2.1.3 · sass-embedded 1.98 ·
Vuetify 4.0.3 · Vitest 4

**Story:** 0.1 → 0.2 → 0.3 → 0.4 → 0.5. **Tuần tự, một agent.** Không song
song hoá trong phase này — 0.2 phụ thuộc file 0.1 sinh ra, 0.5 phải chạy sau
cùng.

---

## Phát hiện then chốt: 252 class typography đang là no-op

**Đây là bug đang chạy, chưa ai phát hiện.**

Vuetify 4 đổi thang typography sang tên Material 3 (`display-*`,
`headline-*`, `title-*`, `body-*`, `label-*`) và **bỏ hẳn** thang Vuetify 3
(`h1..h6`, `subtitle-1/2`, `body-1/2`, `caption`). Đã xác minh:

```
grep -rl 'text-body-2\|text-h5' node_modules/vuetify/           → không kết quả
grep -c '.text-body-2'      node_modules/vuetify/dist/vuetify.css → 0
grep -c '.text-h5'          node_modules/vuetify/dist/vuetify.css → 0
grep -c '.text-body-medium' node_modules/vuetify/dist/vuetify.css → 2
```

Và CQA không tự định nghĩa chúng ở đâu (`src/design/tokens.css` không có).

Trong khi đó view CQA dùng chúng **252 lần trên 29 file**:

| Class | Số lần | Bậc DS tương ứng |
|---|---:|---|
| `text-body-2` | 95 | `body-sm` (14px) |
| `text-caption` | 91 | `body-xs` (12px) — xem quyết định B16 |
| `text-h5` | 26 | `heading-2` (24px) |
| `text-subtitle-1` | 16 | `body-base` (16px) |
| `text-h6` | 13 | `heading-3` (20px) |
| `text-subtitle-2` | 7 | `body-sm` (14px, weight 500) |
| `text-body-1` | 3 | `body-base` (16px) |
| `text-h4` | 1 | `heading-1` (30px) |

Nghĩa là **252 chỗ đang render ở cỡ chữ thừa kế**, không phải cỡ lập trình
viên tưởng. Đây là lý do lớn nhất khiến giao diện trông phẳng và thiếu phân
cấp thị giác — lớn hơn nhiều so với chuyện thiếu một skin đẹp.

**Cách xử lý (quyết định):** Story 0.3 định nghĩa class DS thật
(`.text-heading-1` … `.text-label`) **và** một lớp đệm ánh xạ 8 class chết
sang bậc DS gần nhất. Lớp đệm sửa 252 chỗ **ngay lập tức, không đụng file
view nào** — quan trọng vì view thuộc sở hữu của 10 story Phase 2. Từng story
Phase 2 thay class cũ bằng class DS trong file của mình; Story 3B thêm test
chặn class cũ quay lại.

**Quyết định bổ sung B16:** DS chỉ có bậc `label` (12px/600/UPPERCASE/+0.06em)
nhưng 91 chỗ dùng `text-caption` là chữ nhỏ thường, không phải nhãn viết hoa.
Thêm một bậc **`body-xs` = 12px / 400 / line-height 16px / letter-spacing
normal**. `label` giữ nguyên cho nhãn viết hoa (table header, KPI label).

---

## Số đo hiện tại của Vuetify 4 vs đặc tả DS

Đã grep `node_modules/vuetify` để biết phải ghi đè cái gì:

| Biến SASS | Mặc định Vuetify 4 | DS yêu cầu | Cần đổi? |
|---|---|---|---|
| `$border-radius-root` | `4px` | control = **8px** | **có** |
| `$button-height` | `36px` | md = **36px** | **không** — đã khớp |
| `$field-control-height` | `56px` | input = **36px** | **có** |
| `$input-control-height` | `56px` | **36px** | **có** |
| `$field-font-size` | `16px` | **14px** | **có** |
| `$field-control-padding-start/end` | `16px` | **12px** | **có** |
| `$table-header-height` | `56px` | TableHead **40px** | **có** |
| `$table-row-height` | `52px` | DS không quy định | **không** |
| `$list-item-min-height` | `40px` | DS không quy định | **không** |
| `$chip-height` | `32px` | badge ~19.4px, nhưng CQA dùng chip cho nhiều việc | **không** — xử lý ở `StatusBadge` |
| `$card-elevation` | `1` | `shadow-card` | giữ `1`; màu shadow đặt qua `theme.variables` |

Chín bậc M3 mà component Vuetify **thật sự đọc** trong SCSS (ghi đè đúng chín
cái này; ghi đè bậc khác không có tác dụng gì):
`display-large` · `headline-large` · `headline-medium` · `headline-small` ·
`title-large` · `body-large` · `body-medium` · `label-large` · `label-small`.

---

### Story 0.1: Pipeline token sinh đủ ba artifact

`scripts/build-tokens.mjs` hiện chỉ emit `radius`/`shadow`/`duration`/
`easing`/`font` (dòng 58–76). Nó **bỏ rơi** `fontSize`, `lineHeight`,
`letterSpacing`, `fontWeight`, `spacing` — tất cả đều đã có sẵn trong
`erp-tokens.json`.

**Files:**
- Modify: `frontend/scripts/build-tokens.mjs:58-76`
- Create: `frontend/src/design/_ds-tokens.scss` *(do script sinh)*
- Modify: `frontend/src/design/tokens.css` *(do script sinh)*
- Modify: `frontend/src/design/__tests__/tokens.spec.ts`

**Interfaces:**
- Consumes: `frontend/src/design/erp-tokens.json`
- Produces:
  - `tokens.css` — thêm `--font-size-*`, `--line-height-*`, `--tracking-*`,
    `--font-weight-*`, `--space-*`
  - `_ds-tokens.scss` — biến SASS `$radius-*`, `$font-size-*`,
    `$line-height-*`, `$tracking-*`, `$font-weight-*`, `$space-*`

- [ ] **Step 1: Viết test thất bại**

Thêm vào cuối `describe` trong `frontend/src/design/__tests__/tokens.spec.ts`:

```ts
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
```

- [ ] **Step 2: Chạy test để chắc chắn nó đỏ**

Run: `cd frontend && npx vitest run src/design`
Expected: FAIL — `thiếu --font-size-display-lg`, và `ENOENT ... _ds-tokens.scss`.

- [ ] **Step 3: Mở rộng script sinh**

Trong `frontend/scripts/build-tokens.mjs`, **thay** khối dòng 58–76 bằng:

```js
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
```

**Thêm** `${fontSize}`, `${lineHeight}`, `${tracking}`, `${fontWeight}`,
`${spacing}` vào template `css` ngay sau `${font}` (bên trong khối `:root`).

**Thêm** khối sinh SCSS ngay trước `mkdirSync`:

```js
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
```

Và thêm dòng ghi file cạnh hai dòng `writeFileSync` sẵn có:

```js
writeFileSync(resolve(DESIGN, '_ds-tokens.scss'), scss)
```

- [ ] **Step 4: Chạy script và kiểm đầu ra**

Run: `cd frontend && npm run tokens:build`
Expected: `đã sinh tokens.css và theme-tokens.ts (43 token màu)`

Run: `cd frontend && grep -c '^\$' src/design/_ds-tokens.scss`
Expected: `43` — 6 radius + 9 fontSize (8 + body-xs) + 8 lineHeight
(7 + body-xs) + 4 tracking + 4 fontWeight + 12 spacing. Ra số khác thì đếm
lại từng nhóm trước khi đi tiếp; lệch nghĩa là một nhóm không được emit.

Run: `cd frontend && grep -E '^\$(radius-md|font-size-heading-1|line-height-body-xs):' src/design/_ds-tokens.scss`
Expected:
```
$radius-md: 8px;
$font-size-heading-1: 30px;
$line-height-body-xs: 16px;
```

- [ ] **Step 5: Chạy test để chắc chắn nó xanh**

Run: `cd frontend && npx vitest run src/design`
Expected: PASS (4 test cũ + 2 test mới).

- [ ] **Step 6: Commit**

```bash
git add frontend/scripts/build-tokens.mjs frontend/src/design
git commit -m "build(frontend): sinh thang chữ, spacing và biến SASS từ erp-tokens.json"
```

---

### Story 0.2: Bật lớp SASS của Vuetify

**Files:**
- Create: `frontend/src/design/vuetify-settings.scss`
- Modify: `frontend/vite.config.ts:9-10`

**Interfaces:**
- Consumes: `frontend/src/design/_ds-tokens.scss` (Story 0.1)
- Produces: CSS Vuetify biên dịch lại với radius/typography/số đo của DS

- [ ] **Step 1: Viết file settings**

Tạo `frontend/src/design/vuetify-settings.scss`:

```scss
// Lớp settings của Vuetify — vite-plugin-vuetify nạp file này qua
// styles.configFile và biên dịch lại SCSS của TỪNG component Vuetify với các
// biến dưới đây. Không có nó thì mọi số đo phải gán bằng `style` prop từng
// chỗ, và không áp được cho component lồng bên trong.
//
// Chỉ ghi đè cái ERP design system quy định. Cái nào Vuetify mặc định đã khớp
// đặc tả thì để nguyên (ví dụ $button-height: 36px).
@use './ds-tokens' as ds;

@forward 'vuetify/settings' with (
  // Radius: control 8px, card 14px — DS §1.4, quyết định A10.
  $border-radius-root: ds.$radius-md,
  $rounded: (
    0: 0,
    'sm': ds.$radius-sm,
    null: ds.$radius-md,
    'md': ds.$radius-md,
    'lg': ds.$radius-lg,
    'xl': ds.$radius-xl,
    'pill': ds.$radius-full,
    'circle': 50%,
    'shaped': ds.$radius-xl 0
  ),

  // Thang chữ: chỉ ghi đè 9 bậc Material 3 mà component Vuetify thật sự đọc
  // trong SCSS của nó. Ánh xạ bậc M3 → bậc DS theo cỡ chữ gần nhất.
  $typography: (
    'display-large':   ('size': ds.$font-size-display-lg, 'weight': ds.$font-weight-bold,     'line-height': 1.1,  'letter-spacing': ds.$tracking-tight),
    'headline-large':  ('size': ds.$font-size-heading-1,  'weight': ds.$font-weight-bold,     'line-height': 1.2,  'letter-spacing': ds.$tracking-tight),
    'headline-medium': ('size': ds.$font-size-heading-2,  'weight': ds.$font-weight-semibold, 'line-height': 1.33, 'letter-spacing': ds.$tracking-snug),
    'headline-small':  ('size': ds.$font-size-heading-3,  'weight': ds.$font-weight-semibold, 'line-height': 1.4,  'letter-spacing': normal),
    'title-large':     ('size': ds.$font-size-heading-3,  'weight': ds.$font-weight-semibold, 'line-height': 1.4,  'letter-spacing': normal),
    'body-large':      ('size': ds.$font-size-body-base,  'weight': ds.$font-weight-regular,  'line-height': 1.5,  'letter-spacing': normal),
    'body-medium':     ('size': ds.$font-size-body-sm,    'weight': ds.$font-weight-regular,  'line-height': 1.43, 'letter-spacing': normal),
    'label-large':     ('size': ds.$font-size-body-sm,    'weight': ds.$font-weight-medium,   'line-height': 1.43, 'letter-spacing': normal),
    'label-small':     ('size': ds.$font-size-label,      'weight': ds.$font-weight-semibold, 'line-height': 1.33, 'letter-spacing': ds.$tracking-wide)
  ),

  // Input: DS §2.3 quy định cao 36px, chữ 14px, padding ngang 12px.
  // Vuetify mặc định 56px/16px/16px (kích thước Material floating-label).
  $field-control-height: 36px,
  $input-control-height: 36px,
  $field-font-size: ds.$font-size-body-sm,
  $field-control-padding-start: ds.$space-3,
  $field-control-padding-end: ds.$space-3,

  // Table: DS §2.6 quy định ô header cao 40px. Chiều cao row body DS không
  // quy định — giữ mặc định 52px của Vuetify.
  $table-header-height: 40px
);
```

**Lưu ý:** `@use './ds-tokens'` — không gạch dưới, không đuôi file. Đó là cách
Sass tham chiếu partial `_ds-tokens.scss`.

- [ ] **Step 2: Bật configFile trong vite.config.ts**

Trong `frontend/vite.config.ts`, thay dòng plugin Vuetify bằng:

```ts
    vuetify({
      autoImport: true,
      // Biên dịch lại SCSS của từng component Vuetify với biến của ERP design
      // system. Bỏ dòng styles này là mọi số đo trong vuetify-settings.scss
      // mất tác dụng — Vuetify quay về dùng CSS dựng sẵn.
      styles: { configFile: 'src/design/vuetify-settings.scss' },
    }),
```

- [ ] **Step 3: Kiểm biên dịch và đo thời gian build**

Run: `cd frontend && time npm run build`
Expected: build thành công, không lỗi Sass.

**Ghi lại con số này** — mốc để so ở Story 0.5. Nếu Sass báo
`Undefined variable`, tên biến trong `_ds-tokens.scss` không khớp tên dùng ở
`vuetify-settings.scss`; đọc file sinh ra chứ đừng đoán:

```bash
cd frontend && grep -n '^\$' src/design/_ds-tokens.scss
```

- [ ] **Step 4: Kiểm số đo đã thật sự đổi**

Run: `cd frontend && grep -c 'border-radius: 8px' dist/assets/*.css`
Expected: `> 0`. Nếu `0` thì `configFile` chưa có tác dụng — kiểm lại đường
dẫn trong `vite.config.ts`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/design/vuetify-settings.scss frontend/vite.config.ts
git commit -m "build(frontend): biên dịch Vuetify với biến SASS của design system"
```

---

### Story 0.3: theme.variables, defaults, font, focus, class typography

**Files:**
- Modify: `frontend/src/plugins/vuetify.ts`
- Modify: `frontend/scripts/build-tokens.mjs`
- Modify: `frontend/src/design/__tests__/tokens.spec.ts`

**Interfaces:**
- Consumes: `lightColors`/`darkColors` (`theme-tokens.ts`), CSS var từ `tokens.css`
- Produces: class `.text-heading-1` … `.text-label`, `.text-body-xs`; lớp đệm
  cho 8 class Vuetify 3 đã chết; alias `IconBtn`; `--v-font-body` được nối

- [ ] **Step 1: Viết test thất bại**

Thêm vào `frontend/src/design/__tests__/tokens.spec.ts`:

```ts
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
```

- [ ] **Step 2: Chạy test để chắc chắn nó đỏ**

Run: `cd frontend && npx vitest run src/design`
Expected: FAIL — `thiếu .text-heading-1`.

- [ ] **Step 3: Sinh class typography trong tokens.css**

Trong `frontend/scripts/build-tokens.mjs`, thêm sau khối `spacing`:

```js
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
```

Thêm `${typoClasses}`, `${legacyClasses}`, `${globalRules}` vào template `css`
**sau** khối `.dark { … }` — chúng là rule, không phải khai báo biến, nên
không được nằm trong `:root`.

- [ ] **Step 4: theme.variables, defaults, alias**

Trong `frontend/src/plugins/vuetify.ts`, thêm import ở đầu file:

```ts
import { VBtn } from 'vuetify/components'
```

Thêm hằng trước khối `createVuetify`:

```ts
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
```

Thêm `variables: sharedVariables` vào **cả hai** theme, cạnh `colors`.

Thay khối `defaults` bằng:

```ts
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
    VTextField: { variant: 'outlined', density: 'comfortable', hideDetails: 'auto' },
    VSelect: { variant: 'outlined', density: 'comfortable', hideDetails: 'auto' },
    VTextarea: { variant: 'outlined', density: 'comfortable', hideDetails: 'auto' },
    VAutocomplete: { variant: 'outlined', density: 'comfortable', hideDetails: 'auto' },
    VCombobox: { variant: 'outlined', density: 'comfortable', hideDetails: 'auto' },
    VFileInput: { variant: 'outlined', density: 'comfortable', hideDetails: 'auto' },
    VSwitch: { inset: true, color: 'primary', hideDetails: 'auto' },
    VCheckbox: { color: 'primary', hideDetails: 'auto' },
    VChip: { variant: 'tonal' },
    VDialog: { maxWidth: 420 }, // quyết định A9
  },
```

- [ ] **Step 5: Chạy lại pipeline và test**

Run: `cd frontend && npm run tokens:build && npx vitest run src/design`
Expected: PASS toàn bộ.

Run: `cd frontend && npx vue-tsc -b`
Expected: không lỗi.

- [ ] **Step 6: Kiểm bằng mắt**

Run: `make dev`, mở http://localhost:3000, đăng nhập.
Expected: cỡ chữ có phân cấp rõ; ô nhập cao 36px chứ không 56px; Tab qua
control thấy viền focus 2px màu `--ring`.

Trong DevTools console:
```js
getComputedStyle(document.body).fontFamily
```
Expected: bắt đầu bằng `ui-sans-serif`, **không** phải `Roboto`.

```js
getComputedStyle(document.querySelector('.text-body-2')).fontSize
```
Expected: `14px` (trước Phase 0 sẽ là cỡ thừa kế, thường `16px`).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/plugins/vuetify.ts frontend/scripts/build-tokens.mjs frontend/src/design
git commit -m "feat(frontend): thang chữ DS, theme.variables, defaults và focus toàn cục"
```

---

### Story 0.4: Tách i18n thành module theo domain

Không tách thì 15 story Phase 1/2 cùng sửa `vi.ts` và `en.ts` — xung đột merge
chắc chắn. Mỗi file hiện 288 dòng, **243 key**, namespace phẳng, chỉ nhóm bằng
comment.

**Files:**
- Create: `frontend/src/i18n/vi/{index,common,auth,nav,tenants,channels,messages,jobs,job-detail,dashboard,settings,users,logs,mcp,errors}.ts`
- Create: `frontend/src/i18n/en/` *(cùng 15 file)*
- Delete: `frontend/src/i18n/vi.ts`, `frontend/src/i18n/en.ts`
- Modify: `frontend/src/__tests__/i18n.spec.ts`

**Interfaces:**
- Produces: `vi` / `en` — object **phẳng** y hệt hiện tại (gộp từ 14 module).
  **Không đổi tên key nào** — mọi `$t('...')` đang có phải chạy nguyên.
  `src/i18n/index.ts` **không cần sửa**: `import vi from './vi'` tự resolve
  sang `./vi/index.ts`.

- [ ] **Step 1: Cập nhật test cho cấu trúc module**

Thay `frontend/src/__tests__/i18n.spec.ts` bằng:

```ts
import { describe, it, expect } from 'vitest'
import vi from '../i18n/vi'
import en from '../i18n/en'

describe('i18n', () => {
  it('vi và en có cùng tập khoá', () => {
    expect(Object.keys(vi).sort()).toEqual(Object.keys(en).sort())
  })

  it('không khoá nào rỗng', () => {
    for (const [k, v] of Object.entries(vi)) expect(v, `vi.${k} rỗng`).toBeTruthy()
    for (const [k, v] of Object.entries(en)) expect(v, `en.${k} rỗng`).toBeTruthy()
  })

  it('giữ đúng 243 khoá sau khi tách module', () => {
    // Chốt cứng để việc tách không làm rơi key. Story nào thêm key mới thì
    // cập nhật số này trong cùng commit — đó là điểm reviewer nhìn thấy.
    expect(Object.keys(vi)).toHaveLength(243)
  })

  it('không khoá nào bị khai trùng ở hai module', () => {
    // Object spread nuốt trùng lặp im lặng; test này bắt nó.
    const files = import.meta.glob('../i18n/vi/*.ts', { eager: true }) as Record<
      string,
      { default: Record<string, string> }
    >
    const seen = new Map<string, string>()
    const dupes: string[] = []
    for (const [path, mod] of Object.entries(files)) {
      if (path.endsWith('/index.ts')) continue
      for (const k of Object.keys(mod.default)) {
        if (seen.has(k)) dupes.push(`${k}: ${seen.get(k)} và ${path}`)
        seen.set(k, path)
      }
    }
    expect(dupes, `khoá trùng:\n${dupes.join('\n')}`).toEqual([])
  })
})
```

- [ ] **Step 2: Chạy test để chắc chắn nó đỏ**

Run: `cd frontend && npx vitest run src/__tests__`
Expected: FAIL — không resolve được `../i18n/vi` (đang là `vi.ts`, chưa có thư mục).

- [ ] **Step 3: Tách theo đúng ranh giới comment sẵn có**

`vi.ts` và `en.ts` đã chia nhóm bằng comment, **cùng vị trí dòng ở cả hai
file**. Dùng chính ranh giới đó:

| Module | Nhóm comment gốc | Dòng trong `vi.ts` |
|---|---|---|
| `common.ts` | Common | 2–24 |
| `auth.ts` | Auth | 25–36 |
| `nav.ts` | Navigation | 37–45 |
| `tenants.ts` | Tenants | 46–53 |
| `channels.ts` | Channels + Channel Dialog | 54–66, 165–188 |
| `jobs.ts` | Jobs + Output + Schedule + Job Wizard + Job Edit + Cron Picker | 67–97, 139–164, 264–275, 283–288 |
| `dashboard.ts` | Dashboard | 98–112 |
| `job-detail.ts` | Results + Job Detail | 113–119, 189–216 |
| `settings.ts` | Settings + Settings detail | 120–138, 251–258 |
| `users.ts` | User Management | 217–236 |
| `logs.ts` | Notification Logs | 237–242 |
| `mcp.ts` | MCP | 243–250 |
| `messages.ts` | Messages | 259–263 |
| `errors.ts` | Validation | 276–282 |

Mỗi file có dạng:

```ts
// frontend/src/i18n/vi/common.ts
export default {
  app_name: 'Chat Quality Agent',
  save: 'Lưu',
  // … đúng các key của nhóm, giữ nguyên giá trị
}
```

Tạo `frontend/src/i18n/vi/index.ts`:

```ts
// Gộp 14 module thành một object phẳng — vue-i18n nhận namespace phẳng như
// trước khi tách, nên mọi $t('...') đang có chạy nguyên, không đổi tên key.
// Tách file để 15 story của đợt nâng cấp giao diện không cùng sửa một file.
import common from './common'
import auth from './auth'
import nav from './nav'
import tenants from './tenants'
import channels from './channels'
import messages from './messages'
import jobs from './jobs'
import jobDetail from './job-detail'
import dashboard from './dashboard'
import settings from './settings'
import users from './users'
import logs from './logs'
import mcp from './mcp'
import errors from './errors'

export default {
  ...common, ...auth, ...nav, ...tenants, ...channels, ...messages,
  ...jobs, ...jobDetail, ...dashboard, ...settings, ...users, ...logs,
  ...mcp, ...errors,
}
```

Làm y hệt cho `en/`. Xoá `vi.ts` và `en.ts`.

- [ ] **Step 4: Chạy test để chắc chắn nó xanh**

Run: `cd frontend && npx vitest run`
Expected: PASS. Test "243 khoá" đỏ với số nhỏ hơn ⇒ tách sót key; test "khoá
trùng" chỉ đúng file nào chép đè.

Run: `cd frontend && npx vue-tsc -b`
Expected: không lỗi.

- [ ] **Step 5: Kiểm bằng mắt**

Run: `make dev`, đổi ngôn ngữ vi ↔ en trong sidebar.
Expected: mọi nhãn đổi bình thường, không chỗ nào hiện tên key thô.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/i18n frontend/src/__tests__/i18n.spec.ts
git commit -m "refactor(frontend): tách i18n thành module theo domain để chạy song song"
```

---

### Story 0.5: Chốt baseline contrast và đo lại build

**Files:**
- Modify: `frontend/tests/contrast/baseline.json`
- Modify: `research/plans/2026-07-29-ui-upgrade/phase-0-foundation.md` *(mục "Nợ màu bàn giao")*

- [ ] **Step 1: Chạy test contrast để xem thiệt hại**

Run: `make test-contrast`
Expected: **một số test đỏ.** Đây là dự kiến — nâng `medium-emphasis-opacity`
0.60 → 0.72 và đổi cỡ chữ toàn app chắc chắn sinh cặp màu mới.

- [ ] **Step 2: Phân loại từng cặp mới, không chốt mù**

Với mỗi cặp mới không đạt AA, quyết định theo thứ tự:

1. Là màu palette Vuetify cứng (`bg-grey-lighten-*`, `color="indigo"`…)?
   ⇒ **không chốt vào baseline.** Ghi vào mục "Nợ màu bàn giao" dưới đây;
   story Phase 2 sở hữu file đó sẽ sửa.
2. Là token DS dùng sai chỗ (ví dụ `--destructive` trên nền sáng thay vì
   `--destructive-fg`)? ⇒ **không chốt.** Bàn giao như trên.
3. Là hệ quả trực tiếp của việc đổi emphasis? ⇒ nếu tỉ số **tăng** so với mục
   cũ, xoá mục cũ khỏi baseline. Nếu **giảm**, dừng lại — nghĩa là chọn sai
   giá trị emphasis.

- [ ] **Step 3: Chốt baseline cho phần còn lại**

Run: `make contrast-baseline`

Đọc diff và ghi vào commit message số mục thêm/bớt cùng lý do:

```bash
git diff --stat frontend/tests/contrast/baseline.json
```

- [ ] **Step 4: Đo lại thời gian build**

Run: `cd frontend && time npm run build`

So với con số ghi ở Story 0.2 Step 3.

**Ngưỡng:** nếu build production chậm hơn **gấp đôi** mức trước Phase 0, dừng
lại và báo — tín hiệu xem lại quyết định bật `configFile`, không âm thầm chịu
đựng.

- [ ] **Step 5: Điền mục "Nợ màu bàn giao" bên dưới**

- [ ] **Step 6: Commit**

```bash
git add frontend/tests/contrast/baseline.json research/plans/2026-07-29-ui-upgrade/phase-0-foundation.md
git commit -m "test(frontend): chốt lại baseline tương phản sau khi đổi nền tảng giao diện"
```

---

## Nợ màu bàn giao

*(Story 0.5 Step 5 điền bảng này. Story Phase 2 đọc để biết cái gì thuộc về
mình.)*

Đã biết trước từ `baseline.json` hiện tại, ít nhất các mục sau thuộc loại
"màu cứng, phải sửa ở view" chứ không phải nợ nền tảng:

| Cặp màu | Tỉ số | Nguồn | Story |
|---|---|---|---|
| `#673AB7` trên `#171129` | 2.49:1 | `CostLogs.vue:37` — `color="deep-purple"` | 2H |
| `#E17100` trên `#FBEEE0` | 2.80:1 | `DefaultLayout.vue:103-106` — chip version (15/15 route light) | 2J |
| `#E7000B` trên `#FCE0E1` | 3.84:1 | chip error tonal (6 route) | 2H |
| 7 mục `messages/light` + 6 mục `messages/dark` | 1.95–4.12:1 | `Messages.vue` — chip channel tonal + timestamp `opacity: 0.6` | 2C |
| 5 mục `dashboard/light` + 1 `dashboard/dark` | — | chip severity + banner demo amber | 2A |
| `#7F7F84` trên `#FFFFFF` | 3.98:1 | label `v-select` (7 route) — **kỳ vọng tự khỏi** sau khi nâng emphasis | 0.5 |

---

## Kiểm tra cuối phase

```bash
cd frontend && npx vue-tsc -b && npx vitest run
```

```bash
make test-contrast
```

```bash
cd frontend && npm run build
```

Cả ba phải xanh trước khi mở Phase 1 và Phase 2.
