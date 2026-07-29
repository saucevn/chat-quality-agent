# Phase 2 — Áp vào view (10 story SONG SONG)

> **Đọc `README.md` cùng thư mục trước** — đặc biệt §Contract (chữ ký
> component), §"Bảng sở hữu file", và §"Định nghĩa hoàn thành".
>
> **REQUIRED SUB-SKILL:** `superpowers:subagent-driven-development` hoặc
> `superpowers:executing-plans`.

**Goal:** Áp component và quy tắc của Phase 1 vào 18 view, đồng thời dọn nợ
đã kiểm kê: màu cứng hỏng dark mode, chuỗi tiếng Việt ngoài `$t()`, lỗi API
bị nuốt im lặng, `confirm()` native, và hai file khổng lồ.

**Architecture:** Mỗi story sở hữu một nhóm file **rời nhau hoàn toàn** —
10 agent chạy cùng lúc, không merge conflict. Story nào cần sửa file ngoài
phần sở hữu thì **dừng và báo**, không tự sửa.

**Phụ thuộc:** Phase 0 **và** Phase 1 phải xong.

---

## Quy trình chung — mọi story làm y hệt 7 bước

Story chỉ khác nhau ở **danh sách lỗi cụ thể**; quy trình giống nhau.

- [ ] **Bước 1: Chụp hiện trạng để so sau**

```bash
make dev
```
Mở view của mình, chụp màn hình ở cả light và dark. Ghi lại chỗ nào đang hỏng
ở dark mode — bằng chứng để đối chiếu ở Bước 6.

- [ ] **Bước 2: Sửa theo danh sách lỗi của story**

Bảng lỗi ở phần story bên dưới. Mỗi dòng có `file:dòng` và cách sửa.

- [ ] **Bước 3: Ba lệnh đếm phải về 0 trên file mình sở hữu**

```bash
cd frontend && grep -nE 'bg-(white|grey|blue|orange|red|green)-|text-(blue|grey)-|color="(indigo|orange|blue|deep-purple|grey|red|green)"' src/views/<file>
```
```bash
cd frontend && grep -n -oE "#[0-9a-fA-F]{6}\b" src/views/<file>
```
```bash
cd frontend && grep -nP '[àáâãèéêìíòóôõùúýăđĩũơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]' src/views/<file> | grep -v '\$t('
```
Cả ba phải **không có kết quả**.

- [ ] **Bước 4: Thay class typography đã lỗi thời**

Phase 0 đã cài lớp đệm nên chúng *hoạt động*, nhưng story phải thay hẳn trong
file mình sở hữu (Story 3B thêm test chặn chúng quay lại):

```bash
cd frontend && grep -nE 'text-(h[1-6]|body-[12]|subtitle-[12]|caption|overline)' src/views/<file>
```

Bảng thay:
`text-h4`→`text-heading-1` · `text-h5`→`text-heading-2` ·
`text-h6`→`text-heading-3` · `text-subtitle-1`→`text-body-base` ·
`text-subtitle-2`→`text-body-sm` · `text-body-1`→`text-body-base` ·
`text-body-2`→`text-body-sm` · `text-caption`→`text-body-xs`

- [ ] **Bước 5: Chạy test**

```bash
cd frontend && npx vue-tsc -b && npx vitest run
```

- [ ] **Bước 6: Kiểm bằng mắt và chạy contrast**

```bash
make test-contrast
```
Thấy đỏ thì **sửa màu**, **không** chạy `make contrast-baseline` — chỉ Phase
0.5 và Story 3A được chốt baseline (README §Xác minh).

Chụp lại màn hình light + dark, đối chiếu ảnh Bước 1.

- [ ] **Bước 7: Commit**

```bash
git add <file của story>
git commit -m "refactor(frontend): áp design system cho <tên màn>"
```

---

## Ba lỗi lặp lại ở nhiều story — mẫu sửa chuẩn

**(a) Nuốt lỗi API im lặng.** Mẫu chuẩn cho mọi chỗ:

