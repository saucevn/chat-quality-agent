# ERP Design System v2.0 — SECTION 2: COMPONENTS

Trích xuất từ `/Users/dev/Downloads/ERP-design-system-v2.md`, dòng **660–1509** (850 dòng).
Mọi số dòng trong tài liệu này trỏ về file gốc. Code React/TSX đã bị lược bỏ — chỉ giữ số đo, token, quy tắc.

---

## 0. DANH SÁCH COMPONENT — CÁI GÌ CÓ, CÁI GÌ KHÔNG

### CÓ đặc tả (13 mục)

| # | Component | Dòng | Độ dài |
|---|---|---|---|
| — | Quy ước chung (base class pattern + `cn()`) | 660–697 | 38 |
| 2.1 | **Button** | 698–802 | 105 |
| 2.2 | **Card** | 803–872 | 70 |
| 2.3 | **Input / Textarea / Select** | 873–956 | 84 |
| 2.4 | **Badge** | 957–1005 | 49 |
| 2.5 | **Avatar** (Human + AI Agent) | 1006–1063 | 58 |
| 2.6 | **Table** | 1064–1125 | 62 |
| 2.7 | **Toast** (Sonner pattern) | 1126–1186 | 61 |
| 2.8 | **Command Palette (CMDK)** | 1187–1230 | 44 |
| 2.9 | **Skeleton** | 1231–1276 | 46 |
| 2.10 | **Tabs** | 1277–1304 | 28 |
| 2.11 | **Dialog / Sheet** | 1305–1368 | 64 |
| 2.12 | **Insight Callout** (ERP-specific) | 1369–1431 | 63 |
| 2.13 | **Sparkline** (ERP-specific) | 1432–1486 | 55 |

### KHÔNG có đặc tả — cần tự thiết kế

| Component | Xuất hiện ở đâu | Ghi chú |
|---|---|---|
| **Textarea** | Chỉ trong tiêu đề mục 2.3 (dòng 873) | **Không một dòng nào** đặc tả: không height, không `rows`, không resize behavior |
| **Dropdown / DropdownMenu** | Bảng radius (538), bảng shadow (560), bảng phím (2578) | Chỉ biết: radius `--radius-lg` 10px, shadow `--shadow-md`, điều hướng bằng `↑`/`↓`/`Enter`/`Esc` |
| **Checkbox** | Bảng phím (2580) | Chỉ biết `Space` để toggle. Không size, không màu, không state |
| **Switch** | Bảng phím (2580), bảng radius (540 — `--radius-full` cho toggle) | Chỉ biết radius pill + `Space` toggle |
| **Tooltip** | Decision tree (1317, 2097), bảng shadow (560) | Quy tắc dùng: nội dung **< 80 ký tự**. Shadow `--shadow-md`. Không có spec visual |
| **Popover** | Decision tree (1317, 2094, 2097), bảng radius (538), shadow (560) | Quy tắc dùng: nội dung **> 80 ký tự, có cấu trúc**. Radius `--radius-lg`, shadow `--shadow-md` |
| **Progress bar** | Decision tree loading (1688) | Chỉ nêu "Long-running agent task (> 5s) → Progress bar + estimated time" |
| **Alert / Banner** | Gián tiếp (198) | "Warning banner (soft alert)" dùng `--amber-bg` / `--amber-border` |
| **Breadcrumb** | Tên component trong shell (2187) | Không spec |
| **Pagination** | KHÔNG phải component 2.x — là pattern **3.6** (1974–1999) | Xem file section 3 |
| **Radio, Slider, DatePicker, Accordion, Menu** | — | Không xuất hiện |

---

## 1. QUY ƯỚC CHUNG — ÁP CHO MỌI COMPONENT (dòng 660–697)

### 1.1 Base class pattern — 3 lớp (dòng 665–668)

Mọi interactive element phải khai báo theo đúng 3 nhóm:

1. **Layout** — flex, size, gap, padding
2. **Visual** — bg, text, border, rounded, shadow
3. **Behavior** — transition, focus-visible, disabled, cursor

### 1.2 Base bắt buộc cho mọi control (dòng 671–681)

| Thuộc tính | Giá trị | Dòng |
|---|---|---|
| Display | `inline-flex`, `align-items: center`, `justify-content: center` | 673 |
| Gap icon–text | **8px** | 673 |
| `white-space` | `nowrap` | 673 |
| `user-select` | `none` | 753 |
| **Radius** | token **`--radius-md` = 8px** | 675 |
| **Font-size** | **14px** (`text-sm`) | 675 |
| **Font-weight** | **500** (`font-medium`) | 675 |
| **Border** | **1px solid transparent** — mọi variant đều có, để không nhảy layout khi đổi sang `outline` | 675 |
| **Transition** | `transition-colors`, **duration 100ms** (`--duration-instant`) | 677 |
| **Focus-visible** | `outline: none` + **ring 2px `--ring`** + **ring-offset 2px** | 678 |
| **Disabled** | `pointer-events: none` + **`opacity: 0.5`** | 679 |
| Cursor | `pointer` | 680 |

### 1.3 Motion tokens áp cho component (dòng 577–594)

| Preset | Duration | Easing | Dùng cho |
|---|---|---|---|
| Micro | **100ms** (`--duration-instant`) | `--ease-out` = `cubic-bezier(0.16, 1, 0.3, 1)` | Hover bg, focus ring, color, icon swap |
| Small | **200ms** (`--duration-fast`) | `--ease-out` | Dropdown/popover, tooltip, badge |
| Medium | **320ms** (`--duration-medium`) | `--ease-out` | Dialog, sheet, page route |
| Large | **480ms** (`--duration-slow`) | `--ease-in-out` = `cubic-bezier(0.65, 0, 0.35, 1)` | Stagger, onboarding |

Easing thứ 3: `--ease-spring` = `cubic-bezier(0.34, 1.56, 0.64, 1)` (dòng 585).

**Keyframes có định nghĩa** (dòng 597–599):
- `dropdownIn`: `opacity 0→1`, `translateY(-4px)→0`
- `dialogIn`: `opacity 0→1`, `scale(0.96)→1`
- `pulse`: `0%,100% { opacity:1; scale(1) }` · **`50% { opacity:.6; scale(1.15) }`**

**Keyframes được NHẮC nhưng KHÔNG định nghĩa** (dòng 607): `checkIn 400ms spring`, `shake 300ms`.

**Quy tắc bắt buộc:**
- **Theme switch KHÔNG animate — instant swap** (dòng 601).
- `prefers-reduced-motion: reduce` → mọi animation/transition rút về `0.01ms` (dòng 602–604).

### 1.4 Radius scale — dùng cái nào cho cái gì (dòng 525–542)

| Token | px | Dùng cho | Cấm |
|---|---|---|---|
| `--radius-sm` | **6** | Badge, kbd, chip nhỏ, segmented item | Không dùng cho card |
| `--radius-md` | **8** | **Button, input, select** — radius của control | — |
| `--radius-lg` | **10** | Dropdown, popover, dialog body | Không cho inline element |
| `--radius-xl` | **14** | **Card, KPI card, panel, tile** | Không cho button |
| `--radius-full` | pill | Badge pill, human avatar, toggle | Không cho button |

> **Rule (542):** control (button/input) = **8px**, card = **14px**. Đừng dùng chung một radius — phải phân tầng rõ control vs container.

