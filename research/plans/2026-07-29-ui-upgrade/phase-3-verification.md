# Phase 3 — Xác minh và chốt chặn (2 story SONG SONG)

> **Đọc `README.md` cùng thư mục trước.**
>
> **REQUIRED SUB-SKILL:** `superpowers:subagent-driven-development` hoặc
> `superpowers:executing-plans`.

**Goal:** Chốt lại chất lượng sau khi 15 story trước merge, và **dựng hàng rào
tự động** để những nợ vừa dọn không quay lại.

**Architecture:** 3A lo phần đo được bằng trình duyệt thật (tương phản, a11y).
3B lo phần đo được bằng phân tích tĩnh (chuỗi cứng, class lỗi thời, màu
palette) và đưa vào CI. Hai story sở hữu tập file rời nhau ⇒ chạy song song.

**Phụ thuộc:** Phase 2 phải xong **toàn bộ 10 story**.

---

### Story 3A: Tương phản và khả năng tiếp cận

**Sở hữu:** `frontend/tests/contrast/**`

**Đặc tả nguồn:** DS §6 (dòng 2523–2635), đã trích trong
`spec-section2-components.md` mục 7.

- [ ] **Step 1: Sửa selector nút theme mà Story 2J vừa đổi**

`tests/contrast/contrast.spec.ts:72-74` hiện bám vào class icon
`.mdi-weather-night` để bấm nút đổi theme, kèm ghi chú rằng nút **không có
`aria-label`**. Story 2J đã thêm nhãn — chuyển selector sang nó:

```ts
// tests/contrast/contrast.spec.ts
async function switchToDark(page: Page) {
  // Trước đợt nâng cấp giao diện, nút này không có aria-label nên test phải
  // bám vào class icon của MDI. Story 2J đã thêm nhãn — dùng nhãn, bền hơn.
  await page.getByRole('button', { name: /chế độ tối|dark mode/i }).click()
  await page.waitForTimeout(50)
}
```

Run: `make test-contrast`
Expected: **14 test dark** chạy được. Nếu fail ngay ở bước bấm nút thì
`aria-label` chưa đúng — kiểm `DefaultLayout.vue` trước khi sửa test.

- [ ] **Step 2: Tách tiện ích dùng chung**

`contrast.spec.ts` hiện giữ `setupRoute`, `ROUTES`, `THEMES` nội bộ. Tách ra
`tests/contrast/helpers.ts` và import lại ở `contrast.spec.ts` — hai file mới
ở Step 3 và Step 5 cần dùng. Story này sở hữu toàn bộ `tests/contrast/**` nên
làm được trọn vẹn.

Run: `make test-contrast`
Expected: 29 test vẫn PASS y như trước khi tách (đây là refactor thuần).

- [ ] **Step 3: Viết test focus-visible**

Phase 0.3 đã cài quy tắc `:focus-visible` toàn cục (quyết định A15). DS §6.2
yêu cầu **mọi** `button`/`a`/`input`/`select` có viền focus nhìn thấy được.

```ts
// frontend/tests/contrast/focus.spec.ts
import { test, expect } from '@playwright/test'
import { setupRoute, THEMES } from './helpers'

// DS §6.2 dòng 2549: "Không bao giờ outline: none mà không có replacement."
for (const theme of THEMES) {
  test(`focus-visible hiện rõ trên mọi control — ${theme}`, async ({ page }) => {
    await setupRoute(page, 'settings', theme)

    const controls = page.locator('button:visible, a[href]:visible, input:visible, select:visible')
    const n = Math.min(await controls.count(), 30)
    expect(n, 'không tìm thấy control nào — view nhiều khả năng dựng hỏng').toBeGreaterThan(3)

    const invisible: string[] = []
    for (let i = 0; i < n; i++) {
      const el = controls.nth(i)
      await el.focus()
      const style = await el.evaluate((node) => {
        const s = getComputedStyle(node)
        return {
          outlineWidth: s.outlineWidth,
          outlineStyle: s.outlineStyle,
          boxShadow: s.boxShadow,
        }
      })
      const hasOutline = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0
      const hasGlow = style.boxShadow !== 'none'
      if (!hasOutline && !hasGlow)
        invisible.push(await el.evaluate((node) => node.outerHTML.slice(0, 120)))
    }

    expect(invisible, `control không có viền focus:\n${invisible.join('\n')}`).toEqual([])
  })
}
```