```ts
import { errorKey } from '../utils/errors'

const loading = ref(true)
const loadError = ref(false)

async function load() {
  loading.value = true
  loadError.value = false
  try {
    // ... gọi API
  } catch (e) {
    loadError.value = true
    snackbar.value = { show: true, text: t(errorKey(e)), color: 'error' }
  } finally {
    loading.value = false
  }
}
```
rồi truyền `:loading="loading"` và `:error="loadError"` vào `DataTable`, hoặc
render `<EmptyState variant="error" @action="load" />`.

**(b) `confirm()` / `alert()` native.** Thay bằng `ConfirmDialog`:

```vue
<ConfirmDialog
  v-model="confirmDelete"
  :title="t('delete_channel_title')"
  :message="t('delete_channel_message')"
  :confirm-label="t('delete_permanently')"
  destructive
  :loading="deleting"
  @confirm="doDelete"
/>
```
Nhãn nút phải nói rõ hậu quả — "Xoá vĩnh viễn", không phải "Xoá" (DS §5.1).

**(c) Chip trạng thái tự chế.** Mọi `<v-chip :color="...">` biểu thị trạng
thái đổi thành `<StatusBadge :status="..." />`. Đây là lý do `StatusBadge`
được hồi sinh ở Story 1C — story nào không dùng thì nó lại thành code chết.

---

### Story 2A: Dashboard

**Sở hữu:** `src/views/Dashboard.vue` (532 dòng) · `src/i18n/{vi,en}/dashboard.ts`

**Bố cục đích (DS §4.1, thứ tự dọc bắt buộc, gap 24px):**
`PageHeader` → banner/callout → `KpiGrid` → hàng biểu đồ → bảng.

| # | Lỗi | Vị trí | Sửa |
|---|---|---|---|
| 1 | 3 khối stat chép tay, không component chung | `Dashboard.vue:68-80, 83-96, 97-118` | `KpiGrid` + `StatCard` |
| 2 | Không có trạng thái tải nào | toàn file | `SkeletonKpi` cho KPI; `SkeletonCard` cho biểu đồ |
| 3 | **Nuốt lỗi rỗng** ⇒ API hỏng thì hiện toàn số 0 | `Dashboard.vue:466-468` (`// Dashboard data not available yet`) | mẫu (a) |
| 4 | `alert()` native khi import/reset demo lỗi | `Dashboard.vue:491, 505` | snackbar + `errorKey()` |
| 5 | `datePresets` nhãn tiếng Việt cứng | `Dashboard.vue:318-325` | `$t()` |
| 6 | Màu nền biểu đồ hard-code, không đổi theo theme | `Dashboard.vue:393` (`rgba(92,107,192,0.1)`), `:424` (`rgba(255,167,38,0.1)`) | `chartTokens()` (`src/design/chart-tokens.ts`) |
| 7 | Bảng chi phí `v-table` thô, cắt cứng `.slice(0,7)`, không empty state | `Dashboard.vue:191` | `DataTable` |
| 8 | Hàng "Hoạt động gần đây" tô nền bằng inline `:style` | `Dashboard.vue:135` | class + token |
| 9 | Card không dùng slot title — tự chế `div.text-subtitle-1` | `Dashboard.vue:125, 166, 203, 225, 235` | `SectionCard` |
| 10 | 19 dòng tiếng Việt ngoài `$t()` | rải rác | `$t()` |
| 11 | Nợ contrast: 5 mục `dashboard/light` + 1 `dark` (chip severity, banner demo amber) | `baseline.json` | token `--amber-bg`/`--amber-fg`, không hard-code |

---

### Story 2B: Channels + ChannelDetail

**Sở hữu:** `src/views/Channels.vue` (493) · `src/views/Channels/ChannelDetail.vue` (351) · `src/i18n/{vi,en}/channels.ts`

