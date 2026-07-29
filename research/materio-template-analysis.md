# Phân tích Materio (Vuetify admin template) và ánh xạ vào giao diện CQA

Ngày: 2026-07-29
Nguồn: https://github.com/themeselection/materio-vuetify-vuejs-admin-template-free
(bản free, `typescript-version/`, version 2.3.0)

Tài liệu này là **phân tích, không phải plan đã duyệt**. Mọi con số đều đối
chiếu trực tiếp với source đã clone và với `node_modules/vuetify` của repo.

---

## 1. Kết luận trước

**Materio không phải thứ để bê nguyên, và cũng không phải nguồn thẩm quyền
về thiết kế của CQA.**

Điểm thứ hai quan trọng hơn điểm thứ nhất. CQA **đã có** một design system
riêng — `ERP-design-system-v2.md`, người dùng cung cấp 2026-07-26, mà
Section 1 (token) đã triển khai xong qua `research/plans/2026-07-26-design-tokens.md`.
Section 3–4 của tài liệu đó đặc tả sẵn KPI grid, empty state, skeleton,
filter bar, layout template — **đúng những khoảng trống lớn nhất của giao
diện hiện tại**. Vậy nên vai trò đúng của Materio ở đây là:

> **tài liệu tham khảo về *cơ chế* Vuetify, không phải nguồn *quyết định thiết kế*.**

Chỗ nào Materio và ERP design system nói khác nhau về màu/kích thước/hình
dạng → **ERP design system thắng**. Chỗ nào Materio chỉ ra một cơ chế Vuetify
mà CQA đang bỏ trống (`theme.variables`, `defaults`, `aliases`) → lấy cơ chế
đó, đổ giá trị của mình vào.

Về mặt phiên bản: Materio ghim Vuetify 3.7.5, ta ở 4.0.3. Nhưng ba cơ chế
đáng giá nhất kể trên đều là API Vuetify-4-native, lấy được ngay, không thêm
dependency, không đụng build.

**Và cần nói thẳng:** vấn đề lớn nhất của giao diện CQA hiện tại không phải
thẩm mỹ. Kiểm kê 18 view cho thấy `v-skeleton-loader` dùng **0 lần**,
`v-empty-state` **0 lần**, `v-data-table` **0 lần** (14 chỗ dùng `v-table`
thô, không sort/không phân trang), ~250 dòng template có tiếng Việt cứng
ngoài `$t()`, và 6 file dùng màu palette Vuetify cứng (`bg-white`,
`bg-grey-lighten-5`, `bg-orange-lighten-5`, `color="indigo"`) — những chỗ này
**hỏng ở dark mode** bất kể theme đẹp đến đâu. Materio không sửa cái nào
trong số đó. Khoác skin Materio lên hiện trạng sẽ đẹp hơn trong ảnh chụp và
không dễ dùng hơn một chút nào.

---

## 2. Hai bên đang đứng ở đâu

| | Materio free | CQA |
|---|---|---|
| Vuetify | **3.7.5** (ghim, không `^`) | **4.0.3** |
| Nguồn màu | `theme.ts` — hex viết tay, 1 file | `erp-tokens.json` (OKLCH) → `build-tokens.mjs` → `tokens.css` + `theme-tokens.ts` (hex) |
| Số token màu | ~30/theme | **43/theme**, có `channel-*`, `chart-1..5`, `sidebar-*` |
| Dark mode | có, **không persist** | có, **không persist** |
| Icon | Iconify Remix, bundle offline sinh lúc `postinstall` | `@mdi/font` webfont |
| Chart | apexcharts | chart.js + vue-chartjs |
| i18n | **không có** | vue-i18n, vi/en, 243 key, có test cân bằng |
| Phân quyền menu | type có `AclProperties` nhưng **không dùng** | **có thật** — `navItems` lọc theo `authStore.canView(perm)` |
| Tuỳ biến SCSS | ~100 file `@core/scss`, qua `vite-plugin-vuetify` `configFile` | không có; dùng CSS dựng sẵn |
| `theme.variables` | **20 biến/theme** (emphasis, border, shadow, table-header) | **không đặt cái nào** |
| `defaults` | 143 dòng, ~12 component | **4 component** (`plugins/vuetify.ts:55-70`) |
| Design system riêng | không | **có** — `ERP-design-system-v2.md` |
| Test chốt giao diện | không | `tokens.spec.ts` (11 cặp AA) + 29 test contrast Playwright + baseline 30 mục |

