# Nâng cấp giao diện CQA — Tài liệu điều phối

> **Đây không phải plan thực thi.** Đây là tài liệu điều phối cho **18 dev
> story** nằm ở các file `phase-*.md` cùng thư mục. Đọc file này trước, nhận
> story, rồi mở đúng mục của story đó.
>
> **Agent thực thi story:** REQUIRED SUB-SKILL — dùng
> `superpowers:subagent-driven-development` hoặc `superpowers:executing-plans`.
> Mọi step dùng cú pháp checkbox `- [ ]` để theo dõi.

**Goal:** Đưa giao diện CQA khớp `ERP-design-system-v2.md` (§2–§7) và đồng
thời dọn nợ kỹ thuật giao diện đang làm hỏng dark mode, che lỗi API, và bỏ
trống trạng thái tải — chia thành các story sở hữu tập file rời nhau để nhiều
subagent chạy song song.

**Architecture:** Một phase nền tảng chặn (Phase 0) đặt toàn bộ số đo vào lớp
biến SASS của Vuetify và tách i18n thành module — sau đó mọi thứ chạy song
song. Phase 1 dựng component dùng chung (file mới, không đụng view). Phase 2
áp vào từng nhóm view (mỗi story một nhóm file rời nhau). Phase 3 xác minh.
Nguyên tắc xuyên suốt: **hai story không bao giờ sửa cùng một file.**

**Tech Stack:** Vue 3.5 · Vuetify 4.0.3 · Vite 8 · TypeScript strict ·
Vitest 4 · Playwright (contrast) · vue-i18n 9 — **không thêm dependency
runtime mới**.

---

## Global Constraints

Áp cho **mọi** story. Không story nào được vi phạm, kể cả khi plan riêng
không nhắc lại.

- **Không thêm dependency runtime mới.** Dev dependency chỉ thêm nếu plan
  story ghi rõ lý do.
- **Vuetify 4.0.3 không parse được `oklch()`** — `cssColorRe` trong
  `frontend/node_modules/vuetify/lib/util/colorUtils.js` chỉ khớp
  `rgb|hsl`. Mọi màu vào `theme.colors` phải là hex. Đây là lý do tồn tại
  của `scripts/build-tokens.mjs`.
- **Một nguồn sự thật cho màu và số đo:** `frontend/src/design/erp-tokens.json`.
  **Cấm hard-code hex, cấm dùng palette dựng sẵn của Vuetify**
  (`bg-white`, `bg-grey-lighten-*`, `bg-blue-lighten-*`, `bg-orange-lighten-*`,
  `text-blue`, `color="indigo|orange|blue|deep-purple|grey"`). Hai file
  `tokens.css` và `theme-tokens.ts` là file **sinh ra** — không sửa tay.
- **Mọi chuỗi hiển thị đi qua `$t()`.** Không chuỗi tiếng Việt cứng trong
  template. Thêm key vào **module i18n của story mình**, cả `vi` và `en`.
- **Tài liệu và comment viết bằng tiếng Việt** (quy ước repo, `CLAUDE.md`).
- **Test phải xanh trước khi commit:**
  `cd frontend && npx vue-tsc -b && npx vitest run`.
  TypeScript đang bật `strict` + `noUnusedLocals` + `noUnusedParameters` —
  import thừa làm đỏ build.
- **Đổi màu hoặc đổi bố cục ⇒ chạy `make test-contrast`** và xử lý baseline
  theo §Xác minh. CI **không** chạy test này (`.github/workflows/ci.yml` job
  frontend chỉ `vitest` + `build`), nên nó là trách nhiệm của story.
- **Commit thường xuyên**, mỗi step có deliverable thì commit.
- **Không đổi API backend.** Đợt này thuần frontend.

---

## Bối cảnh: vì sao có đợt này

Ba nguồn hội tụ:

1. **`ERP-design-system-v2.md`** (người dùng cung cấp 2026-07-26) — nguồn
   thẩm quyền về thiết kế. Section 1 (token) **đã làm xong** ở
   `research/plans/2026-07-26-design-tokens.md`. Plan đó **cố ý** để lại
   ngoài phạm vi (dòng 525–531): Section 2 (component), Section 3–4 (pattern
   + layout), typography scale, Section 5 (microcopy), Section 7
   (anti-pattern). **Đó chính là phạm vi đợt này.**

2. **Kiểm kê 18 view hiện tại** (`research/materio-template-analysis.md` §6)
   — bằng chứng thực nghiệm rằng những khoảng trống đó đang gây hại:
   `v-skeleton-loader` **0 lần**, `v-empty-state` **0 lần**, `v-data-table`
   **0 lần**, ~250 dòng tiếng Việt cứng ngoài `$t()`, 6 file dùng màu cứng
   hỏng dark mode, 4 chỗ nuốt lỗi API im lặng.

3. **Nghiên cứu template Materio** (`research/materio-template-analysis.md`)
   — đã xác minh ba điều then chốt cho kế hoạch này:
   - Lớp biến SASS của Vuetify **còn nguyên tên** ở 4.0.3
     (`$border-radius-root`, `$typography`, `$button-height`,
     `$card-elevation`, `$table-row-height`, `$list-item-min-height`,
     `$field-outline-opacity`).
   - `vite-plugin-vuetify@2.1.3` **có** hỗ trợ `styles: { configFile }`
     (`@vuetify/loader-shared/dist/index.d.ts`).
   - `--v-font-body` xuất hiện **183 lần** trong `dist/vuetify.css` dựng sẵn
     ⇒ nối font token bằng **một dòng CSS**.

**Materio KHÔNG phải nguồn quyết định thiết kế.** Ở đâu Materio và ERP design
system nói khác nhau, **ERP design system thắng**. Materio chỉ đóng góp hiểu
biết về *cơ chế* Vuetify.

---

## Decision register — chốt các mâu thuẫn của đặc tả

`ERP-design-system-v2.md` có **17 mâu thuẫn nội tại** và **15 chỗ thiếu đặc
tả**. Nếu để mỗi story tự diễn giải thì 18 subagent sẽ ra 18 kết quả khác
nhau. Bảng dưới là **quyết định đã chốt** — mọi story tuân theo, không tự
diễn giải lại.