| # | Lỗi | Vị trí | Sửa |
|---|---|---|---|
| 1 | Có empty state nhưng **không có loading** ⇒ lúc fetch hiện "chưa có kênh nào" | `Channels.vue:70-77` | `SkeletonCard` khi `loading` |
| 2 | Màu palette Vuetify cứng trên nút submit | `Channels.vue:172` (`color="indigo"`), `:181` (`color="orange"`) | token `channel-facebook` / `channel-pancake` |
| 3 | `syncColor()` trả `'grey'` — không có trong token | `Channels.vue:434` | `StatusBadge` |
| 4 | `confirm('Delete this channel?')` native, tiếng Anh | `Channels.vue:426` | mẫu (b) |
| 5 | Chỉ nhánh Pancake có `v-form` + `:rules`; Zalo/Facebook chỉ `:disabled` | `Channels.vue:115-132` vs `:161-187` | bọc cả ba trong `v-form` + `FormField` |
| 6 | 21 dòng tiếng Việt cứng | `Channels.vue:28, 138, 151, 195, 204, 210…` | `$t()` |
| 7 | Header 5 nút cùng cấp, 3 màu, không phân cấp | `ChannelDetail.vue:9-19` | 1 nút primary, còn lại `variant="text"`; `PageHeader` slot `actions` |
| 8 | 8 `v-col` label/value tự dựng | `ChannelDetail.vue:29-72` | `SectionCard` + `v-list` |
| 9 | "Tổng cuộc chat" là `<a href="#">` | `ChannelDetail.vue:54` | `router-link` |
| 10 | Ternary lồng 2 tầng cho màu/nhãn channel type ngay trong template | `ChannelDetail.vue:32-33` | tách computed; **cân nhắc báo** để làm danh sách channel type dùng chung (xem `CLAUDE.md` §"Thêm một loại kênh chat mới" — 7 file frontend đang tự liệt kê) |
| 11 | Loading toàn trang chỉ là `v-progress-circular` | `ChannelDetail.vue:166-168` | skeleton khớp hình dạng |
| 12 | `detail?.substring(0,120)` cắt cứng, không xem được đủ | `ChannelDetail.vue:103` | `v-tooltip` hoặc hàng mở rộng |
| 13 | Chỉ **4 lần** `$t()`; 37 dòng tiếng Việt cứng | toàn file | `$t()` |
| 14 | `doSync()` poll 60×3s nhưng UI không hiện tiến độ | `ChannelDetail.vue:239-252` | `v-progress-linear` + số lần thử |

---

### Story 2C: Messages

**Sở hữu:** `src/views/Messages.vue` (833) + component con mới dưới
`src/views/Messages/` · `src/i18n/{vi,en}/messages.ts`

**Bố cục đích (DS §4.2):** root `overflow: hidden`, mỗi cột tự cuộn,
`min-width: 0` trên pane phải để bảng/ảnh không đẩy vỡ layout.

| # | Lỗi | Vị trí | Sửa |
|---|---|---|---|
| 1 | **13 mục nợ contrast** (7 light + 6 dark) — nặng nhất repo | `baseline.json` | chip channel dùng `StatusBadge`; timestamp bỏ `opacity: 0.6`, dùng `text-medium-emphasis` |
| 2 | Bong bóng tin nhắn màu cứng, không đổi theo theme | `Messages.vue:207` (`background: rgba(0,0,0,0.02)`), `:222` (`border: 1px solid rgba(0,0,0,0.12)`) | token `--muted` / `--border` |
| 3 | Cỡ chữ ép cứng inline | `Messages.vue:224` (11px), `:227` (13px), `:252` (10px) | `.text-body-xs` / `.text-body-sm` |
| 4 | `bg-orange-lighten-5` | `Messages.vue:292` | `--amber-bg` |
| 5 | **`onImageError()` dựng chip fallback bằng `document.createElement` + class chép tay có `v-theme--light` cứng** ⇒ hỏng ở dark | `Messages.vue:743-751` | render bằng template Vue, không thao tác DOM tay |
| 6 | Không skeleton; loading là `v-progress-circular` | `Messages.vue:149-151, 208-210` | `SkeletonCard` cho danh sách, `SkeletonTable` cho tab |
| 7 | Chiều cao panel tính cứng `calc(100vh - 140px)` | `Messages.vue:163` | flex + `min-height: 0` |
| 8 | 833 dòng, **không tách component con nào** | toàn file | tách tối thiểu `MessageBubble.vue`, `QcResultCard.vue`, `ClassificationCard.vue`, `ConversationListItem.vue` |
| 9 | Chỉ 8 lần `$t()`; 23 dòng tiếng Việt cứng | toàn file | `$t()` |