### 1.5 Shadow scale (dòng 549–562)

| Token | Giá trị light | Dùng cho |
|---|---|---|
| `--shadow-xs` | `0 1px 2px 0 oklch(15% .02 285 / .06)` | Input, avatar — rất nhẹ |
| `--shadow-card` | `0 1px 3px 0 …/.10, 0 1px 2px -1px …/.10` | **Card / KPI default** (≈ Tailwind `shadow-sm`) |
| `--shadow-md` | `0 4px 6px -1px …/.10` | Dropdown, popover, tooltip |
| `--shadow-pop` | `0 10px 30px -8px …/.18` | Dialog, command palette, hover-lift tile |
| `--shadow-focus` | `0 0 0 3px oklch(54% .25 277 / .35)` | Focus ring glow — combine với `outline` |

Dark mode (457–461): mọi shadow đổi sang `oklch(0% 0 0)` với alpha cao hơn (.30/.40/.40/.50); `--shadow-focus` dark = `0 0 0 3px oklch(70% .22 277 / .40)`.

⚠️ Component code lại dùng class Tailwind `shadow-sm`/`shadow-md`/`shadow-lg` **không có bảng ánh xạ**. `shadow-lg` (Toast dòng 1176, CMDK dòng 1199) **không map vào token nào** — gần nhất là `--shadow-pop`.

### 1.6 Focus — hai cơ chế song song, PHẢI CHỌN MỘT

| Cơ chế | Định nghĩa | Nguồn |
|---|---|---|
| **A — CSS global** | `outline: 2px solid var(--ring)` + `outline-offset: 2px` + `box-shadow: var(--shadow-focus)` | dòng 565–569, lặp lại 2550–2554 |
| **B — utility class trên component** | `focus-visible:ring-2 focus-visible:ring-[--ring] focus-visible:ring-offset-2` (Button) / `ring-offset-0` (Input) | dòng 678, 891 |

⚠️ Tài liệu không nói cái nào thắng. Ngoài ra ring-offset khác nhau giữa Button (2px) và Input (0px).
**Trường hợp đặc biệt (2557–2559):** trên nền primary, `outline-color: white`.
**Quy tắc tuyệt đối (570, 2549):** *"Không bao giờ `outline: none` mà không có replacement."*
**Yêu cầu contrast (2564):** focus ring phải ≥ **3:1** so với nền xung quanh (WCAG 2.1 §1.4.11).

---

## 2.1 BUTTON (dòng 698–802)

**Use case (700):** mọi action user có thể thực hiện — submit form, trigger mutation, navigate.
**Anti-pattern (701):** không dùng `<div onClick>` thay `<button>` — mất keyboard a11y.

### Bảng VARIANT — 5 cái (dòng 707–713, 758–762)

| Variant | Nền (token) | Chữ (token) | Border | Shadow | Khi dùng |
|---|---|---|---|---|---|
| **`primary`** *(default)* | `--primary` | `--primary-foreground` | 1px transparent | `shadow-sm` | CTA chính — **tối đa 1 per view** |
| **`secondary`** | `--secondary` | `--secondary-foreground` | 1px transparent | không | Action phụ, secondary CTA |
| **`outline`** | `--background` | `--foreground` | **1px solid `--border`** | không | Neutral action, **filter button** |
| **`ghost`** | transparent | `--foreground` | 1px transparent | không | **Icon button**, toolbar item, nav action |
| **`destructive`** | `--destructive` | **`--solid-badge-fg`** ⚠️ *không phải `--destructive-foreground`* | 1px transparent | `shadow-sm` | Irreversible action — delete, cancel subscription |

Default variant = `primary` (dòng 771).

### Bảng SIZE — 4 cái (dòng 717–722, 765–768)

| Size | Height | Padding-X | Padding-Y | Font-size | Font-weight | Gap | Khi dùng |
|---|---|---|---|---|---|---|---|
| **`sm`** | **30px** (`1.875rem`) | **10px** (`0.625rem`) | 0 (căn bằng height) | **12px** (`text-xs`) | 500 | **6px** | Toolbar compact, table row action |
| **`md`** *(default)* | **36px** (`h-9`) | **14px** (`0.875rem`) | 0 | **14px** (`text-sm`) | 500 | **8px** | Mặc định cho mọi button |
| **`lg`** | **40px** (`h-10`) | **16px** (`px-4`) | 0 | **14px** | 500 | **8px** | Hero CTA, form submit |
| **`icon`** | **36×36px** (`h-9 w-9`) | **0** | 0 | — | — | — | Icon-only — **BẮT BUỘC `aria-label`** (722) |

Default size = `md` (dòng 771).
Radius mọi size = **`--radius-md` = 8px** (dòng 675, 749).

⚠️ `sm` (30px) và padding 10px/14px **không nằm trên lưới 4px** mà bảng spacing (dòng 507) tuyên bố.

### Bảng STATE — 6 cái, mỗi state đổi CHÍNH XÁC cái gì (dòng 726–733)

| State | Thuộc tính đổi | Giá trị mới | Ghi chú |
|---|---|---|---|
| **Default** | — | Base + variant class | Dòng 728 |
| **Hover** | **chỉ `background-color`** | primary → `--primary-deep` · secondary → `--secondary` @ **alpha 80%** · outline → `--accent` · ghost → `--accent` · destructive → `--destructive` @ **alpha 90%** | Không đổi size, không nâng shadow. Transition 100ms (dòng 729) |
| **Active / Pressed** | `transform` | **`scale(0.98)`** | "Subtle press feedback" (dòng 730) |
| **Focus-visible** | ring | **ring 2px `--ring`** + **ring-offset 2px**, `outline: none` | **"Không bao giờ remove focus ring"** (dòng 731) |
| **Disabled** | `pointer-events` + `opacity` | `none` + **`0.5`** | **Quy tắc hành vi: KHÔNG thêm tooltip "Tại sao disabled?" — phải thêm inline text giải thích** (dòng 732) |
| **Loading** | `pointer-events` + nội dung | `none`, button bị `disabled`, **spinner 14px (`size-3.5`) quay** thay cho icon, `aria-hidden` | Mô tả: **"Button text ẩn, spinner hiện — width không đổi"** (dòng 733) |

⚠️ **Mâu thuẫn loading:** dòng 733 nói text ẩn, nhưng code (792–793) render **cả** spinner **lẫn** children → width sẽ đổi. Phải chốt: nếu giữ width thì text phải `visibility: hidden` (không `display: none`), hoặc bỏ yêu cầu "width không đổi".

### Quy tắc dùng

- **1 primary button per view** (dòng 709).
- Icon-only bắt buộc `aria-label` (722, 2605).
- Destructive dùng cho **irreversible** action; xem quy tắc confirm ở mục 2.11.
- Nhãn button phải là **động từ + bổ ngữ** ("Xuất Excel", không phải "Xuất"); destructive phải nói rõ hậu quả ("Xóa vĩnh viễn", không phải "Xóa") — Section 5.1, dòng 2410–2412.

---

## 2.2 CARD (dòng 803–872)

**Use case (805):** container chính cho mọi nội dung có boundary — KPI, form, list, chart, empty state.
**Anti-pattern (806):** **không nest Card trong Card quá 2 tầng** — tạo visual confusion.

### Bảng thông số từng phần

