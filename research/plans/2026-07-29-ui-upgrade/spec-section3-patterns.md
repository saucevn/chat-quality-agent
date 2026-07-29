# ERP Design System v2.0 — SECTION 3: PATTERNS

Trích xuất từ `/Users/dev/Downloads/ERP-design-system-v2.md`, dòng **1510–2133** (624 dòng).
Mọi số dòng trỏ về file gốc. Code React/TSX đã bị lược bỏ — chỉ giữ số đo, token, quy tắc.

---

## 0. MỤC LỤC SECTION 3 + BẢNG ĐỘ PHỦ TRẠNG THÁI

| # | Pattern | Dòng | Độ dài |
|---|---|---|---|
| 3.1 | KPI Card Grid | 1510–1578 | 69 |
| 3.2 | Empty State | 1579–1674 | 96 |
| 3.3 | Loading State | 1675–1744 | 70 |
| 3.4 | Form Layout | 1745–1854 | 110 |
| 3.5 | Filter Bar | 1855–1933 | 79 |
| 3.6 | Data Table Toolbar | 1934–2003 | 70 |
| 3.7 | Agent Presence Indicators | 2004–2074 | 71 |
| 3.8 | Modal vs Sheet vs Inline — Decision Tree | 2075–2113 | 39 |
| — | Checklist tự verify — Section 3 | 2114–2133 | 20 |

### Bảng độ phủ 4 trạng thái — TÓM TẮT TRƯỚC

| Pattern | Có dữ liệu | Loading | Empty | Error |
|---|---|---|---|---|
| **3.1 KPI Grid** | ✅ đầy đủ | ✅ (qua 3.3) | ❌ **KHÔNG CÓ** | ❌ **KHÔNG CÓ** |
| **3.2 Empty State** | — | — | ✅ đầy đủ | ✅ đầy đủ |
| **3.3 Loading State** | — | ✅ đầy đủ | — | ⚠️ chỉ nêu "cần fallback sau 3s", không có spec |
| **3.4 Form Layout** | ✅ đầy đủ | ✅ (nút submit) | — | ✅ đầy đủ |
| **3.5 Filter Bar** | ✅ đầy đủ | ❌ **KHÔNG CÓ** | ✅ (mượn 3.2 `no-data`) | ❌ **KHÔNG CÓ** |
| **3.6 Table Toolbar** | ⚠️ toolbar global thiếu số đo | ❌ **KHÔNG CÓ** | ✅ (mượn 3.2) | ✅ (mượn 3.2) |
| **3.7 Agent Presence** | ✅ đầy đủ 4 state | ❌ **KHÔNG CÓ** | ❌ **KHÔNG CÓ** | ⚠️ `error` là state của agent, không phải của fetch |
| **3.8 Overlay tree** | ✅ | — | — | — |

> **Kết luận quan trọng cho plan:** **3.2 Empty State là nguồn DUY NHẤT** cho trạng thái empty và error trong toàn Section 3. Khi triển khai, nên quy định: mọi container dữ liệu (KPI card, table, list, panel, board column) **bắt buộc** khai báo 4 slot — `data` / `skeleton` / `empty` / `error` — trong đó `empty` và `error` luôn render qua component EmptyState với variant tương ứng.

---

## 3.1 KPI CARD GRID (dòng 1510–1578)

### Mục đích / dùng ở đâu

**Use case (1512):** hiển thị **3–5 metric chính ở đầu dashboard** — mục tiêu: user đọc được trạng thái tổng quan trong **< 3 giây**.
**Anti-pattern (1513):** **không nhét > 5 KPI card trong 1 grid** — cognitive overload; phải split thành 2 hàng hoặc dùng tab.

Dùng ở: đầu Analytics Dashboard (4.1, dòng 2199, ngay sau InsightCallout).

### Cấu trúc bố cục — 3 config, số cột theo breakpoint (dòng 1517–1521)

| Config | Classes | **< 640px** | **≥ 640px** (`sm`) | **≥ 1024px** (`lg`) | **Gap** | Khi dùng |
|---|---|---|---|---|---|---|
| **4-up** | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4` | **1 cột** | **2 cột** | **4 cột** | **16px** | Dashboard chính, ≥ 4 metric quan trọng ngang nhau |
| **2-up** | `grid-cols-1 sm:grid-cols-2 gap-4` | **1 cột** | **2 cột** | 2 cột | **16px** | Mobile-first view, hoặc khi 2 metric quan trọng hơn hẳn |
| **Hero + 3** | `grid-cols-1 lg:grid-cols-3 gap-4` + card đầu `lg:col-span-1` "lớn hơn" | **1 cột** | 1 cột | **3 cột** | **16px** | Khi 1 metric là "north star" |

⚠️ **Config "Hero + 3" KHÔNG implement được như viết:** `col-span-1` trong grid 3 cột **không** lớn hơn các card khác. Nhiều khả năng ý định là `col-span-2` (hero chiếm 2/3, 3 card nhỏ xếp bên), hoặc một cấu trúc grid khác. **Cần thiết kế lại.**

Breakpoint không đặt tên riêng — dùng mặc định Tailwind: `sm` = 640px, `lg` = 1024px.

### Hierarchy 4 tầng bên trong 1 card (dòng 1526–1529)

| Tầng | Nội dung | Font-size | Weight | Letter-spacing | Màu (token) | Khác |
|---|---|---|---|---|---|---|
| **1 — Label** | Tên metric | **12px** | **600** | **0.08em** | **`--muted-foreground`** | **UPPERCASE** |
| **2 — Value** | Con số | **30px** (`text-3xl`) | **700** | -0.025em (từ 1.2) | **`--foreground`** ← **FULL opacity, BẮT BUỘC** | `font-display`, `tabular-nums` |
| **3 — Delta** | Badge + chú thích | 12px (chú thích) | — | — | Badge success/destructive + text `--muted-foreground` | — |
| **4 — Sparkline** | *tuỳ chọn* | — | — | — | theo trend | **88×24px**, `align-self: flex-end` |

### Cấu trúc chi tiết một card (dòng 1544–1572, khớp KPI card pattern ở 2.2 dòng 846–868)

```
Card  (radius 14px --radius-xl · border 1px --border · nền --card · shadow-sm)
│
├─ CardHeader   (padding 20px, padding-bottom 0)
│    └─ hàng: flex · align-items center · justify-content space-between
│         • Label:  12px · w600 · UPPERCASE · ls 0.08em · --muted-foreground
│         • Icon:   16px · --muted-foreground
│
└─ CardContent  (padding 20px, padding-top 16px)
     ├─ hàng: flex · align-items BASELINE · gap 4px
     │    • Số:     font-display · 30px · w700 · tabular-nums · --foreground
     │    • Đơn vị: 16px · w500 · --muted-foreground     (ví dụ "đ")
     │
     └─ margin-top 12px · hàng: flex · align-items center · justify-content SPACE-BETWEEN
          ├─ cụm trái: flex · align-items center · gap 8px
          │     • Badge delta
          │     • text 12px --muted-foreground: "vs kỳ trước"
          └─ cụm phải: Sparkline 88×24px