---

### Story 2D: Jobs — danh sách, tạo, sửa, wizard

**Sở hữu:** `src/views/Jobs/JobList.vue` (78) · `JobCreate.vue` (159) ·
`JobEdit.vue` (190) · `src/components/JobWizard/**` ·
`src/components/CronPicker.vue` · `src/i18n/{vi,en}/jobs.ts`

| # | Lỗi | Vị trí | Sửa |
|---|---|---|---|
| 1 | `v-table` thô: không sort/filter/phân trang/tìm kiếm, đổ hết job một lần | `JobList.vue` | `DataTable` + `FilterBar` |
| 2 | Có empty state nhưng **không có loading** | `JobList.vue:49-53` | prop `loading` của `DataTable` |
| 3 | `confirm('Delete this job?')` native tiếng Anh | `JobList.vue:74` | mẫu (b) |
| 4 | `last_run_status` hiện thô, chưa dịch | `JobList.vue:37` | `StatusBadge` |
| 5 | Nút icon không tooltip, không `aria-label` | `JobList.vue` cột Actions | `IconBtn` + `aria-label` + `v-tooltip` |
| 6 | `hide-actions` rồi tự dựng lại nút Back/Next ⇒ hai hệ điều hướng | `JobCreate.vue:9, 30-49` | giữ một hệ |
| 7 | Lỗi validation hiện cạnh nút Next, không gắn vào field sai | `JobCreate.vue:41-43`, `canProceed` `:77-102` | `FormField` prop `error`; cuộn tới field lỗi đầu tiên (DS §2.3) |
| 8 | **Lỗi submit chỉ `console.error`** — người dùng không thấy gì | `JobCreate.vue:153-155` | mẫu (a) |
| 9 | **Lỗi lưu chỉ `console.error`** | `JobEdit.vue:184-186` | mẫu (a) |
| 10 | `setTimeout(…, 1500)` khoá người dùng sau khi lưu | `JobEdit.vue:183` | điều hướng ngay, snackbar tự tắt |
| 11 | `StepOutput` ở chế độ edit tự đánh dấu mọi output "đã test", khác hẳn JobCreate, không chỉ báo | `StepOutput.vue:197` | hiện rõ trạng thái, hoặc bỏ hành vi ngầm |
| 12 | Màu chip kênh cứng `'blue'`/`'orange'` | `StepOutput.vue:8` | token |
| 13 | `testSend()` chỉ gửi `bot_token`/`chat_id` ⇒ **nhánh email không test được thật** | `StepOutput.vue:239-243` | báo nếu cần backend; ít nhất tắt nút test cho email |
| 14 | Ternary 2 tầng cho màu/nhãn channel type | `StepInput.vue:15-16` | computed dùng chung |
| 15 | Mẫu template tiếng Việt nhúng thẳng trong file | `StepRules.vue:98-116, 122-124` | tách hằng, hoặc `$t()` |
| 16 | `dayLabels` cứng `['CN','T2',…]` | `CronPicker.vue:82` | `$t()` |
| 17 | `form` là `Record<string, any>` ở cả 6 Step — **không có interface nào** | `JobWizard/*` | định nghĩa `interface JobForm` dùng chung |
| 18 | `StepConfirm` không hiện quy tắc đã nhập để soát lại | `StepConfirm.vue` | thêm phần tóm tắt rule |
| 19 | `StepAnalysisSchedule.vue` là **code chết** (không file nào import) | file | xoá |

---

### Story 2E: JobDetail