| Phần | Padding | Radius | Nền | Chữ | Border | Shadow | Dòng |
|---|---|---|---|---|---|---|---|
| **`Card`** (root) | — | **`--radius-xl` = 14px** | **`--card`** | `--card-foreground` | **1px `--border`** | `shadow-sm` (≈ `--shadow-card`) | 813 |
| **`CardHeader`** | **20px** tất cả, **`padding-bottom: 0`** | — | — | — | — | — | 821 |
| **`CardTitle`** | — | — | — | kế thừa | — | — | 825 |
| **`CardDescription`** | — | — | — | **`--muted-foreground`** | — | — | 829 |
| **`CardContent`** | **20px** tất cả, **`padding-top: 16px`** | — | — | — | — | — | 833 |
| **`CardFooter`** | **20px** tất cả, **`padding-top: 0`** | — | — | — | — | — | 838 |

### Typography bên trong

| Phần | Font-size | Font-weight | Line-height | Dòng |
|---|---|---|---|---|
| `CardTitle` (thẻ `<h3>`) | **14px** (`text-sm`) | **600** | **1** (`leading-none`) | 825 |
| `CardDescription` (thẻ `<p>`) | **12px** (`text-xs`) | 400 | default | 829 |

### Bố cục

- `CardHeader`: `display: flex; flex-direction: column;` **gap 6px** (dòng 821).
- `CardFooter`: `display: flex; align-items: center` (dòng 838).

### KPI card — anatomy đầy đủ (dòng 846–868)

```
CardHeader (padding 20px, padding-bottom 0)
  └ hàng: flex, align-items center, justify-content space-between
      • Label:  12px · weight 600 · UPPERCASE · letter-spacing 0.08em · --muted-foreground
      • Icon:   16px · --muted-foreground

CardContent (padding 20px, padding-top 16px)
  └ hàng: flex, align-items BASELINE, gap 4px
      • Số:      font-display · 30px · weight 700 · tabular-nums · --foreground   ← FULL opacity
      • Đơn vị:  16px · weight 500 · --muted-foreground     (ví dụ "đ")
  └ margin-top 12px, hàng: flex, align-items center, gap 8px
      • Badge delta (variant success nếu ≥0, destructive nếu <0)
      • text 12px --muted-foreground: "vs kỳ trước"
```

⚠️ Bảng spacing (515–516) ghi "20px = card padding default" và "24px = card padding large" nhưng **không nói khi nào dùng bản 24px**. Component chỉ dùng 20px.

### Quy tắc dùng