- [ ] **Step 4: Chạy test focus, sửa chỗ đỏ**

Run: `cd frontend && npx playwright test tests/contrast/focus.spec.ts`
Expected: PASS. Đỏ nghĩa là còn component đặt `outline: none` — tìm và bỏ.

- [ ] **Step 5: Viết test nhãn cho nút icon**

DS §6.4 (dòng 2605) bắt buộc nút chỉ có icon phải mang `aria-label` tiếng Việt.

```ts
// frontend/tests/contrast/a11y-labels.spec.ts
import { test, expect } from '@playwright/test'
import { setupRoute, ROUTES } from './helpers'

for (const route of ROUTES) {
  test(`nút chỉ có icon đều có nhãn — ${route.name}`, async ({ page }) => {
    await setupRoute(page, route.name, 'light')

    const unlabeled = await page.evaluate(() => {
      const out: string[] = []
      for (const btn of Array.from(document.querySelectorAll('button'))) {
        const text = (btn.textContent ?? '').trim()
        const hasIcon = btn.querySelector('.v-icon') !== null
        const labeled =
          btn.hasAttribute('aria-label') ||
          btn.hasAttribute('aria-labelledby') ||
          btn.hasAttribute('title')
        if (hasIcon && text === '' && !labeled) out.push(btn.outerHTML.slice(0, 120))
      }
      return out
    })

    expect(unlabeled, `nút icon thiếu nhãn:\n${unlabeled.join('\n')}`).toEqual([])
  })
}
```

- [ ] **Step 6: Chạy và sửa**

Run: `cd frontend && npx playwright test tests/contrast/a11y-labels.spec.ts`

Chỗ nào đỏ mà nằm trong file của story Phase 2 khác thì **vẫn sửa** — Phase 2
đã đóng, story này là người dọn cuối.

- [ ] **Step 7: Chốt baseline lần cuối**

Run: `make test-contrast`

Với mỗi mục còn lại trong `baseline.json`, ghi lý do vì sao **không** sửa
được. Mục nào không có lý do chính đáng thì sửa màu thay vì chốt nợ.

Run: `make contrast-baseline`

Đọc diff, ghi số mục thêm/bớt vào commit message:

```bash
git diff --stat frontend/tests/contrast/baseline.json
```

**Kỳ vọng:** baseline nhỏ hơn đáng kể so với **30 mục** đầu đợt. Nếu nó *lớn
hơn*, đó là tín hiệu Phase 2 chốt nợ thay vì sửa — dừng lại và báo.

- [ ] **Step 8: Commit**

```bash
git add frontend/tests/contrast
git commit -m "test(frontend): test focus-visible và nhãn nút icon, chốt baseline cuối đợt"
```

---

### Story 3B: Hàng rào tĩnh và CI

**Sở hữu:** `frontend/src/__tests__/**` · `.github/workflows/ci.yml`

Ba nợ vừa dọn ở Phase 2 sẽ quay lại trong vài tuần nếu không có gì chặn. Test
dưới đây chạy trong **vitest** nên **CI đang chạy sẵn** — chúng chặn merge
thật, khác test contrast (Playwright, hiện chỉ chạy tay).

- [ ] **Step 1: Viết hàng rào**