**Sở hữu:** `src/views/Jobs/JobDetail.vue` (1331 — file lớn nhất repo) +
component con mới dưới `src/views/Jobs/JobDetail/` ·
`src/i18n/{vi,en}/job-detail.ts`

| # | Lỗi | Vị trí | Sửa |
|---|---|---|---|
| 1 | **4 khối KPI copy-paste** + **3 khối nữa** cho classification | `JobDetail.vue:176-219`, `:223-256` | `KpiGrid` + `StatCard` |
| 2 | **Khối transcript + violations lặp nguyên xi hai lần (~140 dòng)** | `JobDetail.vue:441-523` và `:605-676` | tách `TranscriptPanel.vue` dùng chung |
| 3 | Bong bóng chat màu palette cứng; `bg-white` **trắng trên nền dark** | `JobDetail.vue:463, 625`, `:467, 629` (`text-blue`) | token |
| 4 | `bg-orange-lighten-5` cho evidence ×2 | `JobDetail.vue:506, 664` | `--amber-bg` |
| 5 | Thanh công cụ nhồi **9 control một hàng**; nút xoá màu error cạnh nút export | `JobDetail.vue:286-337` | `FilterBar` + gom hành động phá huỷ vào menu riêng |
| 6 | Empty state chỉ một dòng chữ | `JobDetail.vue:339-341`, `:572` | `EmptyState` có CTA |
| 7 | Không skeleton | toàn file | `SkeletonKpi` + `SkeletonTable` |
| 8 | `-webkit-line-clamp` inline, prefix riêng WebKit | `JobDetail.vue:387, 417, 430` | class dùng chung có fallback |
| 9 | 3 `v-table` thô + 4 `v-pagination` rời | rải rác | `DataTable` |
| 10 | **62 dòng tiếng Việt cứng — nhiều nhất repo** | toàn file | `$t()` |
| 11 | 1331 dòng | toàn file | tách tối thiểu `JobKpis.vue`, `TranscriptPanel.vue`, `ResultsTab.vue`, `RunsTab.vue` |

---

### Story 2F: Users + Tenants

**Sở hữu:** `src/views/Users.vue` (328) · `src/views/Tenants.vue` (171) ·
`src/i18n/{vi,en}/users.ts`, `tenants.ts`

| # | Lỗi | Vị trí | Sửa |
|---|---|---|---|
| 1 | **BUG: `router.push('/tenants')` — route KHÔNG tồn tại** ⇒ rơi vào NotFound sau khi xoá tenant cuối | `Tenants.vue:137` | `router.push('/')` |
| 2 | Đổi role áp dụng ngay không xác nhận; lỗi thì reload cả danh sách để revert ⇒ giật | `Users.vue:26-35, 233-241` | cập nhật lạc quan + toast "Hoàn lại" 5s (quyết định A13) |
| 3 | Ma trận quyền: 2 checkbox chồng nhau, `true-value`/`false-value` tính động, khó hiểu | `Users.vue:87-88, 126-127` | control ba trạng thái, hoặc hai checkbox độc lập rõ nghĩa |
| 4 | Snackbar **tiếng Anh cứng** | `Users.vue:225, 236, 253, 280` | `$t()` |
| 5 | `permissionFeatures` nhãn tiếng Việt cứng | `Users.vue:186-191` | `$t()` |
| 6 | Bảng không empty/loading/phân trang | `Users.vue` | `DataTable` |
| 7 | Nút icon dùng `title=` HTML thay vì tooltip, không `aria-label` | `Users.vue:44, 52` | `IconBtn` + `aria-label` + `v-tooltip` |
| 8 | Empty state chỉ `{{ $t('no_data') }}` — dù đây là **trang đầu tiên sau đăng nhập** | `Tenants.vue:26-28` | `EmptyState variant="first-run"` có CTA "Tạo công ty đầu tiên" |
| 9 | Không loading state | `Tenants.vue` | `SkeletonCard` |
| 10 | Chip không nhất quán: một `variant="flat"`, một `variant="tonal"` | `Tenants.vue` | thống nhất |
| 11 | Message lỗi map bằng ternary lồng nhau một dòng | `Tenants.vue:165` | `errorKey()` |