```

### Format delta (dòng 1564–1566)

```
delta >= 0  → mũi tên "↑" + Math.abs(delta).toFixed(1) + "%"  · Badge variant "success"
delta <  0  → mũi tên "↓" + Math.abs(delta).toFixed(1) + "%"  · Badge variant "destructive"
```
Định dạng số theo vi-VN: dấu phẩy thập phân (`18,4%`) — Section 5.4, dòng 2473–2476, 2490.

### 3 điều CẤM (dòng 1534–1536)

1. **Value dùng `--muted-foreground`** — contrast không đủ AAA cho data. (Lặp lại ở dòng 501 và anti-pattern #1 dòng 2642–2648.)
2. **Delta badge dùng tint khi vượt threshold** — phải dùng **solid badge** (theo rule Section 2.4, dòng 995–1002).
3. **Sparkline giữ một màu bất kể trend** — phải đổi màu theo trend (`--chart-1` khi lên, `--destructive` khi xuống).

### 4 trạng thái

| Trạng thái | Có/Không | Đặc tả |
|---|---|---|
| **Có dữ liệu** | ✅ | Đầy đủ, dòng 1526–1571 |
| **Loading** | ✅ | Xem 3.3 (dòng 1706–1721) — skeleton 4 card, mỗi card 4 khối |
| **Empty** | ❌ **KHÔNG CÓ** | Không nói KPI = 0 hoặc `null` thì hiển thị gì: dấu `—`? số 0? ẩn card? Cũng không nói grid rỗng thì sao |
| **Error** | ❌ **KHÔNG CÓ** | Không nói 1 KPI fail trong khi 3 cái kia OK thì render thế nào (card lỗi riêng? cả grid chuyển error?) |

---

## 3.2 EMPTY STATE (dòng 1579–1674)

### Mục đích / dùng ở đâu

**Use case (1581):** placeholder khi container không có data — first run, no results, error.
**Anti-pattern (1582):** **không để container trắng trơn không có gì** — user không biết tại sao trống hay phải làm gì tiếp theo.

Đây là **component chia sẻ** (`components/shared/EmptyState.tsx`), dùng cho mọi container: table, list, board, panel, KPI grid.

### 3 VARIANTS — bảng đầy đủ (dòng 1586–1590, 1614–1618, 1635)

| Variant | Trigger | Icon | **Màu icon (token)** | Title mẫu | Action | **Variant nút** |
|---|---|---|---|---|---|---|
| **`first-run`** | User mới, chưa tạo resource nào | Feature icon (có màu) | **`--primary`** | "Chưa có [resource] nào" | CTA tạo mới | **`primary`** |
| **`no-data`** | Search/filter trả về 0 kết quả | Search icon (`SearchX`) | **`--muted-foreground`** | "Không tìm thấy kết quả" | Clear filter | **`primary`** |
| **`error`** | API lỗi, load fail | `AlertTriangle` | **`--destructive-fg`** | "Không tải được dữ liệu" | Retry button | **`outline`** |

Logic map màu icon (1614–1618): `error` → `--destructive-fg`; `no-data` → `--muted-foreground`; còn lại (`first-run`) → `--primary`.
Logic map variant nút (1635): `error` → `outline`; còn lại → `primary`.

### 3 YẾU TỐ BẮT BUỘC (dòng 1594–1597)

Mọi empty state **PHẢI có đủ 3**:

1. **Icon / illustration** — Lucide icon hoặc SVG đơn giản. **KHÔNG dùng ảnh phức tạp.**
2. **Title ngắn** — nói trạng thái là gì. **CẤM viết "Oops!" hoặc "Không có gì ở đây".**
3. **Action** — bước tiếp theo user làm gì.

### Thông số đo được (dòng 1621–1640)

| Phần | Thuộc tính | Giá trị |
|---|---|---|
| **Container** | layout | `flex` · `flex-direction: column` · `align-items: center` · `justify-content: center` |
| | text-align | `center` |
| | **padding** | **64px dọc × 24px ngang** (`py-16 px-6`) |
| **Icon wrapper** | **size** | **48 × 48px** (`size-12`) |
| | margin-bottom | **16px** |
| | màu | theo variant (bảng trên) |
| | icon bên trong | `size-full` (chiếm trọn 48px) |
| **Title** | thẻ | `<h3>` |
| | font-size | **14px** (`text-sm`) |
| | font-weight | **600** |
| | màu | `--foreground` |
| | margin-bottom | **6px** (`mb-1.5`) |
| **Description** | render | **optional** — chỉ hiện khi có |
| | font-size | **14px** (`text-sm`) |
| | màu | `--muted-foreground` |
| | **max-width** | **320px** (`max-w-xs`) |
| | margin-bottom | **20px** (`mb-5`) |
| **Button** | render | optional về mặt code, nhưng **rule 1597 nói bắt buộc** |
| | size | mặc định `md` = **cao 36px** |
| | variant | theo bảng trên |

### Copy mẫu đầy đủ (dòng 1646–1670)

| Variant | Title | Description | Nhãn nút |
|---|---|---|---|
| **first-run** | "Chưa có agent nào" | "Tuyển agent đầu tiên trong 30 giây. Không phỏng vấn." | **"Tuyển agent →"** (có mũi tên) |
| **no-data** | "Không tìm thấy kết quả" | `Không có SKU nào khớp với "${query}"` (nội suy query của user) | "Xóa bộ lọc" |
| **error** | "Không tải được dữ liệu" | "Có lỗi kết nối. Thử tải lại hoặc liên hệ team nếu vẫn lỗi." | "Tải lại" |

### Quy tắc microcopy bổ sung (Section 5.2, dòng 2419–2426)

```
✅ "Chưa có agent nào. Tuyển agent đầu tiên trong 30 giây."
❌ "Không có dữ liệu"

✅ "Không tìm thấy SKU khớp với "abc". Thử tìm tên sản phẩm hoặc xóa bộ lọc."
❌ "Không có kết quả"