```ts
// frontend/src/__tests__/ui-guards.spec.ts
//
// Bốn hàng rào cho đợt nâng cấp giao diện 2026-07. Chạy trong vitest nên CI
// (.github/workflows/ci.yml, job frontend) chặn merge thật.
//
// Nếu một test ở đây đỏ, ĐỪNG nới regex — sửa file vi phạm. Regex chỉ được
// nới cho ngoại lệ đã bàn, và phải kèm comment ghi lý do.
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const SRC = resolve(here, '..')

function vueFilesIn(dir: string, prefix = ''): { path: string; text: string }[] {
  const out: { path: string; text: string }[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = join(prefix, entry.name)
    if (entry.isDirectory()) out.push(...vueFilesIn(join(dir, entry.name), rel))
    else if (entry.name.endsWith('.vue'))
      out.push({ path: rel, text: readFileSync(join(dir, entry.name), 'utf8') })
  }
  return out
}

const vueFiles = vueFilesIn(SRC)

/** Chỉ soi phần <template> — chuỗi trong <script> có thể là hằng nội bộ. */
function templateOf(text: string): string {
  const m = text.match(/<template>([\s\S]*)<\/template>/)
  return m ? m[1] : ''
}

const VIETNAMESE =
  /[àáâãèéêìíòóôõùúýăđĩũơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i

describe('hàng rào giao diện', () => {
  it('có tìm thấy file .vue để soi — chống test xanh giả', () => {
    expect(vueFiles.length).toBeGreaterThan(20)
  })

  it('không chuỗi tiếng Việt cứng trong template — mọi chuỗi qua $t()', () => {
    const violations: string[] = []
    for (const { path, text } of vueFiles)
      templateOf(text)
        .split('\n')
        .forEach((line, i) => {
          if (!VIETNAMESE.test(line)) return
          if (line.includes('$t(') || /\bt\(/.test(line)) return
          if (line.trimStart().startsWith('<!--')) return // comment tiếng Việt là đúng quy ước repo
          violations.push(`${path}:${i + 1}  ${line.trim().slice(0, 80)}`)
        })
    expect(
      violations,
      `Chuỗi tiếng Việt cứng ngoài $t() (${violations.length} chỗ):\n${violations.join('\n')}`,
    ).toEqual([])
  })

  it('không dùng class typography của Vuetify 3 — Vuetify 4 đã bỏ hẳn', () => {
    // Vuetify 4 dùng thang Material 3; .text-h5/.text-body-2/... KHÔNG tồn tại
    // trong dist/vuetify.css. Đầu đợt có 252 chỗ dùng trên 29 file, tất cả đều
    // là no-op. tokens.css có lớp đệm để chúng vẫn chạy, nhưng code mới phải
    // dùng bậc DS: .text-heading-1 … .text-body-xs, .text-label.
    const LEGACY = /class="[^"]*\btext-(h[1-6]|body-[12]|subtitle-[12]|caption|overline)\b/
    const violations: string[] = []
    for (const { path, text } of vueFiles)
      text.split('\n').forEach((line, i) => {
        if (LEGACY.test(line)) violations.push(`${path}:${i + 1}  ${line.trim().slice(0, 80)}`)
      })
    expect(
      violations,
      `Class typography lỗi thời:\n${violations.join('\n')}`,
    ).toEqual([])
  })

  it('không dùng palette dựng sẵn của Vuetify hay hex cứng — chỉ dùng token', () => {
    // Những màu này không đổi theo theme nên hỏng ở dark mode. Đầu đợt có 6
    // file vi phạm: Messages, JobDetail, NotificationLogs, MCPConnections,
    // Channels, CostLogs.
    const PALETTE =
      /\b(bg|text)-(white|black|grey|blue|orange|red|green|purple|indigo)(-(lighten|darken)-\d)?\b|color="(indigo|orange|blue|deep-purple|grey|red|green|white)"/
    const HEX = /#[0-9a-fA-F]{6}\b/
    const violations: string[] = []
    for (const { path, text } of vueFiles)
      text.split('\n').forEach((line, i) => {
        if (PALETTE.test(line) || HEX.test(line))
          violations.push(`${path}:${i + 1}  ${line.trim().slice(0, 80)}`)
      })
    expect(
      violations,
      `Màu không theo token (${violations.length} chỗ):\n${violations.join('\n')}`,
    ).toEqual([])
  })

  it('không dùng confirm()/alert() native — dùng ConfirmDialog và snackbar', () => {
    const violations: string[] = []
    for (const { path, text } of vueFiles)
      text.split('\n').forEach((line, i) => {
        if (/\bwindow\.(confirm|alert)\s*\(|(?<![.\w])(confirm|alert)\s*\(/.test(line))
          violations.push(`${path}:${i + 1}  ${line.trim().slice(0, 80)}`)
      })
    expect(violations, `confirm()/alert() native:\n${violations.join('\n')}`).toEqual([])
  })
})
```