---

### Story 2G: Settings + Setup

**Sở hữu:** `src/views/Settings.vue` (327) · `src/views/Setup.vue` (91) ·
`src/router/index.ts` · `src/i18n/{vi,en}/settings.ts`

**Bố cục đích (DS §4.4):** nav cấp 2 rộng **220px**, `sticky` ngay dưới header
64px, `height: calc(100vh - 64px)`; content `max-width: 680px`, gap dọc giữa
section **32px**.

| # | Lỗi | Vị trí | Sửa |
|---|---|---|---|
| 1 | "Tab" là `v-list` + `v-if` ⇒ **không sync URL**, F5 luôn về tab `ai` | `Settings.vue` | `VTabs` + `VWindow` chung `v-model`, đồng bộ `router.query.tab` (DS §2.10 — làm tốt hơn mẫu của DS vốn không sync URL) |
| 2 | Mobile: cột nav chiếm nguyên hàng trên, không thu gọn | `Settings.vue` `md=3` | `v-tabs` ngang dưới `md` |
| 3 | Mỗi tab một nút Lưu, **không chỉ báo thay đổi chưa lưu**; rời tab là mất | `Settings.vue` | cảnh báo khi rời tab có thay đổi |
| 4 | `:rules` **không nằm trong `v-form`** ⇒ không chặn submit; `saveAI()` phải check tay | `Settings.vue:73-76, 208-211, 264-271` | bọc `v-form` + `FormField` |
| 5 | Danh sách model AI hardcode kèm nhãn tiếng Anh | `Settings.vue:191-202` | tách hằng + `$t()` |
| 6 | Comment `<!-- General -->` mồ côi | `Settings.vue:86` | xoá |
| 7 | Card không có subtitle mô tả nhóm cài đặt | `Settings.vue` | `SectionCard` có `subtitle` |
| 8 | 13 dòng tiếng Việt cứng | `Settings.vue` | `$t()` |
| 9 | **`Setup.vue` gọi `$t()` 0 lần** — toàn bộ tiếng Việt cứng | `Setup.vue` | `$t()` |
| 10 | Không `:rules` nào; kiểm mật khẩu khớp làm tay | `Setup.vue:69-72` | `v-form` + rules + `FormField` |
| 11 | Yêu cầu mật khẩu chỉ là `hint`, không kiểm client-side | `Setup.vue:30` | rule thật + chỉ báo độ mạnh |
| 12 | Lỗi server gắn vào field **email** bất kể lỗi thuộc field nào | `Setup.vue:11` | `errorKey()` + alert chung |
| 13 | Ô nhập lại mật khẩu dùng chung `showPass` với ô chính | `Setup.vue` | toggle riêng |
| 14 | `permissionDeniedMsg` là **chuỗi cứng, không qua i18n** | `src/router/index.ts:191` | `$t()` (story này sở hữu router) |

---

### Story 2H: Ba màn nhật ký

**Sở hữu:** `src/views/ActivityLogs.vue` (100) · `CostLogs.vue` (104) ·
`NotificationLogs.vue` (88) · `src/i18n/{vi,en}/logs.ts`

Ba màn cùng hình dạng ⇒ sửa một lần, áp ba chỗ.