✅ "Agent Sales Bot đã hoàn thành 42 task hôm nay."
❌ "Agent đang hoạt động tích cực với hiệu suất cao"
```
**Mẫu hình rút ra:** câu ✅ luôn chứa **số cụ thể** hoặc **hành động tiếp theo**; câu ❌ là mô tả trừu tượng, không actionable.

### 4 trạng thái

Đây là pattern **duy nhất trong Section 3 phủ cả 3 trạng thái non-happy** trong một component. Dùng nó làm chuẩn cho các pattern đang thiếu.

---

## 3.3 LOADING STATE (dòng 1675–1744)

### Mục đích

**Use case (1677):** placeholder khi data đang fetch — tránh layout shift, tránh spinner toàn page.
**Anti-pattern (1678):** **`<Spinner>` toàn page làm loading state cho data — "đây là anti-pattern #4, không bao giờ dùng"**. ⚠️ trong Section 7 của chính tài liệu, spinner-toàn-page là **#7** (dòng 2720) — cross-reference gãy.

### DECISION TREE — 6 case (dòng 1683–1690)

| Tình huống | Component | Chi tiết |
|---|---|---|
| **First load** của page/section | **Skeleton** | Shape match final UI |
| **Background refetch** (data cũ vẫn hiển thị) | **Dim data 40%** + subtle spinner | Spinner đặt ở **header, bên phải** |
| **Mutation đang chạy** | **Button loading state** | Spinner trong button (xem 2.1) |
| **Long-running agent task (> 5s)** | **Progress bar + estimated time** | ⚠️ component này **không được đặc tả ở đâu** |
| **Load nhanh < 200ms** | **KHÔNG hiển thị gì** | Tránh flash |
| **Infinite scroll trang tiếp** | **Skeleton rows ở cuối list** | — |

⚠️ **"Dim 40%" mơ hồ:** `opacity: 0.4` hay giảm đi 40% (còn 0.6)? Mục 2.9 (dòng 1269) nói cùng case này nhưng **không có con số**.

### SKELETON RULES — 4 quy tắc bắt buộc (dòng 1695–1698)

1. **Shape skeleton PHẢI giống final UI** — không dùng generic grey block.
2. **Chiều rộng skeleton phải vary**, không được 100% đều nhau — lý do: *"real text không đều"*.
3. **Animation:** `animate-pulse` **hoặc** shimmer **`1.4s infinite linear`**.
4. **Không để skeleton chạy > 3s mà không có fallback error state** → tức là phải có timeout chuyển sang EmptyState variant `error`.

### Skeleton base (từ 2.9, dòng 1241)

| Thuộc tính | Giá trị |
|---|---|
| Animation | `animate-pulse` |
| **Radius** | **`--radius-sm` = 6px** |
| **Nền** | **`--muted`** |

### DASHBOARD SKELETON — hình dạng từng khối, kích thước, số lượng (dòng 1702–1740)

```
Outer wrapper
  · gap dọc giữa khối: 24px  (space-y-6)
  · padding: 24px            (p-6)

╔═ KHỐI 1 — KPI grid skeleton ══════════════════════════════════╗
║ Grid: grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 · gap 16px    ║
║ SỐ LƯỢNG: 4 card                                              ║
║ Mỗi card dùng <Card> THẬT (border + radius + nền), không phải ║
║ block xám → giữ nguyên khung, chỉ nội dung là skeleton        ║
║                                                                ║
║   CardHeader → hàng flex justify-between:                     ║
║     • label : h-3  w-16              → 12 × 64px  (chữ nhật)  ║
║     • icon  : size-4 rounded-full    → 16 × 16px  (TRÒN)      ║
║                                                                ║
║   CardContent:                                                ║
║     • value : h-8  w-[60%]  mb-1     → 32px cao, 60% rộng     ║
║     • delta : h-4  w-[40%]  mt-3     → 16px cao, 40% rộng     ║
╚════════════════════════════════════════════════════════════════╝

╔═ KHỐI 2 — Charts row skeleton ════════════════════════════════╗
║ Grid: grid-cols-3 · gap 16px    ← CỐ ĐỊNH 3 CỘT, KHÔNG        ║
║                                    RESPONSIVE (⚠ vỡ mobile)   ║
║ SỐ LƯỢNG: 2 card                                              ║
║                                                                ║
║ Card A — col-span-2 (chiếm 2/3), CardContent padding-top 20px:║
║     • title    : h-4 w-32 mb-1    → 16 × 128px                ║
║     • subtitle : h-3 w-24 mb-4    → 12 × 96px                 ║
║     • thân     : h-[320px] w-full → 320px cao, full rộng      ║
║                                     ← CHIỀU CAO CHART CHUẨN   ║
║                                                                ║
║ Card B — 1 cột (chiếm 1/3), CardContent padding-top 20px:     ║
║     • title    : h-4 w-28 mb-4    → 16 × 112px                ║
║     • thân     : h-[320px] w-full rounded-full                ║
║                                   → DONUT: bo TRÒN HOÀN TOÀN  ║
╚════════════════════════════════════════════════════════════════╝
```

### Số liệu rút ra dùng được cho layout THẬT

| Hằng số | Giá trị | Nguồn |
|---|---|---|
| Chiều cao vùng chart chuẩn | **320px** | 1728, 1734 |
| Tỉ lệ hàng chart chính | **2/3 + 1/3** (`col-span-2` trong `grid-cols-3`) | 1723–1724 |
| Gap grid chuẩn | **16px** | 1706, 1723 |
| Gap dọc giữa khối | **24px** | 1704 |
| Padding page | **24px** | 1704 |
| Skeleton chart donut | `border-radius: 9999px` | 1734 |

### ⚠️ Bộ số skeleton KPI mâu thuẫn giữa 2.9 và 3.3

| Phần tử | **2.9** (dòng 1259–1260) | **3.3** (dòng 1716–1717) |
|---|---|---|
| KPI value | `h-8 w-40` (32 × **160px** cố định) | `h-8 w-[60%]` (32px × **60%**) |
| Delta | `h-4 w-24` (16 × **96px** cố định) | `h-4 w-[40%]` (16px × **40%**) |

Phải chốt một bộ. Bộ `%` của 3.3 phù hợp rule "chiều rộng phải vary" hơn nếu áp theo card.

### ⚠️ Thiếu

- Grid `grid-cols-3` của hàng chart **không có breakpoint** → trên mobile vẫn 3 cột và vỡ.
- Không có skeleton cho: Table, List, Filter Bar, Agent Workspace, Kanban, Settings.
- Không có spec cho "Progress bar + estimated time".
- Không có spec cho "subtle spinner ở header right" (size? màu? vị trí chính xác?).

---

## 3.4 FORM LAYOUT (dòng 1745–1854)

### Mục đích

**Use case (1747):** thu thập input từ user — create agent, invite member, configure settings.
**Anti-pattern (1748):** **không đặt label bên phải hoặc trong field (placeholder-only)** — lý do nêu rõ: *"UX VN quen label trên field"*.

### QUY TẮC LABEL (dòng 1752–1763)

**Luôn dùng label trên, không dùng inline placeholder làm label.**

```
✅ ĐÚNG
   [Label]        "Tên agent"
   [Input]        placeholder="Ví dụ: Sales Assistant"   ← placeholder là VÍ DỤ
   [Helper]       "Tên này sẽ hiển thị trong Inbox và báo cáo."