- Không nest > 2 tầng (806).
- KPI value **bắt buộc** `--foreground` full opacity, **cấm** `--muted-foreground` (501, 1534, anti-pattern #1 dòng 2642).
- Card không được overwrite `--card` trừ khi explicitly elevated (dòng 115).

---

## 2.3 INPUT / TEXTAREA / SELECT (dòng 873–956)

**Use case (875):** thu thập input từ user trong form, search, filter.
**Anti-pattern (876):** **không bỏ `<label>`** — nếu cần ẩn về mặt thị giác thì dùng `sr-only`, không bỏ hẳn.

### INPUT — bảng thông số (dòng 887–892)

| Thuộc tính | Giá trị |
|---|---|
| **Height** | **36px** (`h-9`) |
| Width | `100%` |
| **Radius** | **`--radius-md` = 8px** |
| **Border** | **1px solid `--input`** (token riêng, giá trị = `--border`) |
| **Nền** | **`--background`** ⚠️ *không phải `--card`* — input đặt trên card sẽ chìm nhẹ |
| **Padding-X** | **12px** (`px-3`) |
| Padding-Y | 0 (căn bằng height 36px) |
| **Font-size** | **14px** (`text-sm`) |
| Font-weight | 400 (không khai báo → default) |
| Màu chữ | `--foreground` |
| Màu placeholder | `--muted-foreground` |
| Transition | `colors`, 100ms |

### INPUT — bảng STATE (dòng 905–911)

| State | Thuộc tính đổi | Giá trị mới |
|---|---|---|
| **Default** | — | — |
| **Hover** | ❌ **KHÔNG CÓ** — tài liệu không định nghĩa hover cho input | — |
| **Focus-visible** | ring | **ring 2px `--ring`**, **`ring-offset: 0`** ⚠️ khác Button (offset 2px) |
| **Error** | `border-color` **và** ring color | **`--destructive`** cho cả hai |
| **Disabled** | `opacity` + `cursor` | **`0.5`** + `not-allowed` |
| **With icon left** | padding-left | **32px** (`pl-8`); icon `position: absolute; left: 10px; top: 50%; translateY(-50%)`, size **16px**, màu `--muted-foreground` |

### INPUT — QUY TẮC HÀNH VI KHI LỖI (dòng 916–935, 1769–1772, 1845–1850)

Cấu trúc field: container `flex flex-column`, **gap 6px**.

**Thứ tự dọc bắt buộc:**
```
[Label]           14px · weight 500 · --foreground · có htmlFor trỏ tới id input
[Input]           36px · border đầy đủ · focus ring
[Helper text]     12px · --muted-foreground · optional, LUÔN VISIBLE khi có
[Error message]   12px · --destructive-fg · THAY THẾ helper text khi có lỗi
```

**Khi có lỗi, đồng thời xảy ra 3 thứ:**
1. Input: `border-color` → **`--destructive`**, focus ring → **`--destructive`**.
2. Input nhận **`aria-describedby="{id}-error"`** — chỉ set khi có lỗi, còn không thì `undefined` (dòng 927).
3. Hiện `<p id="{id}-error">`: font **12px**, màu **`--destructive-fg`** ⚠️ *không phải `--destructive`* — vì `-fg` là biến thể đủ contrast trên nền sáng (5.0–5.1:1, dòng 226).

**Khi submit form có lỗi (dòng 1845–1850):**
1. Lấy field lỗi **đầu tiên**.
2. `scrollIntoView({ behavior: 'smooth', block: 'center' })` — cuộn mượt, đưa vào **giữa** viewport.
3. `.focus()` vào chính field đó.

**Cấm dùng toast cho form validation** (dòng 1137) — phải inline. Toast text cho `validation.required` = *"Vui lòng điền đầy đủ thông tin bắt buộc."* (dòng 2439).

**Quy tắc label (dòng 1752–1763):**
- Label **luôn ở trên** field. Không đặt bên phải, không dùng placeholder làm label. Lý do nêu rõ: *"UX VN quen label trên field"* (1748).
- Placeholder là **ví dụ**, không phải nhãn: `placeholder="Ví dụ: Sales Assistant"` — sai: `placeholder="Tên agent"` không có label ("khi user nhập xong thì mất label").
- Dấu bắt buộc: `<span>` màu **`--destructive`** chứa `*`, đặt **sau** text label (dòng 1781).

### SELECT (dòng 938–952)

**Quy tắc bắt buộc (dòng 942):** **KHÔNG dùng native `<select>`** — lý do: mất custom styling. Dùng Radix Select (với Vuetify: `v-select` custom).

| Phần | Height | Padding-X | Radius | Nền | Border | Font-size |
|---|---|---|---|---|---|---|
| **Trigger** (default) | **36px** | **12px** | `--radius-md` = 8px | `--background` | 1px `--input` | **14px** |
| **Trigger** (biến thể nhỏ, chỉ có ở Filter Bar dòng 1904) | **32px** (`h-8`) | — | — | — | — | **12px** (`text-xs`), width **160px** |
| **Content** (dropdown) | — | — | **`--radius-md` = 8px** ⚠️ | **`--popover`** | 1px `--border` | — |
| Content shadow | `shadow-md` (≈ `--shadow-md`) | | | | | |

⚠️ **Mâu thuẫn:** dòng 538 quy định dropdown/popover phải dùng `--radius-lg` (10px), nhưng SelectContent dùng `--radius-md` (8px).
⚠️ Biến thể trigger 32px **không được document trong 2.3** — chỉ xuất hiện ad-hoc trong Filter Bar.

Placeholder mẫu: "Chọn khoảng thời gian" (945), "Chọn model" (1792).

### TEXTAREA

**KHÔNG CÓ ĐẶC TẢ.** Chỉ xuất hiện trong tiêu đề mục 2.3 (dòng 873) và bảng token `--input` (dòng 281).
Thiếu hoàn toàn: height mặc định, số `rows`, `resize` behavior, min/max-height, padding-Y, hành vi auto-grow.
**Gợi ý suy diễn khi triển khai:** kế thừa Input (radius 8px, border `--input`, nền `--background`, padding-X 12px, font 14px), thêm padding-Y ~8px và `min-height` bội số của line-height.

---

## 2.4 BADGE (dòng 957–1005)

**Use case (959):** label trạng thái, số lượng, category — inline trong text hoặc bên cạnh element.
**Anti-pattern (960):** **badge KHÔNG clickable** — cần action thì dùng button.

### Geometry chung — áp cho MỌI variant (dòng 975)

| Thuộc tính | Giá trị |
|---|---|
| Display | `inline-flex`, `align-items: center`, `white-space: nowrap` |
| **Gap** (icon–text) | **4px** |
| **Radius** | **`--radius-full`** (pill, 9999px) |
| **Padding-X** | **8px** (`px-2`) |
| **Padding-Y** | **2px** (`py-0.5`) |
| **Font-size** | **11px** (`0.6875rem`) ⚠️ trái với bậc `label` = 12px trong typography scale (dòng 489) và trái với rule "text readable ≥ 14px" (dòng 501) |
| **Font-weight** | **600** |
| **Line-height** | **1.4** |
| Border | không (trừ variant `outline`) |
| **Height** | ❌ **không quy định** — suy ra: 11 × 1.4 + 2×2 = **~19.4px** |

### Bảng 7 VARIANT (dòng 962–970, 979–985)

| Variant | Nền (token) | Chữ (token) | Border | Khi dùng | Contrast doc ghi |
|---|---|---|---|---|---|
| **`success`** (tint) | `--success-bg` | `--success-fg` | không | Metric dương **bình thường**, agent online, task done | 5.8:1 AA |
| **`destructive`** (tint) | `--destructive-bg` | `--destructive-fg` | không | **Soft error**, minor issue | 5.1:1 AA |
| **`amber`** (tint) | ⚠️ **hardcode** `oklch(96% .08 70)` · dark `oklch(32% .1 70)` | ⚠️ **hardcode** `oklch(45% .16 70)` · dark `oklch(88% .15 70)` | không | NEW label, agent running, AI badge | AA |
| **`indigo`** (tint) | `--primary-mist` | `--primary` | không | Category, feature flag | AA |
| **`outline`** *(default)* | trong suốt | `--foreground` | **1px `--border`** | Neutral label, tag | AAA |
| **`solid-success`** | `--success` | `--solid-badge-fg` | không | **Critical positive** — refund dưới ngưỡng, uptime OK | 5.2:1 AA |
| **`solid-destructive`** | `--destructive` | `--solid-badge-fg` | không | **Critical negative** — refund > 3%, error spike, vượt budget | 4.7:1 AA |

Default variant = **`outline`** (dòng 988).

⚠️ **Variant `amber` hardcode màu OKLCH inline** — vi phạm trực tiếp anti-pattern #8 của chính tài liệu (dòng 2733) và **lệch khỏi token `--amber-bg`** đã định nghĩa (dòng 184 = `oklch(98.7% .022 95.277)`, khác `oklch(96% .08 70)`).

### QUY TẮC TINT vs SOLID — cốt lõi (dòng 249, 993–1002)

**Nguyên tắc gốc (dòng 249):**
> *"Critical data (refund > 3%, error spike) **PHẢI dùng solid badge** (`bg-destructive` + `--solid-badge-fg`) — tint không đủ visual weight."*

**Bảng quyết định (dòng 995–1002):**
```
refund_rate <= 3%   → solid-success        ← dữ liệu critical, ngưỡng OK
refund_rate >  3%   → solid-destructive    ← CẦN HÀNH ĐỘNG NGAY
trend === 'up'      → success       (tint) ← chỉ là xu hướng, không cần action
trend === 'down'    → destructive   (tint)
feature === 'new'   → amber
agent.running       → amber
```

**Diễn giải để map sang hệ thống khác:**
- **Tint** = thông tin tham khảo, không yêu cầu hành động.
- **Solid** = dữ liệu đã vượt ngưỡng nghiệp vụ, cần người can thiệp.

Anti-pattern #3 (dòng 2662–2671) nhắc lại lý do: *"Tint badge trên dark mode background có contrast thấp hơn expected. Solid badge với white text luôn rõ ràng, communicate urgency đúng mức."*

**A11y bắt buộc (dòng 2629–2631):** ô table chứa badge số liệu quan trọng phải có `aria-label` mô tả cả giá trị lẫn mức cảnh báo — ví dụ `aria-label="Tỷ lệ hoàn hàng: 3.2 phần trăm — cảnh báo"`.

### Token màu liên quan (dòng 207–239)

| Token | Light | Dark |
|---|---|---|
| `--success` | `oklch(50.8% .118 165.612)` | `oklch(80% .14 165)` |
| `--success-bg` | `oklch(95% .052 163.051)` | `oklch(28% .06 165)` |
| `--success-fg` | `oklch(32% .11 165)` | `oklch(88% .13 165)` |
| `--destructive` | `oklch(57.7% .245 27.325)` | `oklch(70.4% .191 22.216)` |
| `--destructive-bg` | `oklch(95% .03 25)` | `oklch(30% .1 25)` |
| `--destructive-fg` | `oklch(40% .2 27)` | `oklch(88% .16 27)` |
| `--solid-badge-fg` | `oklch(99% 0 0)` | **giữ nguyên** `oklch(99% 0 0)` |

---

## 2.5 AVATAR (dòng 1006–1063)

**Use case (1008):** đại diện cho user hoặc AI agent — sidebar, comment, task assignee.
**Anti-pattern (1009):** **không dùng cùng avatar style cho human và AI** — user phải phân biệt ngay.

### Bảng đối chiếu HUMAN vs AI AGENT

| Thuộc tính | **Human** (1015–1021) | **AI Agent** (1029–1044) |
|---|---|---|
| **Size** | **32px** (`size-8`) | **36px** (`size-9`) |
| **Radius** | **`9999px`** (tròn hoàn toàn) | **`--radius-md` = 8px** (squircle) |
| **Viền** | `ring: 1px --border` | **`outline: 2px solid var(--agent-ring-color)`** + **`outline-offset: 2px`** |
| **Nội dung** | Ưu tiên: **ảnh thật → initials → fallback icon** (1014) | **Icon `Bot` 16px. TUYỆT ĐỐI không dùng ảnh thật** (1060) |
| **Nền fallback** | `--primary` | `--primary` |
| **Chữ/icon fallback** | `--primary-foreground`, **12px weight 700** | `--primary-foreground` |
| Overflow | `hidden` (crop ảnh), ảnh `object-fit: cover` | — |
| **Status dot** | **KHÔNG BAO GIỜ có** (1059) | **BẮT BUỘC có** |

### Status dot của AI agent (dòng 1040–1044)

| Thuộc tính | Giá trị |
|---|---|
| Position | `absolute`, **`top: -4px; right: -4px`** |
| Size | **12px** (`size-3`) |
| Radius | `9999px` |
| **Viền tách nền** | **`ring: 2px --card`** |
| Màu | `var(--agent-dot-{status})` |
| **A11y** | **`aria-label="Agent {label}"`** bắt buộc |

### Token màu dot (dòng 617–620 light / 626–629 dark)

| Token | Light | Dark |
|---|---|---|
| `--agent-dot-online` | `oklch(50.8% .118 165.612)` (xanh lá) | `oklch(80% .14 165)` |
| `--agent-dot-running` | `oklch(66.6% .179 58.318)` (amber) | `oklch(80% .15 70)` |
| `--agent-dot-error` | `oklch(57.7% .245 27.325)` (đỏ) | `oklch(70.4% .191 22.216)` |
| `--agent-dot-offline` | `oklch(60% .02 285)` (xám) | `oklch(55% .02 285)` |
| `--agent-ring-color` | `oklch(54% .25 277)` | `oklch(70% .22 277)` |
| `--agent-ring-width` | **2px** | 2px |

### ⚠️ XUNG ĐỘT NHÃN TRẠNG THÁI — phải chốt trước khi code

| Key | Nhãn ở **2.5** (dòng 1048–1053) | Nhãn ở **3.7** (dòng 2013–2016) |
|---|---|---|
| `online` | "online" | **"Chờ việc"** |
| `running` | "đang chạy" | "Đang chạy" |
| `idle` | **"chờ việc"** (= đang rảnh, còn sống) | **"Ngoại tuyến"** (= offline, dùng token `--agent-dot-offline`) |
| `error` | "lỗi" | "Lỗi" |

Cùng key `idle` mang **hai nghĩa trái ngược** và **hai màu khác nhau**.
**Khuyến nghị:** dùng bộ của 3.7 (có nhãn tiếng Việt đầy đủ + mapping màu rõ ràng), sửa 2.5 theo.

### Token riêng chưa được định nghĩa

⚠️ Dòng 636 viết: *"AI/automation agent: `rounded-[--radius-chip]` squircle + indigo ring + status dot"* — nhưng **token `--radius-chip` KHÔNG tồn tại** trong block `:root` (345–463) hay bảng radius (525–531). Component thực tế dùng `--radius-md`.

---

## 2.6 TABLE (dòng 1064–1125)

**Use case (1066):** dữ liệu có cấu trúc cần sort, filter, paginate — SKU list, agent log, order history.
**Anti-pattern (1067):** **không render table bằng `<div>` grid** — mất a11y, mất keyboard nav.

### Chọn implementation theo số dòng (1071–1075)

| Số rows | Component | Lý do |
|---|---|---|
| **< 100** | Table thường (shadcn) | Đơn giản, không cần virtualization |
| **100 – 10.000** | TanStack Table + `@tanstack/react-virtual` | Virtual scrolling, type-safe columns |
| **> 10.000** hoặc cần sticky/frozen cell | RSuite Table | Virtualization + frozen columns built-in |

*(Map sang Vuetify: `v-data-table` → `v-data-table-virtual` → giải pháp riêng.)*

### Bảng thông số visual (1080–1118)

| Phần | Thuộc tính | Giá trị |
|---|---|---|
| **Wrapper ngoài** | radius | **`--radius-md` = 8px** ⚠️ (không phải `--radius-xl` như panel) |
| | border | 1px `--border` |
| | overflow | `hidden` |
| **Vùng scroll** | max-height | **460px** |
| | overflow | `auto` |
| **Header** | position | **`sticky; top: 0; z-index: 10`** |
| **Header row** | nền | **`--secondary`** |
| | hover | **GIỮ NGUYÊN `--secondary`** — không đổi màu khi rê chuột |
| **`TableHead` (ô header)** | font-size | **11px** (`0.6875rem`) |
| | font-weight | **600** |
| | text-transform | **UPPERCASE** |
| | letter-spacing | **0.04em** ⚠️ (khác 0.06em của bậc `label`, khác 0.08em của KPI label) |
| | màu chữ | **`--muted-foreground`** |
| | **height** | **40px** (`h-10`) |
| | padding-X | **14px** (`0.875rem`) |
| **Body row** | hover | nền → **`--accent`** |
| **Ô mã/ID** | | `font-mono` · **12px** · `--muted-foreground` |
| **Ô số** | | `text-align: right` · weight **600** · **`font-variant-numeric: tabular-nums`** · format `toLocaleString('vi-VN')` |
| **Ô badge** | | căn phải, chọn solid theo ngưỡng nghiệp vụ |

### Cấm rõ ràng (dòng 1120–1121)

Header **KHÔNG** được dùng `text-sm font-bold text-foreground` → *"quá nặng, cạnh tranh với data"*.

### Thiếu

- Không có spec cho sort indicator (icon gì, đặt ở đâu).
- Không có spec cho checkbox column (dù bulk selection có ở 3.6).
- Không có row height cho body row (chỉ header có 40px).
- Không có zebra striping / border giữa row (chỉ nói `--border` dùng cho "table row", dòng 280).

---

## 2.7 TOAST — Sonner pattern (dòng 1126–1186)

**Use case (1128):** feedback tức thì sau mutation — thành công, lỗi, thông báo không cần confirm.
**Anti-pattern (1129):** **không dùng toast cho error cần user đọc kỹ (form validation)** — dùng inline error.

### QUY TẮC HÀNH VI: toast vs inline (dòng 1133–1139)

| Tình huống | Xử lý | Thời lượng |
|---|---|---|
| **Mutation success** | Toast success | **auto-dismiss 4s** |
| **Mutation error (retry được)** | Toast error + **nút "Thử lại"** | — |
| **Form validation** | **Inline error** + scroll tới lỗi đầu tiên | — |
| **Error 500 server** | Toast error generic: *"Có lỗi xảy ra. Đã báo team."* — **KHÔNG show raw message** | — |
| **Irreversible action done** | Toast + **Undo** | **5s** |

⚠️ **Mâu thuẫn với anti-pattern #9** (2746–2767): ở đó undo dành cho **reversible** action, còn irreversible mới cần confirm dialog. Nếu thật sự irreversible thì không thể undo. Nhiều khả năng dòng 1139 viết nhầm — ý đúng: *"reversible action done → Toast + Undo 5s"*.

### Pattern bắt buộc

| Pattern | Chi tiết | Dòng |
|---|---|---|
| **Error mapping** | Luôn qua bảng: `errorMessages[err.code] ?? 'Có lỗi xảy ra. Đã báo team.'`. Bảng nội dung ở 5.3 (2435–2441) | 1149 |
| **Undo** | `duration: 5000`, nhãn nút = **"Hoàn lại"** | 1152–1158 |
| **Loading → result** | Tạo toast loading nhận `id`, khi xong **cập nhật cùng `id`** thay vì đẩy toast mới. Copy mẫu: "Đang xuất Excel..." → "Đã xuất xong" | 1161–1163 |

### Bảng styling (dòng 1172–1182)

| Phần | Thuộc tính | Giá trị |
|---|---|---|
| **Toaster** | position | **`bottom-right`** |
| **Toast body** | nền | `--card` |
| | border | 1px `--border` |
| | chữ | `--foreground` |
| | shadow | **`shadow-lg`** ⚠️ không map vào token nào (gần nhất `--shadow-pop`) |
| | radius | **`--radius-md` = 8px** |
| **Description** | màu | `--muted-foreground` |
| **Action button** | nền / chữ | `--primary` / `--primary-foreground` |
| **Variant error** | border | **`--destructive-bg`** |

### A11y (dòng 2616–2618)

Toast phải có **`role="alert"`** + **`aria-live="assertive"`**.

### Thiếu

Max-width, số toast tối đa đồng thời, hành vi stack, position trên mobile, animation vào/ra.

---

## 2.8 COMMAND PALETTE / CMDK (dòng 1187–1230)

**Use case (1189):** global navigation + search + action shortcut — trigger bằng **`⌘K` / `Ctrl+K`**.
**Anti-pattern (1190):** **không route mọi thứ qua CMDK** — nó là shortcut, không phải primary nav.

### Bảng thông số

| Phần | Thuộc tính | Giá trị | Dòng |
|---|---|---|---|
| **Container** | padding | 0 | 1199 |
| | radius | **`--radius-lg` = 10px** | 1199 |
| | overflow | `hidden` | 1199 |
| | shadow | `shadow-lg` | 1199 |
| | **max-width** | **580px** | 1199 |
| | nền | **`--popover`** | 1200 |
| **Hàng search** | layout | `flex align-items center` | 1201 |
| | border-bottom | **1px `--border`** | 1201 |
| | padding-X | **12px** | 1201 |
| **Icon search** | size | **16px** | 1202 |
| | màu | `--muted-foreground` | 1202 |
| | margin-right | **8px**, `shrink-0` | 1202 |
| **Ô nhập** | padding-Y | **14px** (`py-3.5`) | 1205 |
| | **font-size** | **15px** (`0.9375rem`) ⚠️ không có trong typography scale | 1205 |
| | nền | trong suốt | 1205 |
| | outline | `none` | 1205 |
| | placeholder | `--muted-foreground`, nội dung **"Tìm trang, agent, lệnh..."** | 1204–1205 |
| **Kbd "ESC"** | font-size | **10px** | 1207 |
| | padding | **6px × 2px** | 1207 |
| | radius | `rounded` (không nêu token) | 1207 |
| | font | `font-mono` | 1207 |
| | nền / chữ | **`--muted`** / `--muted-foreground` | 1207 |
| **List** | padding-Y | **6px** | 1209 |
| | **max-height** | **320px** (`max-h-80`) | 1209 |
| | overflow | `auto` | 1209 |
| **Empty state** | padding-Y | **32px** | 1210 |
| | text-align | `center` | 1210 |
| | font-size | **14px** | 1210 |
| | màu | `--muted-foreground` | 1210 |
| | **copy** | **"Không tìm thấy kết quả."** | 1211 |
| **Item** | layout | `flex align-items center`, **gap 8px** | 1224 |
| | padding | **12px × 8px** | 1224 |
| | font-size | **14px** | 1224 |
| | màu chữ | `--foreground` | 1224 |
| | radius | **`calc(--radius-md − 4px)` = 4px** | 1224 |
| | cursor | `pointer` | 1224 |
| | **selected** | nền **`--accent`** (qua `aria-selected`) | 1224 |
| | margin-X | **4px** | 1224 |
| **Group heading** | padding | **12px × 6px** | 1226 |
| | font-size | **10px** | 1226 |
| | font-weight | **600** | 1226 |
| | text-transform | UPPERCASE | 1226 |
| | letter-spacing | **0.08em** | 1226 |
| | màu | `--muted-foreground` | 1226 |

### Phím tắt (từ 6.3, dòng 2574–2579)

| Phím | Hành động |
|---|---|
| `⌘K` / `Ctrl+K` | Mở/đóng command palette |
| `Esc` | Đóng |
| `↑` / `↓` | Di chuyển trong list |
| `Enter` | Xác nhận item đang focus |

Nhóm mẫu: `Command.Group heading="Trang"` (dòng 1213).

---

## 2.9 SKELETON (dòng 1231–1276)

**Use case (1233):** placeholder trong khi data đang load — **shape phải match final UI**.
**Anti-pattern (1234):** **không dùng `<Spinner>` toàn page thay skeleton.** ⚠️ dòng 1234 dẫn "anti-pattern #4 Engineering Guide" nhưng trong Section 7 của chính tài liệu, spinner-toàn-page là **#7** (dòng 2720) — cross-reference gãy.

### Base (dòng 1241)

| Thuộc tính | Giá trị |
|---|---|
| Animation | **`animate-pulse`** |
| Radius | **`--radius-sm` = 6px** |
| Nền | **`--muted`** |

### Bộ shape cho KPI card (dòng 1251–1262)

| Phần thật | Class | Kích thước |
|---|---|---|
| Label | `h-3 w-16` | **12 × 64px** |
| Icon | `size-4 rounded-full` | **16 × 16px**, **tròn** |
| KPI number | `h-8 w-40`, `margin-bottom: 4px` | **32 × 160px** |
| Badge + text | `h-4 w-24`, `margin-top: 12px` | **16 × 96px** |

⚠️ Bộ số này **khác** bộ ở 3.3 (dòng 1716–1717) dùng `w-[60%]` và `w-[40%]` cho đúng hai phần tử đó. Phải chốt một bộ.

### Decision tree skeleton vs spinner (dòng 1268–1272)

```
First load bất kỳ section → Skeleton (shape match)
Background refetch        → Dim data cũ + subtle spinner ở header
Mutation đang chạy        → Button loading state (spinner trong button)
Long-running agent task   → Progress bar + estimated time
< 200ms load              → KHÔNG hiển thị gì (tránh flash)
```

Bản đầy đủ hơn (6 case, có số đo) ở 3.3 — xem file section 3.

---

## 2.10 TABS (dòng 1277–1304)

**Use case (1279):** switch giữa các view trong cùng 1 context — không reload page.
**Anti-pattern (1280):** **không dùng tabs cho > 5 items** — dùng Select dropdown hoặc sidebar nav.

### Bảng thông số

| Phần | Thuộc tính | Giá trị | Dòng |
|---|---|---|---|
| **`TabsList`** (track) | height | **36px** (`h-9`) | 1285 |
| | nền | **`--muted`** | 1285 |
| | padding | **4px** | 1285 |
| | radius | **`--radius-md` = 8px** | 1285 |
| **`TabsTrigger`** — inactive | radius | **`calc(--radius-md − 2px)` = 6px** | 1288 |
| | padding-X | **12px** | 1288 |
| | font-size | **14px** | 1288 |
| | font-weight | **500** | 1288 |
| | màu chữ | **`--muted-foreground`** | 1288 |
| | nền | trong suốt | 1288 |
| **`TabsTrigger`** — **active** | nền | **`--background`** | 1289 |
| | màu chữ | **`--foreground`** | 1289 |
| | shadow | **`shadow-sm`** (nổi lên khỏi track) | 1289 |
| **Transition** | | `transition-all` **100ms** | 1290 |
| **`TabsContent`** | margin-top | **16px** | 1297 |

### Trạng thái

| State | Đặc tả |
|---|---|
| Default (inactive) | ✅ |
| **Active** | ✅ |
| **Hover** | ❌ **KHÔNG CÓ** |
| **Focus-visible** | ❌ không nêu riêng — kế thừa base (dòng 678) |
| **Disabled** | ❌ **KHÔNG CÓ** |

### Thiếu

Không có variant tab kiểu underline; không có hành vi overflow khi nhiều tab; không có spec badge/count trong tab label.

Nhãn tab mẫu (1293–1295): "Doanh thu", "Đơn hàng", "AI Agents".

---

## 2.11 DIALOG / SHEET (dòng 1305–1368)

**Use case (1307):** **Dialog** = confirmation + critical form. **Sheet** = detail panel, settings, bulk edit.
**Anti-pattern (1308):** không dùng Dialog cho info non-critical — dùng Popover hoặc Tooltip.

### Decision tree — chọn Dialog hay Sheet (dòng 1312–1318)

```
Action irreversible (delete, cancel)?  → Dialog + confirm button
Form phức tạp > 4 fields?              → Sheet (side panel)
Detail view?                           → Sheet (right, 480px)
Error cần acknowledge?                 → Dialog
Info chỉ cần đọc?                      → Tooltip hoặc Popover — KHÔNG Dialog
```

Cây đầy đủ hơn (6 nhánh + bảng kích thước) ở **3.8** (dòng 2080–2110).

### DIALOG — bảng thông số (dòng 1327–1341, 2107–2108)

| Phần | Thuộc tính | Giá trị |
|---|---|---|
| **Container** | **max-width** | **425px** ⚠️ dòng 2084 ghi 420px — chốt **425px** |
| | max-width (bản `lg`) | **600px** |
| | **max-height** | **85vh** |
| | radius | **`--radius-lg` = 10px** |
| | shadow | không nêu ở component; bảng 1.5 (561) quy **`--shadow-pop`** |
| | animation vào | `dialogIn` — `opacity 0→1`, `scale(0.96)→1`, duration **320ms**, ease-out (598, 593) |
| **Title** | font | **`font-display`** |
| | font-size | **18px** (`text-lg`) |
| | font-weight | **600** |
| **Description** | font-size | **14px** |
| | màu | `--muted-foreground` |
| **Footer** | gap | **8px** |
| | margin-top | **8px** |

### QUY TẮC HÀNH VI DESTRUCTIVE — CÓ CONFIRM, và bắt buộc

Tài liệu quy định ở **3 nơi độc lập**:

1. **Decision tree 2.11 (dòng 1313):** *"Action irreversible (delete, cancel)? → **Dialog với confirm button**"*
2. **Decision tree 3.8 (dòng 2083–2084):** *"Có cần user confirm trước khi action? (**destructive, payment, send email**) → YES → **Dialog (modal)**"*
3. **Anti-pattern #9 (dòng 2767):** *"Confirm dialog **chỉ cần cho irreversible actions** (delete, payment). **Reversible actions → optimistic update + undo**. Mỗi confirm dialog thêm 1–2 click, nhân lên 100 actions/ngày = friction lớn."*

**QUY TẮC CHỐT:**

| Loại action | Xử lý |
|---|---|
| Destructive **irreversible** (delete vĩnh viễn, payment, gửi email) | **BẮT BUỘC confirm Dialog** |
| Destructive **reversible** (archive, ẩn, gỡ khỏi list) | **CẤM confirm dialog** → optimistic update + **Undo toast 5s** |

### Anatomy confirm dialog + copy chuẩn (dòng 1325–1340)

| Phần | Nội dung mẫu | Quy tắc |
|---|---|---|
| Trigger | Button variant `destructive`, nhãn "Xóa agent" | — |
| **Title** | **"Xóa agent?"** | Câu hỏi ngắn, kết thúc bằng `?` |
| **Description** | **"Agent "Sales Bot" sẽ bị xóa vĩnh viễn. Không thể hoàn tác."** | Nêu **tên đối tượng cụ thể** + **hậu quả** + **tính không hoàn tác** |
| **Nút trái** | **"Hủy"**, variant `outline`, đóng dialog | Không dùng "Cancel"/"Đóng" (2403) |
| **Nút phải** | **"Xóa vĩnh viễn"**, variant `destructive` | **Phải nói rõ hậu quả** — cấm "Có"/"Confirm"/"OK" (2407, 2412) |

### A11y Dialog (dòng 2566)

Dialog **phải trap focus khi mở** và **trả focus về trigger khi đóng**.

### SHEET — bảng thông số (dòng 1353–1362, 2109–2110)

| Phần | Thuộc tính | Giá trị |
|---|---|---|
| **Sheet right** | side | `right` |
| | **width** | **480px** — cố định cả ở breakpoint `sm` |
| | height | **100vh** |
| | nền | **`--background`** (không phải `--card`) |
| | viền | **`border-left: 1px --border`** |
| **Header** | padding | **24px ngang × 20px dọc** |
| | border-bottom | **1px `--border`** |
| **Header title** | font | **`font-display`**, weight **600** (không nêu size) |
| **Body** | padding | **24px** |
| | overflow | `overflow-y: auto` |
| **Sheet bottom** | height | `auto` |
| | max-height | **85vh** |
| | dùng cho | Mobile-specific, filter panel |

⚠️ Sheet 480px **không có breakpoint nào** — trên màn < 480px sẽ tràn. Sheet bottom chỉ có 1 dòng spec (2110), không có chi tiết.

---

## 2.12 INSIGHT CALLOUT — ERP-specific (dòng 1369–1431)

**Use case (1371):** hiển thị output hoặc insight từ AI Agent — **phân biệt rõ với UI thường**.
**Anti-pattern (1372):** **không dùng standard Card** — phải có **indigo gradient + agent avatar** để signal "đây là AI content".

### Bảng thông số

| Phần | Thuộc tính | Giá trị | Dòng |
|---|---|---|---|
| **Container** | radius | **`--radius-md` = 8px** ⚠️ (không phải `--radius-xl` như card) | 1387 |
| | border | 1px `--border` | 1387 |
| | padding | **16px** | 1387 |
| | layout | `flex`, `align-items: flex-start` | 1387 |
| | **gap** | **14px** (`gap-3.5`) | 1387 |
| | **nền** | **`linear-gradient(135deg, var(--insight-gradient-from), var(--insight-gradient-to))`** | 1389 |
| **Token gradient** | light | từ `oklch(54% .25 277 / 0.08)` → `var(--card)` | 621–622 |
| | dark | từ `oklch(70% .22 277 / 0.12)` → `var(--card)` | 630–631 |
| **Avatar block** | size | **36px** (`size-9`) | 1395 |
| | radius | `--radius-md` = 8px | 1395 |
| | nền / chữ | `--primary` / `--primary-foreground` | 1396 |
| | icon | `Bot` **16px**, `aria-hidden` | 1398 |
| | | `shrink-0` | 1393 |
| **Status dot** | position | `absolute; top: -4px; right: -4px` | 1401 |
| | size | **12px**, tròn | 1401 |
| | ring | **2px `--card`** | 1401 |
| | **mapping** | `running` → `--agent-dot-running` · `error` → `--agent-dot-error` · **`done` → `--agent-dot-online`** (dùng lại màu online) | 1402 |
| **Vùng nội dung** | | `flex-1`, **`min-width: 0`** (cho phép truncate) | 1407 |
| **Hàng meta** | layout | `flex align-items center`, **gap 8px**, **`flex-wrap`** | 1408 |
| | margin-bottom | **6px** | 1408 |
| **Tên agent** | | **14px** weight **600**, màu `--foreground` | 1409 |
| **Timestamp** | | **12px**, `--muted-foreground` | 1413 |
| **Body** | font-size | **14px** | 1415 |
| | màu | `--foreground` | 1415 |
| | **opacity** | **0.92** ⚠️ không phải class Tailwind chuẩn; mâu thuẫn nguyên tắc "text data full opacity" | 1415 |
| | line-height | `relaxed` | 1415 |
| **CTA** (optional) | | Button variant **`outline`** size **`sm`**, nhãn **"Xem chi tiết"**, `shrink-0` | 1421–1423 |

### Badge theo trạng thái (dòng 1410–1412)

| Status | Badge variant | Icon | Nhãn |
|---|---|---|---|
| `running` | **`amber`** | `Sparkles` **10px** (`size-2.5`) | **"đang chạy"** |
| `done` | **`success`** | — | **"hoàn thành"** |
| `error` | **`destructive`** | — | **"lỗi"** |

### Voice của nội dung bên trong (Section 5.5, dòng 2504–2518)

- Pattern hiển thị: `[Tên agent] + [badge] + [nội dung]`
- Nội dung phải có **số liệu cụ thể**, không abstract
- **Không dùng "Tôi nghĩ" / "Có vẻ như"** — agent nói thẳng
- Khi không chắc: **"Cần xem thêm dữ liệu để kết luận"** — không bịa
- **Không dùng emoji trong agent output** (emoji chỉ được dùng trong badge)

---

## 2.13 SPARKLINE — ERP-specific (dòng 1432–1486)

**Use case (1434):** mini trend chart trong table cell — thay thế số hoặc badge khi **trend quan trọng hơn value**.
**Anti-pattern (1435):** **không dùng một màu duy nhất cho mọi sparkline** — trend up = `--chart-1`, down = `--destructive`.

### Bảng thông số

| Thuộc tính | Giá trị | Dòng |
|---|---|---|
| **Width mặc định** | **88px** | 1445 |
| **Height mặc định** | **24px** | 1445 |
| **Padding trong** (mỗi cạnh) | **2px** | 1447 |
| **Stroke width** | **1.75** | 1476 |
| **Linecap / linejoin** | `round` | 1477–1478 |
| **Fill** | `none` (chỉ đường, không tô nền) | 1474 |
| **A11y** | **`aria-hidden="true"`** | 1469 |
| Display | `block` | 1470 |
| **Điều kiện render** | cần **≥ 2 điểm dữ liệu**, dưới đó **không render gì** | 1446 |

### QUY TẮC MÀU THEO TREND (dòng 1451, 1459–1462)

```
trend = data[cuối] − data[đầu]

trend >= 0  → stroke = var(--chart-1)      (indigo)
trend <  0  → stroke = var(--destructive)  (đỏ)
```

Token: `--chart-1` light = `oklch(54% .25 277)`, dark = `oklch(70% .22 277)` (dòng 314, 321).

### Vị trí trong KPI card (dòng 1529)

Tầng 4 của hierarchy: **`w-22 h-6`** = **88×24px** (khớp default), **`align-self: flex-end`** (dồn phải, đáy).

---

## 3. TỔNG HỢP MÂU THUẪN TRONG SECTION 2 — CHECKLIST TRƯỚC KHI CODE

| # | Vấn đề | Dòng | Phải quyết |
|---|---|---|---|
| 1 | Button loading: text ẩn hay không? | 733 vs 792–793 | Chọn 1 |
| 2 | Nhãn trạng thái agent `idle`/`online` mâu thuẫn giữa 2.5 và 3.7 | 1048–1053 vs 2013–2016 | Dùng bộ 3.7 |
| 3 | Badge `amber` hardcode OKLCH, lệch token `--amber-bg` | 966, 981 vs 184, 2733 | Đưa về token |
| 4 | Radius dropdown/popover: `--radius-lg` (quy định) vs `--radius-md` (thực tế Select/Toast/Table/Insight) | 538 vs 947, 1176, 1080, 1387 | Chọn 1 |
| 5 | Badge font 11px, TableHead 11px, kbd/CMDK heading 10px — trái rule "text ≥ 14px" và bậc `label` 12px | 975, 1085, 1207 vs 489, 501 | Nới rule hoặc sửa size |
| 6 | Letter-spacing vai trò "label": 0.06em / 0.08em / 0.04em | 489 vs 850 vs 1085 | Chuẩn hoá |
| 7 | Focus: `outline+box-shadow` (CSS global) vs `ring` (utility); ring-offset 2px (Button) vs 0px (Input) | 565–569 vs 678, 891 | Chọn 1 cơ chế |
| 8 | Token `--radius-chip` được dùng nhưng chưa định nghĩa | 636 | Định nghĩa hoặc bỏ |
| 9 | Padding Button 10px/14px không nằm trên lưới 4px | 507 vs 719–720 | Chấp nhận hoặc làm tròn |
| 10 | `shadow-lg` (Toast, CMDK) không map vào token nào | 1176, 1199 vs 549–553 | Map sang `--shadow-pop` |
| 11 | Undo cho "irreversible action" — logic mâu thuẫn với #9 | 1139 vs 2746 | Sửa thành "reversible" |
| 12 | Skeleton KPI: `w-40`/`w-24` (2.9) vs `w-[60%]`/`w-[40%]` (3.3) | 1259–1260 vs 1716–1717 | Chọn 1 |
| 13 | Cross-reference gãy: "anti-pattern #4" thực ra là #7 | 1234 vs 2720 | Sửa số |
| 14 | `opacity-92` không phải class chuẩn, mâu thuẫn nguyên tắc full-opacity | 1415 | Bỏ hoặc chuẩn hoá |
| 15 | Dialog max-width 420px (tree) vs 425px (bảng + code) | 2084 vs 2107, 1327 | Chốt 425px |

## 4. LƯU Ý CHUYỂN ĐỔI SANG VUETIFY

- **Toàn bộ màu trong tài liệu là OKLCH.** Vuetify 4.0.3 không parse được `oklch()` (`cssColorRe` chỉ khớp `rgb/rgba/hsl/hsla`). Mọi token màu đưa vào `frontend/src/plugins/vuetify.ts` **phải convert sang hex/rgb/hsl trước**. Tài liệu viết cho Tailwind v4 nên không đề cập.
- Tài liệu giả định `cva` + `tailwind-merge` + Radix + Sonner + cmdk + TanStack. **Không cái nào bắt buộc** để tái hiện đặc tả — mọi số đo/token/hành vi ở trên đủ để làm bằng Vuetify + SCSS.
- Hai giá trị **"locked"** cần đưa thẳng vào biến layout: **header 64px**, **sidebar 288px** (dòng 518–519).
- Toàn bộ Section 2 **không có spec responsive** — mọi số đo là desktop.