| # | Lỗi | Vị trí | Sửa |
|---|---|---|---|
| 1 | **Không empty state** — hết log là bảng trơ khung `<thead>` | `ActivityLogs.vue` | `DataTable` |
| 2 | **`loadLogs()` KHÔNG có try/catch** ⇒ API lỗi thì unhandled rejection, màn hình đứng im | `ActivityLogs.vue:77-83`, `CostLogs.vue:85-94` | mẫu (a) |
| 3 | Không loading state ở cả ba màn | — | prop `loading` |
| 4 | Cột Action hiện chuỗi thô (`job.run`, `ai.error`) | `ActivityLogs.vue:32` | `$t()` map sang nhãn người đọc |
| 5 | `actionOptions` danh sách cứng tiếng Anh | `ActivityLogs.vue:65-72` | `$t()` |
| 6 | `detail?.substring(0,120)` cắt cứng | `ActivityLogs.vue:35` | hàng mở rộng |
| 7 | Ký hiệu tiền VND viết `d` thường thay vì `₫` | `CostLogs.vue:43, 50` | `vnd()` từ `utils/format` |
| 8 | Màu chip provider cứng `'deep-purple'`/`'blue'` — **nợ contrast 2.49:1 ở dark** | `CostLogs.vue:37` | token |
| 9 | Dòng tổng chỉ tổng **trang hiện tại** nhưng nhãn ghi `$t('total')` ⇒ hiểu nhầm | `CostLogs.vue:80` | đổi nhãn, hoặc lấy tổng toàn kỳ từ API |
| 10 | Màn về chi phí mà **không có biểu đồ** | `CostLogs.vue` | biểu đồ đường dùng `chartTokens()` |
| 11 | `bg-grey-lighten-5` — **sáng trắng trên dark mode** | `NotificationLogs.vue:39` | token `--muted` |
| 12 | Chỉ mở được **một hàng** tại một thời điểm | `NotificationLogs.vue` (`expandedId` là string đơn) | `Set<string>` |
| 13 | Màu chip kênh cứng `'blue'`/`'orange'` | `NotificationLogs.vue:21` | token |
| 14 | Không filter theo trạng thái/kênh/ngày dù hai màn kia đều có | `NotificationLogs.vue` | `FilterBar` |
| 15 | Empty state đặt **sau** `v-card-actions` phân trang | `NotificationLogs.vue:54-57` | `DataTable` xử lý |
| 16 | Nợ contrast `#E7000B` trên `#FCE0E1` = 3.84:1 (chip error tonal, 6 route) | `baseline.json` | `--destructive-fg` trên `--destructive-bg` |

---

### Story 2I: Đăng nhập, 404, MCP, AuthLayout

**Sở hữu:** `src/views/Login.vue` (59) · `NotFound.vue` (11) ·
`MCPConnections.vue` (180) · `src/layouts/AuthLayout.vue` (20) ·
`src/i18n/{vi,en}/auth.ts`, `mcp.ts`

| # | Lỗi | Vị trí | Sửa |
|---|---|---|---|
| 1 | Không `:rules` — không kiểm định dạng email | `Login.vue` | `v-form` + `FormField` |
| 2 | Mọi lỗi (mạng, 500, sai mật khẩu) đều hiện cùng một message | `Login.vue:53-55` | `errorKey()` |
| 3 | Không có "quên mật khẩu", không "ghi nhớ đăng nhập" | `Login.vue` | **báo trước khi thêm** — cần backend, nhiều khả năng ngoài phạm vi đợt này |
| 4 | `AuthLayout` 20 dòng, trần; không có theme switcher | `AuthLayout.vue` | card căn giữa **max-width 448px** (DS §3.4), thêm theme switcher |
| 5 | **`NotFound.vue` gọi `$t()` 0 lần** | `NotFound.vue` | `$t()` |
| 6 | Không có nút "quay lại" | `NotFound.vue` | thêm |
| 7 | `bg-grey-lighten-4` — hỏng ở dark | `MCPConnections.vue:80` | token `--muted` |
| 8 | **Client secret hiện bằng `text-error`** ⇒ chuỗi quan trọng bị tô đỏ như lỗi | `MCPConnections.vue:84` | `font-mono` + nền `--muted` + nút sao chép |
| 9 | `confirm()` native khi thu hồi client (trong khi tạo mới lại có dialog) | `MCPConnections.vue:162` | mẫu (b) |
| 10 | `loadClients` **nuốt lỗi im lặng** | `MCPConnections.vue:136` | mẫu (a) |
| 11 | Bảng không phân trang, không empty state | `MCPConnections.vue` | `DataTable` |
| 12 | Cột "Redirect URIs" đổ hết chip không giới hạn ⇒ hàng rất cao | `MCPConnections.vue` | giới hạn 3 + "+N" |
| 13 | 7 dòng tiếng Việt cứng | `MCPConnections.vue` | `$t()` |