❌ SAI
   [Input]        placeholder="Tên agent"    ← khi user nhập xong thì MẤT label
```

### FORM FIELD ANATOMY — 4 tầng (dòng 1769–1772)

| Tầng | Font-size | Font-weight | Màu (token) | Ghi chú |
|---|---|---|---|---|
| **Label** | **14px** | **500** | `--foreground` | Có `htmlFor` trỏ tới id input |
| **Input / Select** | 14px | 400 | `--foreground` | **height 36px**, đầy đủ border, có focus ring |
| **Helper text** | **12px** | 400 | `--muted-foreground` | **optional, nhưng LUÔN VISIBLE khi có** |
| **Error message** | **12px** | 400 | **`--destructive-fg`** | **THAY THẾ helper text khi có lỗi** (không hiện cả hai) |

**Dấu bắt buộc (dòng 1781):** `<span>` màu **`--destructive`** chứa `*`, đặt **sau** text label.

### SINGLE COLUMN — layout mặc định (dòng 1778–1805)

| Phần | Thuộc tính | Giá trị |
|---|---|---|
| **`<form>`** | layout | `flex` · `flex-direction: column` |
| | **gap giữa các field** | **20px** (`gap-5`) |
| | **max-width** | **448px** (`max-w-md`) |
| **Field group** | layout | `flex` · `flex-direction: column` |
| | **gap trong field** | **6px** (`gap-1.5`) |
| **Hàng action** | layout | `flex` · `justify-content: flex-end` |
| | **gap** | **8px** |
| | **padding-top** | **8px** (`pt-2`) |
| **Thứ tự nút** | | **"Hủy"** (variant `outline`, `type="button"`) → **submit** (variant `primary`, có prop `loading`) |

Copy mẫu: nút submit "Tạo agent"; helper "Ảnh hưởng đến tốc độ và chi phí." (1798).

### MULTI-STEP FORM (dòng 1808–1839)

**Điều kiện dùng (dòng 1811):** form **> 5 fields** HOẶC có **logic phân nhánh**.

**Vị trí:** Step indicator đặt **TRÊN** form body, wrapper `margin-bottom: 24px` (`mb-6`).
**Hàng steps:** `flex` · `align-items: center` · **`gap: 0`** (khoảng cách tạo bằng connector).

| Phần tử | Thuộc tính | Giá trị |
|---|---|---|
| **Circle** | size | **32 × 32px** (`size-8`) |
| | radius | **`9999px`** (tròn) |
| | layout | `flex center` |
| | font-size | **14px** |
| | font-weight | **600** |
| **Circle — ĐÃ QUA** (`i < current`) | nền / chữ | **`--primary`** / `--primary-foreground` |
| | nội dung | **`✓`** |
| **Circle — HIỆN TẠI** (`i === current`) | nền / chữ | `--primary` / `--primary-foreground` |
| | **thêm** | **`ring: 2px --ring`** với **`ring-offset: 2px`** |
| | nội dung | số `i+1` |
| **Circle — CHƯA TỚI** (`i > current`) | nền / chữ | **`--muted`** / **`--muted-foreground`** |
| | nội dung | số `i+1` |
| **Nhãn step** | font-size | **10px** |
| | màu | `--muted-foreground` |
| | white-space | `nowrap` |
| | vị trí | dưới circle, **gap 4px** (`gap-1`), xếp dọc |
| **Connector** | width | `flex: 1` |
| | **height** | **1px** |
| | margin-X | **8px** |
| | **margin-bottom** | **16px** (bù phần nhãn để căn với TÂM circle) |
| | nền | **`--primary`** nếu đã qua · **`--border`** nếu chưa |
| | render | chỉ giữa các step, không có sau step cuối |

### ERROR SCROLL RULE — hành vi bắt buộc (dòng 1845–1850)

Khi submit form có lỗi, thực hiện đúng 3 bước:

1. Lấy **field lỗi đầu tiên** (`Object.keys(errors)[0]`).
2. `scrollIntoView({ behavior: 'smooth', block: 'center' })` — cuộn **mượt**, đưa field vào **giữa** viewport.
3. `.focus()` vào chính field đó.

Kèm quy tắc từ 2.7 (dòng 1137): **form validation KHÔNG dùng toast**, phải inline error.
Copy error chung (Section 5.3, dòng 2439): `validation.required` → *"Vui lòng điền đầy đủ thông tin bắt buộc."*

### 4 trạng thái

| Trạng thái | Có/Không | Đặc tả |
|---|---|---|
| **Có dữ liệu / đang nhập** | ✅ | Đầy đủ |
| **Loading (submit)** | ✅ | Nút submit dùng `loading` state (dòng 1803) — xem Button 2.1 |
| **Error (validation)** | ✅ | Đầy đủ: inline error + border đỏ + scroll + focus |
| **Loading (nạp dữ liệu ban đầu cho form edit)** | ❌ **KHÔNG CÓ** | Không có skeleton form |
| **Empty** | — | Không áp dụng |

---

## 3.5 FILTER BAR (dòng 1855–1933)

### Mục đích / dùng ở đâu

**Use case (1857):** narrow down data trong list/table — search + filter chips + sort + view toggle.
**Anti-pattern (1858):** **không đặt filter bar dưới table header** — user phải scroll xuống mới thấy. **Filter bar LUÔN nằm trên table.**

### ANATOMY (dòng 1863)

```
[Search input]  [Filter chips...]  [Nút "Lọc"]  ←flex-1 spacer→  [Sort dropdown]  [View toggle]  [Export button]
```

### Thông số đo được — từng thành phần (dòng 1870–1928)

| Thành phần | Thuộc tính | Giá trị |
|---|---|---|
| **Container** | layout | `flex` · `align-items: center` |
| | **gap** | **8px** |
| | wrap | **`flex-wrap`** (cho phép xuống dòng) |
| | **padding** | **20px ngang × 16px dọc** (`px-5 py-4`) |
| | viền | **`border-bottom: 1px --border`** |
| **Search wrapper** | position | `relative` |
| **Search icon** | position | `absolute; left: 10px; top: 50%; transform: translateY(-50%)` |
| | size | **16px** |
| | màu | `--muted-foreground` |
| **Search input** | **padding-left** | **32px** (`pl-8`) — chừa chỗ cho icon |
| | **width** | **220px** |
| | height | **36px** (kế thừa Input) |
| | placeholder | "Tìm SKU hoặc tên..." |
| **Filter chip** | **height** | **28px** (`h-7`) |
| | **padding** | **left 10px / right 6px** (`pl-2.5 pr-1.5`) — lệch vì có nút X bên phải |
| | radius | **`--radius-full`** (pill) |
| | border | **1px `--border`** |
| | nền | `--background` |
| | font-size | **12px** |
| | font-weight | **500** |
| | màu chữ | `--foreground` |
| | **hover** | nền → **`--accent`** |
| | transition | `colors` |
| | gap trong | **6px** |
| **Icon X trên chip** | size | **12px** (`size-3`) |
| | màu | `--muted-foreground` |
| | hành vi | click để gỡ filter đó |
| **Nút "Lọc"** | | Button variant **`outline`** size **`sm`** (cao **30px**) |
| | icon | `SlidersHorizontal` **14px** (`size-3.5`) |
| **Spacer** | | `flex: 1` — đẩy nhóm phải sang cạnh phải |
| **Sort Select** | **height** | **32px** (`h-8`) |
| | **width** | **160px** |
| | font-size | **12px** (`text-xs`) |
| | options mẫu | "GMV cao nhất" / "GMV thấp nhất" / "Đơn nhiều nhất" |
| **View toggle group** | layout | `flex` · `align-items: center` |
| | radius | **`--radius-md` = 8px** |
| | border | **1px `--border`** |
| | **overflow** | **`hidden`** (bo góc nút con theo group) |
| **View toggle — mỗi nút** | padding | **8px** (`p-2`) |
| | icon | **16px** |
| | **active** | nền **`--accent`** |
| | inactive | nền `--background`, **hover** → `--accent` |
| | transition | `colors` |
| **View toggle — nút thứ 2+** | | thêm **`border-left: 1px --border`** |
| **A11y view toggle** | | **BẮT BUỘC `aria-label`** — "Table view" / "Grid view" |

### ⚠️ VẤN ĐỀ: 4 chiều cao control khác nhau trong CÙNG một hàng

| Control | Height |
|---|---|
| Search Input | **36px** |
| Sort Select | **32px** |
| Button "Lọc" (size `sm`) | **30px** |
| Filter chip | **28px** |

Tài liệu **không giải thích** vì sao và **không nói phải căn theo center hay baseline**. Container dùng `align-items: center` nên sẽ căn giữa, nhưng hàng sẽ trông "răng cưa". **Phải chốt trước khi làm** — hoặc chuẩn hoá về 32px cho mọi control trong filter bar.

### 4 trạng thái

| Trạng thái | Có/Không | Đặc tả |
|---|---|---|
| **Có filter đang áp dụng** | ✅ | Chips hiển thị, mỗi chip có nút X gỡ |
| **Không có filter nào** | ⚠️ suy ra được | Mảng `activeFilters` rỗng → không render chip. Không nói rõ |
| **Loading (đang lọc)** | ❌ **KHÔNG CÓ** | Không nói search có debounce không, có spinner trong input không, có disable control khi đang fetch không |
| **Kết quả rỗng sau lọc** | ✅ gián tiếp | Chuyển sang EmptyState variant **`no-data`** với CTA "Xóa bộ lọc" (3.2, dòng 1655–1661) |
| **Error** | ❌ **KHÔNG CÓ** | — |

---

## 3.6 DATA TABLE TOOLBAR (dòng 1934–2003)

### Mục đích

**Use case (1936):** actions áp dụng cho toàn table hoặc rows đã chọn — export, bulk action, pagination.
**Anti-pattern (1937):** **không đặt Export button trong filter bar** — export là **global action**, phải đặt ở toolbar riêng hoặc page header.

### A. TOOLBAR GLOBAL — trên table (dòng 1939–1943)

```
[Table title]  [Row count]  ←flex-1 spacer→  [Export]  [Column toggle]
```

⚠️ **CHỈ CÓ SƠ ĐỒ ASCII NÀY. KHÔNG có code, KHÔNG có số đo.**

Thiếu hoàn toàn: chiều cao toolbar, padding, border, nền, font-size/weight của title, font của row count, style của "Column toggle" (là button? dropdown? popover? icon gì?), khoảng cách giữa title và row count.

**→ Đây là lỗ hổng đặc tả rõ ràng nhất trong Section 3. Phải tự thiết kế.**
Gợi ý suy diễn: dùng cùng thông số Filter Bar (`px-5 py-4`, `border-bottom 1px --border`) cho nhất quán.

### B. BULK ACTION BAR (dòng 1945–1971)

**Điều kiện hiện:** `selectedRows.length > 0`. **Ẩn hoàn toàn** khi không chọn gì.

```
[X rows đã chọn]  [Action 1]  [Action 2]  ←flex-1 spacer→  [Bỏ chọn tất cả]
```

| Phần | Thuộc tính | Giá trị |
|---|---|---|
| **Container** | layout | `flex` · `align-items: center` |
| | **gap** | **8px** |
| | **padding** | **20px ngang × 10px dọc** (`px-5 py-2.5`) |
| | **nền** | **`--primary-mist`** — nền indigo nhạt, signal "đang ở chế độ chọn" |
| | viền | **`border-bottom: 1px --border`** |
| **Nhãn đếm** | font-size | **14px** |
| | font-weight | **500** |
| | màu | `--foreground` |
| | copy mẫu | **"{n} SKU đã chọn"** — dùng **danh từ domain**, không phải "items". Tiếng Việt không có số nhiều (5.4 dòng 2492) |
| **Action thường** | | Button variant **`outline`** size **`sm`** |
| | icon | **14px** (`size-3.5`) |
| | mẫu | "Xuất Excel" + icon `Download` |
| **Action destructive** | | Button variant **`outline`** size `sm` **+ override**: |
| | màu chữ | **`--destructive-fg`** |
| | border | **`--destructive-bg`** |
| | hover | nền → **`--destructive-bg`** |
| | quy tắc | **KHÔNG dùng variant `destructive` solid** — giữ trọng lượng thị giác thấp trong toolbar |
| | mẫu | "Xóa" + icon `Trash2` |
| **Spacer** | | `flex: 1` |
| **Nút cuối** | | Button variant **`ghost`** size **`sm`** — nhãn **"Bỏ chọn tất cả"** |

**Token `--primary-mist`** (dòng 157, 427): light = `oklch(96% 0.03 285)`, dark = `oklch(28% 0.08 277)`.

### C. PAGINATION — dưới table (dòng 1974–1999)

| Phần | Thuộc tính | Giá trị |
|---|---|---|
| **Container** | layout | `flex` · `align-items: center` · `justify-content: space-between` |
| | **padding** | **20px ngang × 12px dọc** (`px-5 py-3`) |
| | viền | **`border-top: 1px --border`** |
| | font-size | **12px** |
| | màu | `--muted-foreground` |
| **Bên trái** | copy | **"Hiển thị {from}–{to} trên {total} SKU"** — dùng gạch ngang en-dash `–`, danh từ domain |
| **Bên phải** | layout | `flex` · `align-items: center` · **gap 4px** |
| **Nút prev/next** | | Button variant **`outline`** size **`icon`**, override **28×28px** (`size-7`) |
| | icon | `ChevronLeft`/`ChevronRight` **16px** |
| | disabled | **khi ở trang đầu / trang cuối** |
| **Nút số trang — hiện tại** | variant | **`secondary`** |
| **Nút số trang — khác** | variant | **`outline`** |
| **Nút số trang — chung** | size | `sm` + override **28×28px**, **`padding: 0`**, font **12px** |

### ⚠️ Thiếu

- **Ellipsis khi nhiều trang** (`1 … 5 6 7 … 20`) — không có spec.
- **Page-size selector** — không có.
- Hành vi khi chỉ có **1 trang** — không nói (ẩn pagination? disable cả hai?).
- **Checkbox column** trong table để chọn rows — Section 2.6 không có, Section 3.6 giả định đã có.
- **Select-all** ở header — không có spec.

### 4 trạng thái

| Trạng thái | Có/Không | Đặc tả |
|---|---|---|
| **Có dữ liệu, không chọn gì** | ⚠️ | Chỉ có sơ đồ toolbar global, **thiếu toàn bộ số đo** |
| **Có dữ liệu, đã chọn rows** | ✅ | Bulk bar đầy đủ số đo |
| **Loading** | ❌ **KHÔNG CÓ** | Không nói pagination có disable khi đang fetch không |
| **Empty** | ✅ gián tiếp | Qua EmptyState 3.2 |
| **Error** | ✅ gián tiếp | Qua EmptyState 3.2 |

---

## 3.7 AGENT PRESENCE INDICATORS (dòng 2004–2074)

### Mục đích / dùng ở đâu

**Use case (2006):** trạng thái realtime của AI agent — hiển thị ở **sidebar, card, và list**.
**Anti-pattern (2007):** **không chỉ dùng màu để signal trạng thái** — phải kèm text label hoặc icon cho a11y. *(WCAG: màu không được là kênh thông tin duy nhất.)*

Dùng ở: sidebar nav, card header, table cell (dòng 2021).

### 4 STATES (dòng 2011–2016, 2027–2039)

| State key | **Color token** | Visual | **Label tiếng Việt** |
|---|---|---|---|
| **`online`** | `--agent-dot-online` (xanh lá) | Static dot | **"Chờ việc"** |
| **`running`** | `--agent-dot-running` (amber) | **Pulse dot + animation** | **"Đang chạy"** |
| **`idle`** | **`--agent-dot-offline`** (xám) | Static dot, muted | **"Ngoại tuyến"** |
| **`error`** | `--agent-dot-error` (đỏ) | Static dot, destructive | **"Lỗi"** |

### ⚠️ XUNG ĐỘT VỚI SECTION 2.5 — phải chốt trước khi code

| Key | Nhãn ở **2.5** (dòng 1048–1053) | Nhãn ở **3.7** (dòng 2013–2016) |
|---|---|---|
| `online` | "online" | **"Chờ việc"** |
| `running` | "đang chạy" | "Đang chạy" |
| `idle` | **"chờ việc"** (đang rảnh, còn sống) | **"Ngoại tuyến"** (offline, dùng `--agent-dot-offline`) |
| `error` | "lỗi" | "Lỗi" |

Cùng key `idle` mang **hai nghĩa trái ngược** và **hai màu khác nhau**.
**Khuyến nghị: dùng bộ của 3.7** (có nhãn tiếng Việt đầy đủ + mapping màu rõ ràng), sửa 2.5 theo.

### AgentDot component — thông số (dòng 2041–2051)

| Thuộc tính | Giá trị |
|---|---|
| **Size `sm`** | **8px** (`size-2`) |
| **Size `md`** *(default)* | **12px** (`size-3`) |
| Shape | `border-radius: 9999px`, `display: inline-block`, `flex-shrink: 0` |
| Màu | `background: var(--agent-dot-{...})` theo map trên |
| **Animation khi `running`** | **`pulse 2s ease-in-out infinite`** |
| **A11y bắt buộc** | **`role="status"`** + **`aria-label={label tiếng Việt}`** |

**Keyframes `pulse`** (dòng 599):
```
0%, 100% { opacity: 1;    transform: scale(1)    }
50%      { opacity: 0.6;  transform: scale(1.15) }
```

**Ghi chú motion (dòng 607):** *"online = static success dot · running = amber pulse 2s infinite · done = checkIn 400ms spring · error = shake 300ms"*
⚠️ Hai animation **`checkIn`** và **`shake`** được nhắc nhưng **keyframes KHÔNG được định nghĩa ở đâu** (chỉ có `dropdownIn`, `dialogIn`, `pulse` ở dòng 597–599). Cũng lưu ý `done` không phải một trong 4 state của 3.7.

**Quy tắc `prefers-reduced-motion` (dòng 602–604):** khi bật, mọi animation rút về `0.01ms` → pulse dot sẽ đứng yên. **Phải có kênh thông tin thứ hai** (label/icon) đúng như anti-pattern 2007 yêu cầu.

### Token màu dot (dòng 617–620 light / 626–629 dark)

| Token | Light | Dark |
|---|---|---|
| `--agent-dot-online` | `oklch(50.8% .118 165.612)` | `oklch(80% .14 165)` |
| `--agent-dot-running` | `oklch(66.6% .179 58.318)` | `oklch(80% .15 70)` |
| `--agent-dot-error` | `oklch(57.7% .245 27.325)` | `oklch(70.4% .191 22.216)` |
| `--agent-dot-offline` | `oklch(60% .02 285)` | `oklch(55% .02 285)` |

### INLINE PRESENCE ROW — dùng ở sidebar / list (dòng 2054–2070)

| Phần | Thuộc tính | Giá trị |
|---|---|---|
| **Row** | layout | `flex` · `align-items: center` |
| | **gap** | **8px** |
| | **padding** | **12px ngang × 8px dọc** (`px-3 py-2`) |
| | radius | **`--radius-sm` = 6px** |
| | **hover** | nền → **`--sidebar-accent`** ⚠️ *không phải `--accent`* |
| **Avatar mini** | size | **24px** (`size-6`) |
| | radius | `rounded` (mặc định, không nêu token) |
| | font | **10px** weight **700**, màu **trắng** |
| | nền | `--primary` |
| | nội dung | initials, ví dụ "CC" |
| **Dot chồng lên** | position | `absolute; bottom: -2px; right: -2px` |
| | size | **`sm`** = **8px** |
| | **ring** | **1px `--sidebar`** ⚠️ (avatar AI ở 2.5 dùng ring **2px `--card`**) |
| **Tên agent** | font-size | **14px** |
| | flex | `flex: 1` |
| | overflow | **`truncate`** (cắt bằng ellipsis) |
| **Chỉ khi `running`** | | hiện thêm text **`{taskCount} task`** |
| | font-size | **10px** |
| | màu | `--muted-foreground` |
| | numeric | **`tabular-nums`** |

**Lưu ý ring:** độ dày ring của dot thay đổi theo nền đặt lên — `ring-1 ring-[--sidebar]` khi trên sidebar, `ring-2 ring-[--card]` khi trên card (2.5 dòng 1041).

⚠️ Dòng 2064 truyền prop `className` cho `AgentDot` nhưng component (2041) **không nhận prop này** — lỗi trong code mẫu; đồng nghĩa việc định vị absolute + ring của dot trong inline row **chưa được đặc tả đúng**.

### Token sidebar liên quan (dòng 293–302)

| Token | Light | Dark |
|---|---|---|
| `--sidebar` | `oklch(98% .01 285)` | `oklch(14% .02 285)` |
| `--sidebar-fg` | `oklch(15% .02 285)` | `oklch(95% .02 285)` |
| `--sidebar-border` | `oklch(90% .02 285)` | `oklch(25% .02 285)` |
| `--sidebar-accent` | `oklch(96% .02 285)` | `oklch(22% .02 285)` |

### 4 trạng thái

| Trạng thái | Có/Không | Đặc tả |
|---|---|---|
| **Có dữ liệu** | ✅ | Đầy đủ 4 state của agent |
| **Loading** | ❌ **KHÔNG CÓ** | Không nói khi chưa biết status thì render dot gì (dot xám? skeleton? ẩn?) |
| **Empty** | ❌ **KHÔNG CÓ** | Danh sách agent rỗng → phải mượn EmptyState `first-run` ("Chưa có agent nào") |
| **Error kết nối realtime** | ❌ **KHÔNG CÓ** | `error` là trạng thái **của agent**, không phải của kết nối WS/polling |

---

## 3.8 MODAL vs SHEET vs INLINE — DECISION TREE (dòng 2075–2113)

### Mục đích

**Use case (2077):** chọn đúng container cho action/content overlay.
**Anti-pattern (2078):** **không mặc định dùng Modal cho mọi thứ** — Sheet và Inline thường tốt hơn cho detail + edit.

### CÂY QUYẾT ĐỊNH — 6 nhánh, theo thứ tự ưu tiên (dòng 2080–2101)

```
Bắt đầu
  │
  ├─ 1. Có cần user confirm trước khi action? (destructive, payment, send email)
  │       └─ YES → Dialog (modal, 420px max-width)
  │
  ├─ 2. Content phức tạp cần nhiều fields (> 4)?
  │       └─ YES → Sheet (right side, 480px)
  │
  ├─ 3. Là detail view của 1 record?
  │       ├─ URL change OK?      → Navigate to new page   ← "best UX", ưu tiên cao nhất
  │       └─ URL change không?   → Sheet (right side, 480px)
  │
  ├─ 4. Là quick edit 1–2 fields?
  │       └─ YES → Inline edit hoặc Popover (KHÔNG mở overlay)
  │
  ├─ 5. Chỉ cần xem thêm thông tin?
  │       └─ YES → Tooltip (< 80 ký tự) hoặc Popover (> 80 ký tự, có structure)
  │
  └─ 6. Cần user focus hoàn toàn (no background)?
          └─ YES → Dialog với overlay backdrop