Hai dòng cuối là lý do chính để không nhận palette Materio: **CQA đã đầu tư
vào design system và accessibility nhiều hơn Materio.** Materio không có test
contrast nào; bảng màu của nó chưa từng được kiểm AA.

---

## 3. Ba ràng buộc quyết định mọi thứ

### 3.1 Khoảng cách phiên bản — hẹp hơn tôi tưởng

Tôi đã grep `node_modules/vuetify@4.0.3` để xem lớp biến SASS mà Materio dựa
vào có còn không. **Còn, và giữ nguyên tên:**

```
lib/styles/settings/_variables.scss:24   $border-radius-root: 4px !default;
lib/styles/settings/_variables.scss:205  $typography: () !default;
lib/components/VCard/_variables.scss:15  $card-elevation: 1 !default;
lib/components/VCard/_variables.scss:86  $card-text-padding: 1rem !default;
lib/components/VTable/_variables.scss:14 $table-row-height: 52px !default;
lib/components/VList/_variables.scss:44  $list-item-min-height: 40px !default;
lib/components/VField/_variables.scss:55 $field-outline-opacity: .38 !default;
lib/components/VBtn/_variables.scss:29   $button-height: 36px !default;
```

Và `vite-plugin-vuetify@2.1.3` của ta vẫn nhận `configFile`
(`@vuetify/loader-shared/dist/index.d.ts`):

```ts
styles?: true | 'none' | 'sass' | { configFile: string }
```