### Mâu thuẫn (A)

| ID | Vấn đề trong tài liệu | Quyết định | Lý do |
|---|---|---|---|
| A1 | Nút loading: mô tả nói ẩn text giữ width; code render cả spinner lẫn text | Dùng prop `loading` **native của Vuetify** — giữ width, ẩn nội dung | Không tự chế cái Vuetify đã làm đúng |
| A2 | `idle` mang hai nghĩa trái ngược (đang rảnh / ngoại tuyến) | **Bỏ từ vựng agent của DS.** CQA dùng trạng thái thật của mình — xem bảng ánh xạ ở §Contract | Từ vựng DS thuộc sản phẩm khác |
| A3 | Badge amber hard-code OKLCH inline dù đã có token | **Luôn dùng token.** Anti-pattern #8 của chính tài liệu thắng | Tài liệu tự mâu thuẫn; token thắng |
| A4·A5·A6 | Ba bộ số tỉ lệ tương phản khác nhau cho cùng token | Số trong tài liệu là **không quy chuẩn**. Giá trị **đo được** bởi `tokens.spec.ts` + Playwright là nguồn sự thật | Đo thắng tuyên bố |
| A7 | Tài liệu viết "7:1 AA, không AAA" | Tài liệu **sai** — 7:1 *chính là* ngưỡng AAA. Ngưỡng dùng: **4.5** chữ thường · **3.0** chữ lớn · **7.0** cho số KPI | WCAG 2.1 |
| A8 | Lập luận dựa trên nền dark `oklch(18%)` không tồn tại | `erp-tokens.json` thắng: `--background` 12%, `--card` 16% | JSON là nguồn sự thật |
| A9 | Dialog width 420px vs 425px | **420px** | Chia hết 4, khớp lưới 4px |
| A10 | Radius không nhất quán giữa §1.4 và component | Theo §1.4: control `--radius-md` **8px** · card `--radius-xl` **14px** · dropdown/popover/dialog `--radius-lg` **10px** · chip `--radius-chip` **16px** | Quy tắc thắng ca lẻ |
| A11 | Badge 11px vs bậc `label` 12px vs rule "≥14px readable" | **12px** (bậc `label`). Rule ≥14px áp cho **body**, không áp cho label/badge/table header | Nhất quán với thang chữ |
| A12 | `px` của button không nằm trên lưới 4px | Snap về lưới: sm **12px** · md **16px** · lg **20px** | §1.3 tuyên bố lưới 4px |
| A13 | §2.7 nói irreversible → Undo; anti-pattern #9 nói ngược | Anti-pattern #9 thắng: **irreversible → ConfirmDialog**; **reversible → optimistic + Undo toast 5s** | Không thể vừa irreversible vừa undo |
| A14 | Cross-reference gãy (#4 vs #7) | Không ảnh hưởng triển khai | — |
| A15 | Hai cơ chế focus song song (CSS global vs ring per-component) | **Một** quy tắc `:focus-visible` toàn cục: `outline: 2px solid var(--ring)` + `outline-offset: 2px` + `box-shadow: var(--shadow-focus)`. Không dùng ring riêng từng component | Một cơ chế dễ kiểm hơn hai |
| A16 | Skeleton KPI có hai bộ số (w-40/w-24 vs 60%/40%) | Theo §3.3: **60% / 40%** | §3.3 là mục chuyên về skeleton |
| A17 | "dim 40%" mơ hồ | **`opacity: 0.6`** (giảm *đi* 40%) | Dữ liệu cũ vẫn phải đọc được |

### Thiếu đặc tả (B)

| ID | Chỗ thiếu | Quyết định |
|---|---|---|
| B1 | `--radius-chip` được dùng nhưng văn bản không định nghĩa | **Đã có trong `erp-tokens.json`: 16px.** Văn bản thiếu, JSON đủ |
| B2 | Không bậc typography nào khai line-height | **Đã có trong `erp-tokens.json`**: heading-1 36px · heading-2 32px · heading-3 28px · body-lg 28px · body-base 24px · body-sm 20px · label 16px |
| B4 | Table toolbar chỉ có sơ đồ ASCII | Chốt: cao **56px** · padding-X **16px** · gap **12px** (lấy theo toolbar Kanban §4.3 cho nhất quán) |
| B5 | `Textarea` có tên nhưng không đặc tả | Chốt: `min-height` **96px**, cùng bộ style với Input, không `auto-grow` |
| B9 | Filter bar có 4 chiều cao control khác nhau trên một hàng | Chốt: **mọi control trong filter bar = 36px** |
| B10 | `opacity-92` không phải class Tailwind chuẩn | **Bỏ.** Full opacity — nhất quán với rule "KPI/body full opacity" |
| B12 | §2 và §3 không có đặc tả responsive | Tự định bằng breakpoint Vuetify — xem §Contract |
| B13 | Toast không có spec mobile / giới hạn số lượng | Dùng `v-snackbar` mặc định Vuetify, **tối đa 1 toast cùng lúc** |
| B14 | `shadow-sm/md/lg` không map vào token | `shadow-sm`→`--shadow-card` · `shadow-md`→`--shadow-md` · `shadow-lg`→`--shadow-pop` |
| B15 | `--muted-foreground` dark dùng hue 257 lệch neutral 285 | **Giữ nguyên** (cố ý theo tài liệu). Thêm comment trong JSON để không bị "sửa cho nhất quán" |
| B3·B6·B8·B11 | hero+3 grid vô nghĩa · bottom nav · Kanban card · `w-22`/`w-70` | **Ngoài phạm vi.** Kanban bị loại theo quyết định phạm vi; CQA dùng drawer thay bottom nav |
| B7 | Layout template không có trạng thái loading/empty/error | Từng story Phase 2 tự đặc tả 4 trạng thái cho view của mình |

### Quyết định phạm vi (người dùng chốt 2026-07-29)

- **Bao trùm:** nền tảng + pattern + **dọn nợ kỹ thuật**.
- **Section 4:** chỉ lấy **nguyên tắc bố cục**, ánh xạ sang màn CQA thật.
  **Không** tạo màn mới. Kanban bị loại (CQA không có khái niệm tương ứng).
- **Lớp SASS:** bật `styles.configFile` **ngay ở Phase 0**, chấp nhận churn
  baseline contrast một lần thay vì sửa lại toàn bộ component ở phase sau.

### Ánh xạ Section 4 → màn CQA

| Template DS | Màn CQA tương ứng | Ghi chú |
|---|---|---|
| 4.1 Analytics Dashboard | `views/Dashboard.vue` | Lấy thứ tự dọc bắt buộc: PageHeader → Callout → KPI grid → Charts → Table |
| 4.2 Agent Workspace (3 cột) | `views/Messages.vue` | CQA đã là master-detail 2 cột; lấy quy tắc `min-w-0`, mỗi cột tự scroll, `overflow:hidden` ở root |
| 4.2 (biến thể) | `views/Jobs/JobDetail.vue` | Header cố định + vùng scroll + action bar đáy |
| 4.3 Kanban | **không có** | Loại |
| 4.4 Settings (nav cấp 2) | `views/Settings.vue` | Nav 220px sticky dưới header; content max-width 680px |

---

## Delta hiện trạng ↔ đặc tả

| Hằng số DS | Giá trị DS | CQA hiện tại | Story xử lý |
|---|---|---|---|
| Sidebar width | **288px** (locked) | mặc định Vuetify **256px** (`DefaultLayout.vue:8-14` không đặt `width`) | 2J |
| Header height | **64px** (locked) | **không có header desktop** — `v-app-bar` chỉ hiện khi `!mdAndUp` (`DefaultLayout.vue:3-6`) | 2J |
| Content padding | 24px | `pa-4 pa-md-6` = 16/24px (`DefaultLayout.vue:139`) | 2J |
| Gap dọc giữa khối | 24px | không thống nhất | mỗi story Phase 2 |
| `--font-body` | system stack | token có (`tokens.css:65`) nhưng **chưa nối vào đâu** ⇒ app đang chạy `Roboto` mặc định Vuetify mà không nạp Roboto | 0.3 |
| Thang chữ 7 bậc | có line-height | **`build-tokens.mjs` bỏ rơi** `fontSize`/`lineHeight`/`letterSpacing`/`fontWeight`/`spacing` — chỉ emit radius/shadow/duration/easing/font (dòng 58–76) | 0.1 |
| `theme.variables` | emphasis/border/shadow | **không đặt biến nào** ⇒ ăn mặc định `medium-emphasis 0.60` | 0.3 |
| `defaults` | mọi input đồng bộ | **chỉ 4 component** (`plugins/vuetify.ts:55-70`) — `VTextarea`/`VAutocomplete`/`VCombobox`/`VFileInput` bị bỏ | 0.3 |

---

## Bản đồ phase và story

```
Phase 0 — NỀN TẢNG (chặn, 1 agent, tuần tự)          → phase-0-foundation.md
   0.1 token pipeline → 0.2 lớp SASS → 0.3 theme/defaults
                      → 0.4 i18n module → 0.5 chốt baseline
                                 │
        ┌────────────────────────┴────────────────────────┐
        ▼                                                  ▼
Phase 1 — COMPONENT DÙNG CHUNG (5 agent song song)   [1D chạy được ngay,
   1A state trio      1B data table + filter bar      không đợi Phase 0]
   1C chrome + dialog 1D format/error utils           → phase-1-components.md
   1E KPI
        │
        ▼
Phase 2 — ÁP VÀO VIEW (10 agent song song)            → phase-2-views.md
   2A Dashboard      2B Channels      2C Messages
   2D Jobs wizard    2E JobDetail     2F Users+Tenants
   2G Settings+Setup 2H Logs×3        2I Auth+misc
   2J DefaultLayout
        │
        ▼
Phase 3 — XÁC MINH (2 agent)                          → phase-3-verification.md
   3A contrast + a11y     3B guard i18n + CI
```

**Điểm chặn duy nhất là Phase 0.** Sau đó tối đa **10 agent chạy cùng lúc**.

### Vì sao Phase 0 phải chặn

Ba việc trong đó đụng file mà *mọi* story khác đọc:

1. `styles.configFile` đổi cách toàn bộ CSS Vuetify được biên dịch — làm sau
   nghĩa là sửa lại mọi component đã viết.
2. Tách `i18n/vi.ts` + `en.ts` (mỗi file 288 dòng, phẳng, 243 key) thành
   module theo domain. **Không tách thì 15 story cùng sửa hai file này** —
   xung đột merge chắc chắn.
3. `build-tokens.mjs` đang bỏ rơi thang chữ và spacing. Không sửa trước thì
   Phase 1 không có token để dùng.

---

## Bảng sở hữu file — quy tắc chống giẫm chân

**Luật:** một file chỉ thuộc **đúng một** story trong cùng một phase. Story
nào cần sửa file ngoài phần sở hữu của mình thì **dừng lại và báo**, không tự
sửa.

| Story | Sở hữu (create/modify) |
|---|---|
| **0.x** | `frontend/vite.config.ts` · `frontend/scripts/build-tokens.mjs` · `frontend/src/design/**` · `frontend/src/plugins/vuetify.ts` · `frontend/src/main.ts` · `frontend/src/i18n/**` · `frontend/tests/contrast/baseline.json` |
| **1A** | `src/components/ui/EmptyState.vue` · `SkeletonBlock.vue` · `SkeletonTable.vue` · `SkeletonCard.vue` · `SkeletonKpi.vue` · `src/components/ui/__tests__/helpers.ts` + test |
| **1B** | `src/components/ui/DataTable.vue` · `FilterBar.vue` + test |
| **1C** | `src/components/ui/ConfirmDialog.vue` · `PageHeader.vue` · `SectionCard.vue` · `FormField.vue` · `src/components/StatusBadge.vue` + test · `src/i18n/*/common.ts` (**chỉ thêm 11 khoá `status_*`**) · `src/__tests__/i18n.spec.ts` (**chỉ dòng đếm khoá**) |
| **1D** | `src/utils/format.ts` · `src/utils/errors.ts` + test · `src/i18n/*/errors.ts` · `src/__tests__/i18n.spec.ts` (**chỉ dòng đếm khoá**) |
| **1E** | `src/components/ui/StatCard.vue` · `KpiGrid.vue` + test |
| **2A** | `src/views/Dashboard.vue` · `src/i18n/*/dashboard.ts` |
| **2B** | `src/views/Channels.vue` · `src/views/Channels/ChannelDetail.vue` · `src/i18n/*/channels.ts` |
| **2C** | `src/views/Messages.vue` (+ component con tách ra dưới `src/views/Messages/`) · `src/i18n/*/messages.ts` |
| **2D** | `src/views/Jobs/JobList.vue` · `JobCreate.vue` · `JobEdit.vue` · `src/components/JobWizard/**` · `src/components/CronPicker.vue` · `src/i18n/*/jobs.ts` |
| **2E** | `src/views/Jobs/JobDetail.vue` (+ component con dưới `src/views/Jobs/JobDetail/`) · `src/i18n/*/job-detail.ts` |
| **2F** | `src/views/Users.vue` · `src/views/Tenants.vue` · `src/i18n/*/users.ts` · `tenants.ts` |
| **2G** | `src/views/Settings.vue` · `src/views/Setup.vue` · `src/router/index.ts` · `src/i18n/*/settings.ts` |
| **2H** | `src/views/ActivityLogs.vue` · `CostLogs.vue` · `NotificationLogs.vue` · `src/i18n/*/logs.ts` |
| **2I** | `src/views/Login.vue` · `NotFound.vue` · `MCPConnections.vue` · `src/layouts/AuthLayout.vue` · `src/i18n/*/auth.ts` · `mcp.ts` |
| **2J** | `src/layouts/DefaultLayout.vue` · `src/App.vue` · `src/components/LanguageSwitcher.vue` · `src/components/OnboardingWizard.vue` · `src/i18n/*/nav.ts` |
| **3A** | `frontend/tests/contrast/**` |
| **3B** | `frontend/src/__tests__/**` · `.github/workflows/ci.yml` |

**Ba file nóng, chỉ Phase 0 và Phase 3 được đụng:**
`src/plugins/vuetify.ts` · `src/design/*` · `tests/contrast/baseline.json`.

**Nợ hạ tầng Phase 0 đã trả trong story 1A (2026-07-29).** `frontend/vite.config.ts`
thuộc sở hữu **0.x**, nhưng Phase 0 đóng lại mà chưa cấu hình vitest để mount
được component Vuetify: thiếu `test.environment: 'happy-dom'` và
`test.server.deps.inline: ['vuetify']`. Không có hai dòng đó thì **mọi** test
mount component Vuetify vỡ với `Unknown file extension ".css"` — vitest
externalize gói trong `node_modules` và dùng loader ESM gốc của Node, loader
này không hiểu file `.css` mà `vuetify/components` import kèm. Phase 0 không lộ
lỗi vì hai test sẵn có (`i18n.spec.ts`, `tokens.spec.ts`) không mount gì.

Story 1A đã sửa (commit `af6a773`, 11 dòng, không đụng dòng
`include: ['src/**/*.spec.ts']`). **Story 1B/1C/1E không cần và không được sửa
lại file này** — cấu hình đã đúng.

**Ngoại lệ có kiểm soát cho Phase 1 (chốt 2026-07-29).** `src/__tests__/i18n.spec.ts`
chốt cứng số khoá (`toHaveLength(243)`) nên **mọi** story thêm khoá đều phải sửa
đúng dòng đó — mâu thuẫn với luật "một file một story". Giải bằng **thứ tự**
thay vì bằng ownership:

| Wave | Story | Khoá thêm | Dòng đếm sau wave |
|---|---|---|---|
| 1 | **1D** | 8 (`err_*`, `error_load_failed_*`, `retry`) | 243 → **251** |
| 2 | **1C** | 11 (`status_*`) | 251 → **262** |
| sửa sau review | **1C** | +5 (`status_inactive/sent/warning/partial/cancelled`) | 262 → **267** |
| sửa sau review | **1D** | +8 (`format_*`, module mới `i18n/*/format.ts`) | 267 → **275** |

**Số chốt cuối Phase 1: 275 khoá.** Hai dòng cuối là kết quả của vòng review
toàn nhánh, không nằm trong kế hoạch ban đầu:

- Story 1C thực tế thêm **16** khoá `status_*` chứ không phải 11. Backend phát
  `partial` và `cancelled`, còn frontend đang dùng `inactive`/`sent`/`warning` —
  không mã nào có khoá lẫn ánh xạ màu, nên `StatusBadge` render ra chuỗi khoá
  thô `status_inactive`.
- Module `frontend/src/i18n/{vi,en}/format.ts` là **file mới do controller thêm**
  khi locale hoá `utils/format.ts`; nó **không thuộc sở hữu story nào** trong
  bảng trên. Story Phase 2 nào cần sửa chuỗi định dạng thì báo controller.

1B **không** đụng i18n: khi 1B chạy, 1D đã merge nên `error_load_failed_title`,
`error_load_failed_desc`, `retry` đã có sẵn. Bước "vá tạm vào `common.ts`" ở
`phase-1-components.md` §1B Step 5 **không áp dụng** — nếu khoá chưa có thì
đó là lỗi thứ tự dispatch, dừng lại và báo.

---

## Contract — API component dùng chung

Phase 2 phụ thuộc Phase 1. Để hai phase viết song song được, **API dưới đây
là hợp đồng chốt cứng**: Phase 1 triển khai đúng chữ ký này; Phase 2 viết dựa
vào nó mà không cần đợi.

```ts
// 1A — trạng thái
// DS §3.2 quy định EmptyState có 3 biến thể, trong đó `error` LÀ một biến thể
// — nên không tách riêng ErrorState. Container gặp lỗi dùng
// <EmptyState variant="error" @action="retry" />.
// UNION CÓ PHÂN BIỆT — `variant: 'error'` BẮT BUỘC có `actionLabel`.
// Bảng "Quy tắc 4 trạng thái" ghi nhánh lỗi phải CÓ NÚT THỬ LẠI và cấm nuốt
// lỗi; để `actionLabel` optional nghĩa là `<EmptyState variant="error"
// title="…" />` không nút nào vẫn qua type-check. Trình biên dịch chặn, không
// phải lời hứa — cùng cơ chế đã dùng cho `DataTable.emptyTitle`.
// LƯU Ý cho người sửa sau: KHÔNG bọc union bằng `withDefaults` — nó làm kiểu
// prop suy biến thành `{ [x: string]: any }` và mất cả `title` bắt buộc.
// Mặc định `variant` đặt bằng `??` trong script.
EmptyState:   | { variant: 'error'; icon?: string; title: string
                  description?: string; actionLabel: string }
              | { variant?: 'first-run' | 'no-data'   // mặc định 'first-run'
                  icon?: string; title: string; description?: string
                  actionLabel?: string }
              // emit: 'action'
SkeletonBlock:{ width?: string /* '100%' */; height?: string /* '12px' */
                radius?: string /* 'var(--radius-sm)' */ }
              // Primitive dùng chung của mọi skeleton. Phase 2 cần nó cho
              // skeleton dạng dòng lẻ (panel, chi tiết) mà 3 skeleton dựng sẵn
              // dưới đây không khớp hình dạng.
SkeletonTable:{ rows?: number /* 5 */; cols: number }
SkeletonCard: { lines?: number /* 3 */ }
SkeletonKpi:  { count?: number /* 4 */ }
              // SkeletonKpi TỰ dựng lưới (v-row + v-col 12/6/3) khớp KpiGrid.
              // Vì vậy nhánh loading phải đứng NGOÀI KpiGrid:
              //     <KpiGrid v-if="!loading"> … </KpiGrid>
              //     <SkeletonKpi v-else :count="4" />
              // Đặt SkeletonKpi BÊN TRONG KpiGrid sẽ lồng v-row trong v-col.

// 1B — dữ liệu
DataTable:    { headers: { title: string; key: string; sortable?: boolean;
                  align?: 'start' | 'center' | 'end' }[]
                items: unknown[]; loading?: boolean; error?: boolean
                totalItems?: number; page?: number; itemsPerPage?: number
                emptyTitle: string          // BẮT BUỘC — xem ghi chú dưới
                emptyDescription?: string; emptyActionLabel?: string
                sortBy?: { key: string; order?: 'asc' | 'desc' }[]
                title?: string; subtitle?: string }
              // ⚠ KHÔNG BAO GIỜ bọc DataTable trong SectionCard — cả hai đều
              // tự dựng <v-card> nên sẽ ra HAI lớp viền/elevation chồng nhau.
              // DataTable TỰ sở hữu tiêu đề: dùng `title`/`subtitle` + slot
              // 'actions' của chính nó. Header render TRƯỚC toolbar và hiện ở
              // CẢ 4 nhánh trạng thái (tiêu đề biến mất khi bảng rỗng là sai —
              // người dùng không còn biết đang xem bảng gì).
              // Đã cân nhắc và LOẠI phương án thêm prop `flat`: nó bắt mỗi
              // story NHỚ truyền đúng chỗ, mà quên thì hỏng IM LẶNG (chỉ lệch
              // thị giác, không lỗi nào báo).
              // emit: 'update:page', 'update:itemsPerPage', 'update:sortBy',
              //       'retry', 'empty-action'
              // `sortBy` + emit là BẮT BUỘC ở chế độ server: VDataTableServer
              // KHÔNG tự sắp xếp, nên không có nó thì `headers[].sortable` là
              // prop khai mà vô tác dụng — header bấm được, mũi tên đổi, dữ
              // liệu đứng yên, view không bao giờ biết. Dùng `v-model:sort-by`.
              // slot: 'toolbar', 'item.<key>', 'bulk-actions', 'actions'
              //        ('actions' nằm cạnh tiêu đề, không phải trong toolbar)
              // `emptyTitle` KHÔNG có mặc định `t('no_data')`: quy tắc 4 trạng
              // thái cấm nhánh rỗng chỉ có một dòng "Không có dữ liệu", và có
              // mặc định thì mọi bảng hợp lệ về type mà vẫn vi phạm quy tắc.
              // Nhánh rỗng nối CTA qua `emptyActionLabel` + 'empty-action'.
              // Truyền `totalItems` = tuyên bố "server phân trang" ⇒ bên trong
              // dùng VDataTableServer; không truyền = client tự phân trang/sort.
              // `page`/`itemsPerPage`/`sortBy` là ĐIỂM KHỞI ĐẦU, không phải
              // xích: bảng giữ state nội bộ và tự đổi trang được kể cả khi view
              // không v-model. Muốn CHẶN đổi trang thì dùng `loading`, đừng
              // trông vào việc giữ nguyên prop.
              // Attr không khai báo được PHÂN TUYẾN, không đổ hết một chỗ:
              //   `class` · `style` · `id` · `data-test*`  → v-card GỐC, ở MỌI
              //       nhánh trạng thái. Nếu không, `<DataTable class="mb-6">`
              //       mất margin khi rỗng/lỗi/đang tải và khoảng cách dọc nhảy
              //       theo trạng thái dữ liệu; `id` dùng cho aria-labelledby
              //       hoặc deep-link cũng biến mất theo.
              //   `role` · `aria-*` · attr bảng (show-select, item-value,
              //       density…)                         → BẢNG
              // ⚠ Hệ quả phải biết: `role`/`aria-*` chỉ tồn tại ở nhánh CÓ
              // BẢNG — chúng VẮNG MẶT ở nhánh tải/rỗng/lỗi. View cần nhãn a11y
              // ổn định qua mọi trạng thái thì đặt trên phần tử bao ngoài
              // DataTable, đừng truyền vào nó.
FilterBar:    { modelValue: Record<string, unknown> }
              // slot mặc định, PHƠI slot prop `filters` = chính modelValue:
              //     <FilterBar :model-value="filters" v-slot="{ filters }">
              // KHÔNG có emit — FilterBar là container trình bày, control bên
              // trong tự v-model vào state của view.
              // mọi control bên trong cao 36px (quyết định B9)

// 1C — khung trang & hộp thoại
PageHeader:   { title: string; subtitle?: string
                breadcrumbs?: { title: string; to?: string }[] }
              // slot: 'actions'
SectionCard:  { title?: string; subtitle?: string }
              // slot: mặc định, 'actions'
              // Dùng cho khối nội dung THƯỜNG (form, biểu đồ, danh sách tự vẽ).
              // KHÔNG dùng để bọc DataTable — xem cảnh báo ở DataTable.
CardHeader:   { title?: string; subtitle?: string
                icon?: string; iconColor?: string }   // slot: 'actions'
              // `icon`/`iconColor` chuyển tiếp được từ CẢ SectionCard LẪN
              // DataTable — hai component đó cũng nhận hai prop này.
              // `iconColor` nhận TÊN MÀU THEME (primary/warning/success…),
              // cấm hex, cấm palette dựng sẵn Vuetify. Không truyền ⇒ thừa
              // hưởng currentColor, luôn an toàn.
              // NỘI BỘ — Phase 2 KHÔNG dùng trực tiếp. Tồn tại để SectionCard
              // và DataTable dùng CHUNG một bản header thay vì chép markup ra
              // hai chỗ. Không thuộc sở hữu 1B hay 1C: đây là hạ tầng chung,
              // story Phase 2 nào cần đổi nó thì DỪNG LẠI VÀ BÁO.
ConfirmDialog:{ modelValue: boolean; title: string; message: string
                confirmLabel: string; destructive?: boolean
                loading?: boolean }
              // emit: 'update:modelValue', 'confirm'
              // destructive=true ⇒ nhãn phải nói rõ hậu quả (DS §5.1)
FormField:    { label: string; required?: boolean; hint?: string
                error?: string; inputId?: string }
              // slot mặc định, PHƠI hai slot prop BẮT BUỘC phải dùng:
              //     <FormField label="Tên kênh" :error="err" v-slot="{ id, describedby }">
              //       <v-text-field :id="id" :aria-describedby="describedby"
              //                     placeholder="VD: Zalo OA cửa hàng A" />
              //     </FormField>
              // `describedby` là thứ nối thông báo lỗi với ô nhập cho trình
              // đọc màn hình. Bỏ qua nó = form vẫn trông đúng nhưng người dùng
              // screen reader không bao giờ nghe được lỗi. Đây là a11y, không
              // phải tuỳ chọn (DS §6.4).
              // DS §2.3/§3.4: label LUÔN nằm TRÊN field, không thả nổi vào
              // viền như mặc định Vuetify, và placeholder là ví dụ chứ không
              // phải nhãn. Field bên trong KHÔNG nhận prop `label`.
StatusBadge:  { status: string; size?: string; label?: string }
              // `label` chỉ đổi CHỮ. MÀU vẫn luôn suy từ `status` — view KHÔNG
              // BAO GIỜ truyền được màu. Luật "nơi duy nhất ánh xạ trạng thái"
              // là về màu, không phải về nhãn; có test riêng chốt rằng truyền
              // `label` không đổi được màu.
              // Dùng khi miền nghiệp vụ có từ vựng riêng: mức độ QC
              // "Nghiêm trọng"/"Cần cải thiện" thay vì "Lỗi"/"Cảnh báo" chung.
              // Không truyền ⇒ giữ `t('status_' + status)`, fallback về chính
              // `status` khi thiếu khoá.

// 1D — định dạng & lỗi
// CHỮ KÝ KHÔNG ĐỔI, nhưng ĐẦU RA PHỤ THUỘC LOCALE. Các hàm đọc locale hiện
// tại từ instance i18n toàn cục — Phase 2 KHÔNG phải truyền gì. Chọn cách này
// thay vì thêm tham số `locale` vào 9 hàm chính vì quên truyền sẽ hỏng IM LẶNG.
vnd(n: number): string                 // vi "2.847.621.000 ₫" · en "2,847,621,000 ₫"
vndShort(n: number): string            // vi "2,85 tỷ"|"384,7 tr"|"14k"
                                       // en "2.85B"|"384.7M"|"14K"
                                       // Tiền LUÔN là VND ở mọi ngôn ngữ; chỉ
                                       // dấu phân cách và hậu tố đổi.
pct(n: number, d?: number): string     // vi "18,4%" · en "18.4%"
                                       // CHỈ n > 0 && n < 0.1 ⇒ "<0,1%"/"<0.1%".
                                       // n = 0 và n âm KHÔNG rơi vào nhánh này.
usd(n: number): string                 // luôn quy ước Mỹ, kể cả khi giao diện vi
count(n: number): string               // SỐ ĐẾM THUẦN: vi "1.284" · en "1,284"
                                       // Dùng cho số hội thoại/job/kênh/tin
                                       // nhắn. Trước khi có nó, 5 file đã tự
                                       // gọi `.toLocaleString()` rời rạc và
                                       // Dashboard phải tự chế hàm cục bộ —
                                       // luật "mọi số đi qua format.ts" vỡ im
                                       // lặng. KHÔNG tự chế lại ở view.
                                       // Ghi chú: KHÔNG có hàm nhãn ngày cho
                                       // trục biểu đồ. Nhãn trục bỏ năm/bỏ số 0
                                       // đầu là NGƯỢC quyết định dd/MM/yyyy đầy
                                       // đủ ở trên, và mới một view cần — story
                                       // nào cần thì giữ hàm cục bộ, đừng thêm
                                       // vào Contract.
dateTable(d: string | Date): string        // dd/MM/yyyy Ở CẢ HAI LOCALE — cố ý.
                                       // "3/9/2026" là 9 tháng 3 với người đọc
                                       // Mỹ và 3 tháng 9 với người đọc Việt;
                                       // báo cáo và dữ liệu backend luôn
                                       // dd/MM/yyyy nên đọc nhầm ở đây là sai
                                       // nghiệp vụ. Chỉ CHỮ đổi theo ngôn ngữ.
dateWithTime(d: string | Date): string     // vi "09/03/2026 lúc 14:05"
                                           // en "09/03/2026 at 14:05"
dateRelative(d: string | Date): string     // vi "3 phút trước" (không chia số
                                           // nhiều, DS §5.4) · en "3 minutes
                                           // ago" / "1 minute ago" (có số ít)
errorCode(err: unknown): string        // mã đã biết, hoặc 'system.internal'
errorKey(err: unknown): string         // khoá i18n, ví dụ 'err_auth_token_expired'
                                       // View gọi t(errorKey(e)) — KHÔNG BAO GIỜ
                                       // hiện message raw của backend (§7 #10)

// 1E — KPI
StatCard:     { label: string; value: string | number; unit?: string
                // `change` tính bằng ĐIỂM PHẦN TRĂM, không phải phân số:
                // 18.4 ⇒ "↑ 18,4%". Truyền 0.184 sẽ ra "0,2%" — lệch 100 lần.
                // Cùng đơn vị với `changeThreshold`.
                change?: number; changeThreshold?: number
                icon?: string; loading?: boolean; to?: string }
              // CẤM #2: |change| >= changeThreshold ⇒ badge SOLID (variant
              // flat), dưới ngưỡng hoặc không khai ngưỡng ⇒ tonal.
KpiGrid:      { }   // slot mặc định; lưới 1/2/4 cột theo breakpoint
              // KpiGrid TỰ bọc mỗi thẻ con trong <v-col cols=12 sm=6 lg=3>,
              // khớp đúng SkeletonKpi. Nơi dùng KHÔNG tự gõ <v-col>:
              //     <KpiGrid><StatCard … /><StatCard … /></KpiGrid>
```

### Ánh xạ trạng thái CQA ↔ màu (thay từ vựng agent của DS — quyết định A2)

| Trạng thái CQA | Token màu | Dùng ở |
|---|---|---|
| `running` / `syncing` / `warning` / `partial` | `--amber` (pulse) | job đang chạy, kênh đang đồng bộ, cảnh báo, thành công một phần |
| `success` / `active` / `pass` / `sent` | `--success` | job xong, kênh hoạt động, kết quả Đạt, thông báo đã gửi |
| `failed` / `error` | `--destructive` | job lỗi, sync lỗi, kết quả Không đạt |
| `pending` / `queued` | `--muted-foreground` | job chờ |
| `disabled` / `paused` / `inactive` / `cancelled` | `--muted-foreground` + opacity 0.6 | kênh tắt, job bị huỷ |

`StatusBadge` là **nơi duy nhất** ánh xạ này tồn tại. Story nào tự viết
`<v-chip :color="...">` cho trạng thái là **sai** — dùng `StatusBadge`.

Trạng thái không có trong bảng (backend thêm mã mới) hiển thị **nguyên mã**,
không rơi ra chuỗi khoá thô `status_xxx` — nhưng đó là lối thoát hiểm, không
phải chỗ để bỏ qua việc thêm khoá i18n.

### Quy tắc 4 trạng thái (bắt buộc)

Mọi container dữ liệu — KPI card, bảng, danh sách, panel — **bắt buộc** xử lý
đủ bốn nhánh:

| Nhánh | Bắt buộc dùng | Cấm |
|---|---|---|
| đang tải | `Skeleton*` khớp hình dạng nội dung thật | `v-progress-circular` giữa màn (anti-pattern #7) |
| rỗng | `EmptyState` (`variant="first-run"` hoặc `"no-data"`) có **CTA** hoặc **số cụ thể** (DS §5.2) | chỉ một dòng "Không có dữ liệu"; chuỗi "Oops!" |
| lỗi | `EmptyState variant="error"` có nút thử lại | nuốt lỗi, `console.error` suông, `alert()` |
| có dữ liệu | nội dung thật | — |

### Responsive (tự định — khoảng trống B12)

Dùng breakpoint Vuetify. Quy tắc chung:

| Breakpoint | KPI grid | Bảng | Master-detail |
|---|---|---|---|
| `xs` (<600) | 1 cột | cuộn ngang trong container riêng | chỉ 1 pane, điều hướng qua lại |
| `sm`–`md` (600–1279) | 2 cột | cuộn ngang | 1 pane |
| `lg`+ (≥1280) | 4 cột | vừa khung | 2 pane cạnh nhau |

Sidebar: `permanent` từ `mdAndUp` (giữ như hiện tại), `temporary` dưới đó.

---

## Định nghĩa hoàn thành — story Phase 2

Story Phase 2 **chỉ được đóng** khi view của nó đạt **tất cả**:

- [ ] Dùng `PageHeader` cho tiêu đề + hành động (bỏ `div.text-subtitle-1` tự chế)
- [ ] Mọi container dữ liệu xử lý đủ 4 trạng thái theo bảng trên
- [ ] **0** màu palette Vuetify cứng — kiểm bằng lệnh ở §Xác minh
- [ ] **0** chuỗi tiếng Việt cứng ngoài `$t()` — kiểm bằng lệnh ở §Xác minh
- [ ] **0** `confirm()` / `alert()` native — thay bằng `ConfirmDialog` / snackbar
- [ ] Mọi số/tiền/ngày đi qua `src/utils/format.ts` (DS §5.4)
- [ ] Mọi lỗi API đi qua `t(errorKey(e))` — **không** lộ message raw của backend
- [ ] Nút icon có `aria-label` (DS §6.4)
- [ ] Nhãn nút theo DS §5.1: **động từ + bổ ngữ**; nút destructive nói rõ hậu quả
- [ ] `npx vue-tsc -b && npx vitest run` xanh
- [ ] **KHÔNG** tự chạy `make test-contrast`, và **KHÔNG** đụng
      `src/__tests__/i18n.spec.ts` — xem §"Điều phối Phase 2" dưới đây

---

## Điều phối Phase 2 — hai quy tắc chốt 2026-07-29

Phase 2 có **10 story chạy song song**. Hai thứ trong plan gốc sẽ vỡ ở quy mô
đó; đây là cách giải đã chốt.

**1. Story KHÔNG đụng `src/__tests__/i18n.spec.ts`.**
File đó từng chốt cứng số khoá (`toHaveLength(275)`). Ca đếm sinh ra ở Phase 0.4
để canh việc **tách** `vi.ts`/`en.ts` thành 14 module — việc đó xong rồi, và giữ
lại thì **cả 10 story cùng phải sửa đúng một dòng**. Đã bỏ ca đếm, thay bằng
kiểm cấu trúc không phụ thuộc số lượng: vi/en cân bằng · không khoá rỗng · không
trùng khoá giữa module · **mọi module đều thực sự được `index.ts` spread vào**
(rủi ro mà số đếm từng che: thêm module mà quên `import` + `...spread` thì khoá
im lặng không tồn tại, và ba ca kia không bắt được vì vi/en vẫn cân bằng).

**2. Story KHÔNG tự chạy `make test-contrast`. Controller chạy theo wave.**
Đó là Playwright + dựng app + trình duyệt thật; 10 agent chạy cùng lúc sẽ tranh
cổng và tranh CPU, và flaky sẽ bị hiểu nhầm thành lỗi màu thật. Controller chạy
**một lần sau khi gộp mỗi wave**, trên bản đã gộp — vẫn bắt được đúng thứ cần
bắt (cặp màu mới không đạt AA) mà không có tranh chấp.

**Nợ chuyển giao:** `StatusBadge` và `EmptyState` chưa từng lên DOM thật, nên
`make test-contrast` chưa bao giờ chạy cho chúng. Wave đầu tiên đưa chúng lên
view sẽ làm **78 chỗ** xuất hiện cùng lúc — dự trù thời gian cho việc đó, đừng
coi là chạy lấy lệ.

---

## Xác minh

```bash
cd frontend && npx vue-tsc -b && npx vitest run
```

```bash
make test-contrast
```

Đếm màu palette Vuetify cứng còn lại (mục tiêu cuối đợt: `0`):

```bash
cd frontend && grep -rnE 'bg-(white|grey|blue|orange|red|green)-|text-(blue|grey)-|color="(indigo|orange|blue|deep-purple|grey|red|green)"' src --include='*.vue' | wc -l
```

Đếm hex hard-code trong `.vue` (mục tiêu: `0`):

```bash
cd frontend && grep -rn --include='*.vue' -oE "#[0-9a-fA-F]{6}\b" src | wc -l
```

Đếm dòng template có tiếng Việt ngoài `$t()` (đầu đợt ~250, mục tiêu: `0`):

```bash
cd frontend && grep -rn --include='*.vue' -P '[àáâãèéêìíòóôõùúýăđĩũơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]' src | grep -v '\$t(' | wc -l
```

**Về `baseline.json`:** file có 30 mục nợ màu đã chốt, khoá là
`fg|bg|required` (**không theo vị trí**) nên cùng một cặp xuất hiện ở chỗ mới
sẽ *không* bị bắt. Test chỉ đỏ khi có cặp **mới** không đạt AA. Quy tắc cho
đợt này:

- Story Phase 1/2 **không được** tự chạy `make contrast-baseline`. Thấy đỏ
  thì **sửa màu**, không chốt nợ.
- Chỉ **Phase 0.5** và **Phase 3A** được chốt lại baseline, và phải kèm giải
  thích từng mục thêm/bớt.

---

## Rủi ro đã biết

**Bật `styles.configFile` dịch chuyển pixel diện rộng.** Toàn bộ CSS Vuetify
được biên dịch lại từ source thay vì dùng bản dựng sẵn. Hệ quả: build dev
chậm hơn, và gần như mọi màn đổi vài pixel cùng lúc. Phase 0.5 đo lại thời
gian build và chốt baseline một lần; nếu build chậm quá mức chấp nhận được,
đó là tín hiệu để xem lại quyết định — không âm thầm chịu đựng.

**Nâng `medium-emphasis-opacity` 0.60 → 0.70 đổi màu chữ ở mọi màn.** Đây là
sửa lỗi a11y thật (`baseline.json` đang có `#7F7F84 on #FFFFFF = 3.98:1` ở 7
route), nhưng nó làm nhiều mục baseline cũ thành rác. Phase 0.5 phải soát
từng mục, không merge mù.