```

**Ngưỡng định lượng rút ra:**
- **> 4 fields** → Sheet (không dùng Dialog)
- **> 5 fields** → Multi-step form (từ 3.4, dòng 1811)
- **< 80 ký tự** → Tooltip · **> 80 ký tự** → Popover
- **1–2 fields** → Inline edit / Popover, **không mở overlay**

### KÍCH THƯỚC CHUẨN (dòng 2103–2110)

| Container | **Width** | **Max-height** | Khi dùng |
|---|---|---|---|
| **Dialog** | **425px** (`max-w-[425px]`) | **85vh** | Confirm, alert, short form |
| **Dialog lg** | **600px** | **85vh** | Medium form, detail trong modal |
| **Sheet right** | **480px** | **100vh** | Detail panel, settings, bulk edit |
| **Sheet bottom** | `height: auto` | **85vh** | Mobile-specific, filter panel |

⚠️ Nhánh 1 của cây ghi **420px**, bảng và code (dòng 1327) ghi **425px**. **Chốt 425px.**
⚠️ **Không có breakpoint nào** cho Sheet 480px → trên màn < 480px sẽ tràn. "Sheet bottom" là lối thoát mobile duy nhất được nhắc, nhưng chỉ có 1 dòng spec.

### Quy tắc hành vi destructive (tổng hợp từ 2.11, 3.8, anti-pattern #9)

| Loại action | Xử lý | Nguồn |
|---|---|---|
| Destructive **irreversible** (delete vĩnh viễn, payment, gửi email) | **BẮT BUỘC confirm Dialog** với nút nói rõ hậu quả ("Xóa vĩnh viễn") | 1313, 2083–2084 |
| Destructive **reversible** (archive, ẩn, gỡ khỏi list) | **CẤM confirm dialog** → optimistic update + **Undo toast 5s**, nhãn "Hoàn lại" | 2746–2767, 1152–1158 |

Lý do nêu ở dòng 2767: *"Mỗi confirm dialog thêm 1–2 click, nhân lên 100 actions/ngày = friction lớn."*

### A11y overlay (dòng 2566)

Modal/Dialog **phải trap focus khi mở** và **trả focus về trigger khi đóng**.
`Esc` đóng modal/palette/dropdown (dòng 2576).

---

## 4. CHECKLIST TỰ VERIFY CỦA TÀI LIỆU — SECTION 3 (dòng 2114–2126)

Tài liệu tự tuyên bố đã hoàn thành:
- KPI grid: 3 layout configs documented, hierarchy rules rõ
- Empty state: 3 variants + "3 yếu tố bắt buộc" rule
- Loading: decision tree 5 cases, không có spinner toàn page *(thực tế là 6 case)*
- Form: label-on-top rule, multi-step pattern, error scroll rule
- Filter bar: anatomy documented, search + chips + sort + view toggle
- Table toolbar: bulk action bar, pagination pattern *(⚠️ toolbar global KHÔNG có số đo)*
- Agent presence: 4 states + color + label (không chỉ màu)
- Modal decision tree: 6 branches, kích thước chuẩn
- Không có Lorem Ipsum — copy thật tiếng Việt
- Không có câu "leverage", "tận dụng", "đột phá"

---

## 5. TỔNG HỢP LỖ HỔNG & MÂU THUẪN TRONG SECTION 3 — CHECKLIST TRƯỚC KHI CODE

### A. Mâu thuẫn phải chọn một

| # | Vấn đề | Dòng | Ghi chú |
|---|---|---|---|
| A1 | Nhãn/màu state `idle` & `online` khác nhau giữa 2.5 và 3.7 | 1048–1053 vs 2013–2016 | **Dùng bộ 3.7** |
| A2 | Skeleton KPI: `w-40`/`w-24` (2.9) vs `w-[60%]`/`w-[40%]` (3.3) | 1259–1260 vs 1716–1717 | Chọn 1 |
| A3 | "Dim data cũ" (2.9) vs "Dim data 40%" (3.3) — và 40% là opacity 0.4 hay 0.6? | 1269 vs 1686 | Chốt con số + ngữ nghĩa |
| A4 | Dialog width 420px (cây 3.8) vs 425px (bảng + code 2.11) | 2084 vs 2107, 1327 | **Chốt 425px** |
| A5 | "Hero + 3" grid dùng `col-span-1` — vô nghĩa toán học | 1521 | Thiết kế lại |
| A6 | 4 chiều cao control khác nhau trong Filter Bar (36/32/30/28px) | 1874–1912 | Chuẩn hoá |
| A7 | Cross-reference gãy: 3.3 dẫn "anti-pattern #4" nhưng spinner là #7 | 1678 vs 2720 | Sửa số |

### B. Thiếu đặc tả — phải tự thiết kế

| # | Vấn đề | Dòng |
|---|---|---|
| B1 | **Toolbar global của table chỉ có sơ đồ ASCII** — không số đo, không style Column toggle | 1939–1943 |
| B2 | **Progress bar + estimated time** được nhắc nhưng không đặc tả | 1688 |
| B3 | **"Subtle spinner ở header right"** không có size/màu/vị trí | 1686 |
| B4 | Skeleton chỉ có cho Dashboard — **thiếu skeleton cho Table, List, Filter Bar, Form, Kanban, Settings** | 1702–1740 |
| B5 | Hàng chart skeleton dùng `grid-cols-3` **không responsive** → vỡ mobile | 1723 |
| B6 | **Checkbox column + select-all** trong table không có spec (nhưng 3.6 giả định đã có) | — |
| B7 | **Pagination ellipsis, page-size selector, trường hợp 1 trang** không có | 1974–1999 |
| B8 | **Keyframes `checkIn` và `shake`** được nhắc nhưng không định nghĩa | 607 vs 597–599 |
| B9 | `AgentDot` không nhận prop `className` nhưng inline row truyền vào → định vị dot chưa đặc tả đúng | 2064 vs 2041 |
| B10 | **Sheet 480px không có breakpoint** — tràn trên màn nhỏ; "Sheet bottom" chỉ 1 dòng spec | 2109–2110 |
| B11 | **Toàn Section 3 không có spec responsive** ngoài 3.1 — mọi số đo là desktop | — |
| B12 | Loading state cho form edit (nạp dữ liệu ban đầu) không có | — |
| B13 | Filter Bar: không nói search có debounce không, có disable control khi fetch không | — |

### C. Hằng số layout rút ra từ Section 3 (dùng cho token layout)

| Hằng số | Giá trị | Nguồn |
|---|---|---|
| Gap grid chuẩn | **16px** | 1519, 1706 |
| Gap dọc giữa khối | **24px** | 1704 |
| Padding page | **24px** | 1704 |
| Chiều cao vùng chart | **320px** | 1728, 1734 |
| Tỉ lệ hàng chart chính | **2/3 + 1/3** | 1723–1724 |
| Form max-width | **448px** | 1778 |
| Gap giữa các field form | **20px** | 1778 |
| Gap trong 1 field | **6px** | 1779 |
| Empty state padding | **64px dọc × 24px ngang** | 1621 |
| Empty state icon | **48px** | 1622 |
| Empty state description max-width | **320px** | 1629 |
| Filter bar padding | **20px × 16px** | 1870 |
| Bulk bar padding | **20px × 10px** | 1954 |
| Pagination padding | **20px × 12px** | 1978 |
| Nút pagination | **28×28px** | 1981, 1989 |
| Filter chip height | **28px** | 1886 |
| Step circle | **32px** | 1821 |
| Dialog / Dialog lg / Sheet | **425 / 600 / 480px** | 2107–2109 |
| Overlay max-height | **85vh** | 2107–2110 |

### D. Lưu ý chuyển đổi sang Vuetify

- **Breakpoint Tailwind vs Vuetify khác nhau:** tài liệu dùng `sm` = **640px**, `lg` = **1024px**. Vuetify mặc định `sm` = 600px, `md` = 960px, `lg` = 1280px. **KPI grid 4-up phải map thủ công**: 1 cột < 640, 2 cột ≥ 640, 4 cột ≥ 1024 — không dùng thẳng breakpoint name của Vuetify.
- Toàn bộ màu là **OKLCH** — Vuetify 4.0.3 không parse được, phải convert sang hex/rgb/hsl trước khi đưa vào theme.
- `space-y-*` / `gap-*` của Tailwind map sang `ga-*`/`v-row` hoặc CSS thuần; các giá trị đều là bội số 4px trừ vài ngoại lệ đã liệt kê.