⇒ **Lớp biến SASS port được về mặt kỹ thuật.** Điều này cũng trả lời một
"rủi ro đã biết" mà plan token cũ để ngỏ (dòng 521–523: *"Phương án sạch hơn
là cấu hình sass.variables… cần đo lại thời gian build"*). Cái *không* chắc
port được là ~20 file SCSS override viết tay của Materio
(`components/_button.scss` 271 dòng, `_table.scss`, `_field.scss`...) — chúng
bám vào tên class DOM của Vuetify 3, phải kiểm từng cái với markup Vuetify 4.

### 3.2 Pipeline token của CQA là tài sản, không phải nợ

`build-tokens.mjs` tồn tại vì lý do đã ghi trong CLAUDE.md: Vuetify 4 không
parse `oklch()`. Nó sinh song song OKLCH (cho CSS tay) và hex (cho Vuetify),
và `tokens.spec.ts` chốt 3 thứ: tập khoá light == dark == JSON gốc, mọi giá
trị khớp `/^#[0-9A-F]{6}$/`, và **11 cặp màu cam kết AA ≥ 4.5:1**.

Nhận palette Materio = vứt pipeline này + làm lại toàn bộ việc kiểm AA.
**Loại.**

### 3.3 Baseline contrast là dây chằng

`tests/contrast/baseline.json` có 30 mục nợ màu đã chốt. Đổi màu/bố cục sẽ
sinh cặp fg/bg mới và làm đỏ 1 trong 29 test Playwright. Lưu ý: CI **không**
chạy test này (`.github/workflows/ci.yml` job frontend chỉ `vitest` + `build`)
— nên nó không chặn merge, nhưng đó là lý do càng phải chạy tay
(`make test-contrast`) sau mỗi thay đổi thị giác.

---

## 4. Bảng ánh xạ

### Tầng 1 — Lấy gần như nguyên văn (Vuetify-4-native, rủi ro ~0)

| # | Materio có | Áp vào CQA ở đâu | Vì sao đáng |
|---|---|---|---|
| 1 | `theme.variables`: emphasis/border/shadow/table-header | `plugins/vuetify.ts` — hiện chỉ có `colors`, không có `variables` | Xem §5.1 — sửa được nợ contrast đang có |
| 2 | `defaults.ts` 143 dòng | `plugins/vuetify.ts:55-70` (đang có 4 mục) | Xem §5.2 — "40% cảm giác Materio" |
| 3 | `aliases: { IconBtn: VBtn }` | mới | Chuẩn hoá nút icon rải rác khắp repo |
| 4 | `.match-height` (3 dòng CSS) | `Dashboard.vue`, `JobDetail.vue` | Card cùng hàng đang lệch chiều cao |
| 5 | `CardStatisticsVertical/Horizontal` | KPI ở `Dashboard.vue` (3 khối chép tay) + `JobDetail.vue` (4+3 khối chép tay) | Xem §5.3 — **nhưng đặc tả lấy từ ERP §3, không lấy của Materio** |

### Tầng 2 — Lấy ý tưởng, viết lại bằng token của mình

| # | Materio có | Áp vào CQA | Ghi chú quan trọng |
|---|---|---|---|
| 6 | Schema nav `NavLink \| NavGroup \| NavSectionTitle` | `DefaultLayout.vue:417-433` | **Chỉ lấy schema.** Menu Materio *không* data-driven — `VerticalNavGroup.vue:4` nhận `Omit<NavGroup,'children'>` và `NavItems.vue` là 286 dòng viết tay. Menu CQA đã data-driven + lọc quyền, **tốt hơn**. |
| 7 | Nav item active = gradient + elevation, bo tròn 2 góc phải | `DefaultLayout.vue` | CSS thuần, không phụ thuộc version. Nhận diện thị giác đặc trưng nhất của Materio — **kiểm với ERP design system trước khi lấy**. |
| 8 | `VTabs` + `VWindow` chung một `v-model` | `Settings.vue` (đang giả lập tab bằng `v-list` + `v-if`) | Materio cũng **không** sync URL — CQA nên làm tốt hơn bằng `router.query` |
| 9 | Auth card 448px căn giữa + trang trí theo theme | `AuthLayout.vue` (20 dòng, trần) | Ảnh trang trí là tài sản riêng của ThemeSelection — cần asset của mình |
| 10 | Table: header viết hoa, nền riêng, bỏ viền đáy, row 50px | 14 chỗ `v-table` | Ưu tiên thấp hơn việc **chuyển sang `v-data-table`** (xem §6) |

### Tầng 3 — Loại

| Materio có | Vì sao loại |
|---|---|
| Bảng màu hex | Xung đột pipeline token + 11 cặp AA đã chốt (§3.2) |
| Iconify + bundle offline | Cần `postinstall` codegen; `@mdi/font` đang chạy tốt |
| `unplugin-auto-import` | `auto-imports.d.ts` 51KB commit vào repo; CQA đang `strict` + import tường minh |
| `unplugin-vue-components` | Cùng lý do |
| apexcharts | chart.js đang chạy |
| Toàn bộ cây `@core/scss` (~100 file) | Chuỗi `@forward ... with (...)` 3 tầng, rất khó bảo trì; nếu cần thì gom **một** file config |
| `webfontloader` gọi Google Fonts lúc runtime | Xem §5.4 — Vuetify 4 có đường ngắn hơn |
| `Footer.vue` attribution + link Pro trong `NavItems.vue` | Nội dung marketing của ThemeSelection |

---

## 5. Chi tiết bốn hạng mục đáng làm nhất

### 5.1 `theme.variables` — tỉ lệ lợi ích/công sức cao nhất

Vuetify 4 vẫn sinh CSS var từ khối này (`lib/composables/theme.js:40-41,82-83`),
mặc định:

```
light: high-emphasis 0.87 / medium 0.60
dark:  high-emphasis 1.00 / medium 0.70
```

Materio nâng lên **0.9 / 0.7 cho cả hai theme** (`plugins/vuetify/theme.ts:55-66`)
kèm `border-opacity: 0.12`, `border-color`, `table-header-color`.

CQA hiện **không đặt biến nào** — đang ăn mặc định 0.60 ở light. Và đây là chỗ
nợ contrast đang nằm: `baseline.json` có mục

```
#7F7F84 on #FFFFFF = 3.98:1 — "Lọc"   (xuất hiện ở 7 route)
```

`#7F7F84` chính là `on-surface` nhân với `medium-emphasis-opacity: 0.6`.
Nâng lên 0.7 kéo tỉ số này lên. **Đây là sửa lỗi accessibility có thật, không
phải trang trí** — lý do tôi xếp nó số 1.

Cảnh báo: nâng emphasis đổi màu chữ ở gần như mọi màn ⇒ bắt buộc chạy lại
`make test-contrast` và soát `baseline.json` (nhiều mục cũ sẽ thành rác —
baseline chỉ liệt kê cái *hỏng*).

### 5.2 `defaults` — chỗ CQA bỏ trống nhiều nhất

CQA hiện có đúng 4 mục:

```ts
// frontend/src/plugins/vuetify.ts:55-70
VCard:      { elevation: 1, style: 'border-radius: var(--radius-xl);' }
VBtn:       { style: 'border-radius: var(--radius-md);' }
VTextField: { variant: 'outlined', density: 'comfortable', ... }
VSelect:    { variant: 'outlined', density: 'comfortable', ... }
```

Hệ quả quan sát được: `VTextarea`, `VAutocomplete`, `VCombobox`, `VFileInput`
**không** được hưởng `outlined`+`comfortable` ⇒ form không nhất quán. Materio
đặt cả 6, cộng `hideDetails: 'auto'` (bỏ khoảng trống message thừa dưới mỗi
field — nguyên nhân form CQA trông rời rạc), `VSwitch { inset: true }`, và
default color cho `VBtn`/`VBadge`.

JS thuần trong file config, không SCSS, không build. **Rẻ nhất danh sách.**

### 5.3 Component KPI — CQA đang chép tay 7 lần

- `Dashboard.vue:68-80, 83-96, 97-118` — 3 khối gần giống nhau
- `JobDetail.vue:176-219` — 4 khối copy-paste
- `JobDetail.vue:223-256` — 3 khối nữa cho classification

Materio `CardStatisticsVertical.vue` (71 dòng) cho thấy *hình dạng* cần có.
Nhưng **đặc tả phải lấy từ ERP design system Section 3 (KPI grid)**, không
lấy số đo của Materio.

Lưu ý khi tham khảo: `moreList` của Materio hardcode Share/Refresh/Update
(dòng 17-21), không nhận qua prop.

Liên quan: CQA **đã có** `components/StatusBadge.vue` (51 dòng, chuẩn hoá
tốt) nhưng grep toàn `src/` không có chỗ nào import — **code chết**, trong
khi 78 chỗ tự viết `<v-chip variant="tonal">`. Bài học: thêm component dùng
chung mà không đi kèm việc thay thế chỗ dùng cũ thì chỉ tăng số file.

### 5.4 Font — Vuetify 4 có đường ngắn hơn Materio

Materio nạp Inter bằng `webfontloader` gọi Google Fonts lúc runtime
(`plugins/webfontloader.ts:10-15`) rồi set `$body-font-family` qua SASS.

Vuetify 4 làm được không cần SASS:

```
lib/styles/settings/_variables.scss:22
  $body-font-family: var(--v-font-body, 'Roboto', sans-serif) !default;
```

`--v-font-body` xuất hiện **183 lần** trong `dist/vuetify.css` dựng sẵn.
Nghĩa là **một dòng CSS** là đủ:

```css
:root { --v-font-body: var(--font-body); }
```

CQA đã có `--font-body` trong `tokens.css:65` nhưng chưa nối vào đâu — hiện
toàn app chạy font `Roboto` mặc định của Vuetify (mà không nạp Roboto ⇒ rơi
về sans-serif hệ thống). Nối lại là 1 dòng, và mở cửa cho việc self-host
webfont sau này mà không đụng SASS.

---

## 6. Cái Materio không giải quyết được

Phần quan trọng nhất của phân tích. Kiểm kê 18 view cho ra những vấn đề mà
**không hạng mục nào ở §4–5 chạm tới** — và phần lớn trong số đó đã được
`ERP-design-system-v2.md` Section 3–4 đặc tả sẵn nhưng chưa triển khai:

1. **Không có trạng thái tải ở đâu cả.** `v-skeleton-loader`: 0 lần.
   `Channels.vue` trong lúc fetch hiện đúng cái empty state "chưa có kênh
   nào" ⇒ người dùng tưởng mất dữ liệu.
2. **Nuốt lỗi im lặng.** `Dashboard.vue:466-468` bắt lỗi rỗng ⇒ API hỏng thì
   màn hình hiện toàn số 0. `ActivityLogs.vue:77-83` và `CostLogs.vue:85-94`
   **không có try/catch**. `JobCreate.vue:153-155` và `JobEdit.vue:184-186`
   chỉ `console.error` khi submit lỗi — người dùng không thấy gì.
3. **Bảng thô.** `v-data-table`: 0 lần. `JobList.vue` đổ toàn bộ job ra một
   lần, không sort/filter/phân trang/tìm kiếm. `Users.vue` tương tự.
4. **Hộp thoại xác nhận không nhất quán.** `confirm()` native tiếng Anh ở
   `Channels.vue:426`, `JobList.vue:74`, `MCPConnections.vue:162` — trong khi
   `ChannelDetail.vue` có dialog đàng hoàng.
5. **~250 dòng tiếng Việt cứng ngoài `$t()`** (nặng nhất: JobDetail 62,
   ChannelDetail 37, Messages 23). `Setup.vue` và `NotFound.vue` gọi `$t()`
   **0 lần**. Test i18n canh cân bằng vi/en nhưng không chốt được việc UI có
   *dùng* nó không.
6. **Màu palette Vuetify cứng hỏng ở dark mode**: `bg-white`
   (`JobDetail.vue:625`), `bg-grey-lighten-5` (`NotificationLogs.vue:39`),
   `bg-grey-lighten-4` (`MCPConnections.vue:80`), `bg-blue-lighten-5`,
   `bg-orange-lighten-5` (3 chỗ), `color="deep-purple|indigo|orange|grey"`.
   Nằm ngoài tầm với của hệ token.
   Tệ nhất: `Messages.vue:743-751` dựng chip fallback bằng
   `document.createElement` + chuỗi class chép tay có `v-theme--light` cứng.
7. **Trùng lặp lớn**: `JobDetail.vue` lặp nguyên khối transcript+violations
   hai lần (dòng 441-523 và 605-676, ~140 dòng). File 1331 dòng.
   `Messages.vue` 833 dòng không tách component con nào.
8. **Một bug điều hướng**: `Tenants.vue:137` push `/tenants` sau khi xoá
   tenant cuối — route này **không tồn tại** ⇒ rơi vào NotFound.
9. **Class `font-mono` được dùng 5 chỗ nhưng không có định nghĩa** — Vuetify
   không có utility tên đó, và `--font-mono` trong `tokens.css:67` không được
   áp vào class nào.

Nếu phải chọn giữa "áp skin Materio" và "sửa mục 1–4", mục 1–4 thắng tuyệt
đối về giá trị cho người dùng.

---

## 7. Giấy phép

`LICENSE` ở gốc repo là **MIT chuẩn, không sửa**, `Copyright (c) 2022
ThemeSelection`, có cấp cả quyền bán (`...and/or sell copies of the
Software...`). Điều kiện pháp lý duy nhất: giữ copyright notice kèm "all
copies or substantial portions".

`README.md:138` **đề nghị** thêm link attribution ở footer. Đây **không** là
điều kiện của MIT — nó nằm ngoài văn bản license. Nghĩa vụ thật chỉ là giữ
notice.

Thực hành đề xuất: file nào chép code từ Materio thì thêm header comment ghi
nguồn + MIT + copyright ThemeSelection. Rẻ, sạch, đủ.

---

## 8. Ranh giới với plan token đã làm

`research/plans/2026-07-26-design-tokens.md` đã hoàn thành và **cố ý** để lại
ngoài phạm vi (dòng 525–531):

- Section 2 design system (Button, Card, Input, Badge, Table, Dialog, CMDK)
- Section 3–4: KPI grid, empty state, skeleton thay spinner, filter bar,
  layout template
- Typography scale
- Section 5 (voice & microcopy), Section 7 (anti-patterns)

**Đó chính xác là phạm vi của đợt nâng cấp giao diện tiếp theo** — và §6 ở
trên là bằng chứng thực nghiệm rằng những khoảng trống đó đang gây hại thật.

Plan token cũ cũng để ngỏ 3 rủi ro, nay đã có thêm dữ liệu:

| Rủi ro (plan cũ) | Trạng thái sau nghiên cứu này |
|---|---|
| "Bản hex có thể phá cam kết AA" | Đã có test chốt 11 cặp; baseline 30 mục cho thấy nợ thật nằm ở **emphasis opacity**, không phải ở bản hex — xem §5.1 |
| "Vuetify ghi đè màu ở chỗ không kiểm soát" | Đúng. Đường sạch là `styles.configFile` — **đã xác nhận vite-plugin-vuetify 2.1.3 hỗ trợ** (§3.1) |
| "Radius gán qua `style` là giải pháp thô" | Đúng, và đường sạch cũng là `styles.configFile` (`$border-radius-root`) |

---

## 9. Nguồn đã đọc

Materio (clone shallow, chỉ đọc): `typescript-version/package.json`,
`vite.config.ts`, `src/plugins/vuetify/{theme,defaults,index,icons}.ts`,
`src/@layouts/**`, `src/@core/components/**`, `src/@core/scss/**`,
`src/pages/{dashboard,tables,form-layouts,account-settings,login}.vue`,
`LICENSE`, `README.md`.

CQA: `frontend/package.json`, `vite.config.ts`, `src/plugins/vuetify.ts`,
`src/design/**`, `src/layouts/**`, `src/router/index.ts`, toàn bộ
`src/views/**`, `src/components/**`, `src/i18n/**`, `tests/contrast/**`,
`research/plans/2026-07-26-design-tokens.md`.

Đối chiếu Vuetify 4.0.3: `node_modules/vuetify/lib/styles/settings/_variables.scss`,
`lib/components/*/_variables.scss`, `lib/composables/theme.js`,
`dist/vuetify.css`, `node_modules/@vuetify/loader-shared/dist/index.d.ts`.