- [ ] **Step 2: Chạy test — dự kiến đỏ nếu Phase 2 còn sót**

Run: `cd frontend && npx vitest run src/__tests__/ui-guards.spec.ts`

Expected: PASS nếu 10 story Phase 2 đã làm đủ. **Đỏ là kết quả có ích** — nó
liệt kê đúng `file:dòng` còn sót. Sửa chúng (Phase 2 đã đóng, story này dọn
nốt), **đừng nới regex**.

- [ ] **Step 3: Cập nhật số khoá i18n**

`i18n.spec.ts` chốt cứng số khoá (Phase 0.4 đặt 243, story 1D nâng lên 251).
Sau Phase 2 con số đã tăng nhiều. Đếm lại:

```bash
cd frontend && npx vitest run src/__tests__/i18n.spec.ts
```

Test sẽ báo số thật trong message. Sửa số trong `i18n.spec.ts` và ghi vào
commit message vì sao tăng.

- [ ] **Step 4: Đưa test contrast vào CI**

Hiện `.github/workflows/ci.yml` job `frontend` chỉ chạy `npx vitest run` và
`npm run build`. Test contrast là chốt chất lượng thật nhưng **không chặn
merge** — đó là lý do 30 mục nợ tích lại được.

Thêm sau bước `Test` trong job `frontend`:

```yaml
      - name: Cài trình duyệt cho test tương phản
        working-directory: frontend
        run: npx playwright install --with-deps chromium

      - name: Test tương phản AA
        working-directory: frontend
        run: npx playwright test

      - name: Lưu báo cáo khi thất bại
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: frontend/playwright-report/
          retention-days: 7
```

**Cân nhắc trước khi làm:** bước cài Chromium tốn khoảng 1–2 phút mỗi lần
chạy CI. Nếu đó là cái giá không chấp nhận được, hai phương án thay thế:
chạy theo lịch (`schedule:`), hoặc chỉ chạy khi PR đụng `frontend/src/**`
(`paths:`). **Chọn một và ghi lý do vào commit message** — đừng bỏ lửng.

- [ ] **Step 5: Kiểm CI chạy được**

Đẩy nhánh rồi xem workflow. **Luôn truyền `--repo`** (`CLAUDE.md` §"Bẫy: `gh`
phân giải nhầm repo" — có repo public trùng tên, bỏ cờ này từng dẫn tới kết
luận sai hoàn toàn về việc CI có chạy hay không):

```bash
gh run list --repo saucevn/chat-quality-agent --limit 5
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/__tests__ .github/workflows/ci.yml
git commit -m "test(frontend): hàng rào chặn chuỗi cứng, class lỗi thời, màu ngoài token"
```

---

## Kiểm tra cuối đợt

```bash
cd frontend && npx vue-tsc -b && npx vitest run && npm run build
```

```bash
make test-contrast
```

Ba lệnh đếm ở `README.md` §Xác minh phải về **0**.

---

## Sau khi xong: ghi lại cái đã học

Thêm hai mục vào `CLAUDE.md` §"Những cái bẫy đã biết" — đây là kiến thức tốn
công mới có, người tiếp theo sẽ vấp lại nếu không ghi:

1. **Vuetify 4 bỏ thang typography của Vuetify 3.** `.text-h5`,
   `.text-body-2`, `.text-caption`… **không tồn tại** trong
   `dist/vuetify.css`; Vuetify 4 dùng tên Material 3 (`headline-*`, `body-*`,
   `label-*`). Đợt nâng cấp 2026-07 phát hiện 252 chỗ dùng chúng trên 29 file,
   tất cả đều là no-op. `tokens.css` có lớp đệm, nhưng code mới phải dùng bậc
   DS (`.text-heading-1` … `.text-body-xs`, `.text-label`).
2. **Số đo component nằm ở lớp SASS, không ở `defaults`.** Radius, chiều cao
   input, thang chữ đặt trong `frontend/src/design/vuetify-settings.scss`,
   được nạp qua `styles.configFile` ở `vite.config.ts`. Sửa số đo ở đó, đừng
   gán bằng `style` prop từng chỗ — cách đó không áp được cho component lồng
   bên trong.

Và cập nhật `CHANGELOG.md` theo quy ước repo.