**Tách i18n có thể làm sót key.** `src/__tests__/i18n.spec.ts` chốt vi/en cân
bằng và không value rỗng — nó sẽ bắt được key thiếu, nhưng **không** bắt được
key mồ côi (không ai dùng). Phase 0.4 phải giữ đúng 243 key sau khi tách và
test phải chạy được trên cấu trúc module mới.

**`StatusBadge.vue` hiện là code chết** (51 dòng, không file nào import) trong
khi 78 chỗ tự viết `<v-chip variant="tonal">`. Bài học từ lần trước: thêm
component dùng chung mà không thay chỗ dùng cũ thì chỉ tăng số file. Story 1C
hồi sinh nó; **mọi story Phase 2 bắt buộc dùng nó** — đó là lý do nó nằm
trong định nghĩa hoàn thành.

**Bug đã biết cần sửa nhân tiện:** `views/Tenants.vue:137` push `/tenants` sau
khi xoá tenant cuối — route này **không tồn tại** ⇒ rơi vào NotFound. Thuộc
story 2F.

---

## Vì sao plan nằm ở `research/` chứ không `docs/`

`CLAUDE.md` ghi rõ: `.github/workflows/docs.yml` tự build và publish `docs/`
lên https://saucevn.github.io/chat-quality-agent/ mỗi khi `main` đổi. Plan nội
bộ, đường dẫn nguồn, tên file máy — không thứ nào nên lên website công khai.
`research/` nằm trong repo nhưng VitePress không build.

---

## Nguồn

- `ERP-design-system-v2.md` — đặc tả thiết kế (ngoài repo, người dùng cung cấp
  2026-07-26). Bản trích xuất §2–§7 kèm số dòng nằm trong các file `phase-*.md`.
- `research/plans/2026-07-26-design-tokens.md` — đợt token đã hoàn thành;
  §"Nằm ngoài phạm vi đợt này" chính là đầu vào của đợt này.
- `research/materio-template-analysis.md` — nghiên cứu Materio + kiểm kê 18
  view hiện tại + xác minh cơ chế Vuetify 4.
- `frontend/src/design/erp-tokens.json` — nguồn sự thật về token.