---

### Story 2J: DefaultLayout — sidebar, header, điều hướng

**Sở hữu:** `src/layouts/DefaultLayout.vue` (507) · `src/App.vue` ·
`src/components/LanguageSwitcher.vue` · `src/components/OnboardingWizard.vue` ·
`src/i18n/{vi,en}/nav.ts`

**Bố cục đích (DS §4.1):** sidebar **288px** (locked) nền `--sidebar`, viền
phải `--sidebar-border`; header **64px** (locked) `sticky top-0` nền
`--background`, viền dưới `--border`, trái là breadcrumb, phải là theme toggle
+ user; content padding **24px**.

| # | Lỗi | Vị trí | Sửa |
|---|---|---|---|
| 1 | Drawer không đặt `width` ⇒ ăn mặc định **256px**, DS yêu cầu **288px** | `DefaultLayout.vue:8-14` | `width="288"` |
| 2 | **Không có header desktop** — `v-app-bar` chỉ hiện khi `!mdAndUp` ⇒ không breadcrumb, theme toggle bị chôn ở đáy sidebar | `DefaultLayout.vue:3-6` | thêm `v-app-bar` cao 64px cho desktop |
| 3 | Drawer hard-code `'white'` thay vì token `sidebar` (dù `--sidebar`, `--sidebar-fg`, `--sidebar-border`, `--sidebar-accent` đã có sẵn) | `DefaultLayout.vue:13` | dùng token |
| 4 | Nợ contrast `#E17100` trên `#FBEEE0` = 2.80:1 — chip version, xuất hiện ở **15/15 route light** | `DefaultLayout.vue:103-106` | `--amber-fg` trên `--amber-bg` |
| 5 | Menu phẳng 10 mục, không nhóm, không section header, không badge | `DefaultLayout.vue:417-433` | thêm section title gom 3 màn nhật ký; **giữ nguyên lọc `perm`** (đang đúng) |
| 6 | Trạng thái `rail` **không persist** | `DefaultLayout.vue` (`ref(false)`) | `localStorage` |
| 7 | Theme **không persist** — reload là về light | `DefaultLayout.vue:440-442` | `localStorage`; đọc `prefers-color-scheme` lần đầu |
| 8 | Nút theme **không có `aria-label`** — test contrast phải bám vào class `.mdi-weather-night` để bấm | `DefaultLayout.vue:89-94` | thêm `aria-label`; **báo Story 3A** để cập nhật selector ở `tests/contrast/contrast.spec.ts:72-74` |
| 9 | User profile là dialog, không phải menu; nút logout là icon rời | `DefaultLayout.vue:110-118, 170-238` | `v-menu` chuẩn |
| 10 | Content padding `pa-4 pa-md-6` | `DefaultLayout.vue:139` | 24px theo DS |
| 11 | Chip "chưa xong" của OnboardingWizard dùng `color="default"` | `OnboardingWizard.vue:10` | token |
| 12 | Nhãn "Bắt đầu:", "Hoàn thành!" cứng | `OnboardingWizard.vue` | `$t()` |
| 13 | 8 dòng tiếng Việt cứng | `DefaultLayout.vue` | `$t()` |

---

## Kiểm tra cuối phase

Chỉ chạy khi **cả 10 story** đã merge:

```bash
cd frontend && npx vue-tsc -b && npx vitest run && npm run build
```

```bash
make test-contrast
```

Ba lệnh đếm ở README §Xác minh phải **về 0** trên toàn `src/`: màu palette
cứng · hex trong `.vue` · dòng tiếng Việt ngoài `$t()`.

Còn số dương nghĩa là có story chưa xong phần của mình — tra ngược file về
story sở hữu bằng bảng trong `README.md`.
