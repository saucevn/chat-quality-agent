# Phase 1 — Component dùng chung (5 story SONG SONG)

> **Đọc `README.md` cùng thư mục trước.** Global Constraints, Decision
> register và **Contract API** ở đó là bắt buộc — chữ ký component dưới đây
> phải khớp Contract từng chữ, vì 10 story Phase 2 viết dựa vào nó mà không
> đợi Phase 1 xong.
>
> **REQUIRED SUB-SKILL:** `superpowers:subagent-driven-development` hoặc
> `superpowers:executing-plans`.

**Goal:** Dựng bộ component và tiện ích dùng chung mà 18 view đang thiếu —
trạng thái rỗng/tải/lỗi, bảng có sort-phân trang, khung trang, hộp thoại xác
nhận, định dạng số kiểu vi-VN, và thẻ KPI.

**Architecture:** Mọi component mới nằm dưới `frontend/src/components/ui/` —
thư mục mới, **không file nào đang tồn tại bị sửa** trừ `StatusBadge.vue`
(story 1C hồi sinh nó). Nhờ vậy 5 story chạy song song hoàn toàn.

**Tech Stack:** Vue 3.5 `<script setup lang="ts">` · Vuetify 4.0.3 ·
vue-i18n 9 · Vitest 4 + `@vue/test-utils` + happy-dom

**Phụ thuộc:** 1A, 1B, 1C, 1E cần Phase 0 xong (dùng class typography DS và
token). **1D không phụ thuộc gì — chạy được ngay, song song với Phase 0.**

---

## Quy ước chung cho mọi story trong phase này

- Component đặt ở `frontend/src/components/ui/`, tên PascalCase.
- `<script setup lang="ts">` + `defineProps<{...}>()` type tường minh (repo
  bật `strict` + `noUnusedLocals`).
- **Không** hard-code chuỗi hiển thị; nhận qua prop, hoặc lấy qua `useI18n()`.
- **Không** hard-code màu; dùng tên màu Vuetify (`color="primary"`) hoặc
  `var(--token)` trong `<style scoped>`.
- Mỗi component có test khẳng định **hành vi**, không chỉ khẳng định nó render.
- Test đặt ở `frontend/src/components/ui/__tests__/<Tên>.spec.ts` (khớp
  `test.include: ['src/**/*.spec.ts']` ở `vite.config.ts:16`).

**Mẫu dựng component có i18n + Vuetify** — dùng chung:

```ts
// frontend/src/components/ui/__tests__/helpers.ts  ← story 1A tạo
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createI18n } from 'vue-i18n'
import vi from '../../../i18n/vi'

export function mountOptions() {
  return {
    global: {
      plugins: [
        createVuetify({ components, directives }),
        createI18n({ legacy: false, locale: 'vi', messages: { vi } }),
      ],
    },
  }
}
```

> **Điểm phối hợp:** `helpers.ts` do **story 1A** tạo. 1B/1C/1E import nó.
> Nếu 1A chưa xong, chép tạm nội dung trên vào test của mình rồi đổi sang
> import khi 1A merge — **đừng** sửa file của 1A.

---

### Story 1A: EmptyState + bộ Skeleton

`v-empty-state` và `v-skeleton-loader` hiện dùng **0 lần** trong `src/`. Đây
là khoảng trống lớn nhất của giao diện.

**Files:**
- Create: `frontend/src/components/ui/EmptyState.vue`
- Create: `frontend/src/components/ui/SkeletonBlock.vue`
- Create: `frontend/src/components/ui/SkeletonTable.vue`
- Create: `frontend/src/components/ui/SkeletonCard.vue`
- Create: `frontend/src/components/ui/SkeletonKpi.vue`
- Create: `frontend/src/components/ui/__tests__/helpers.ts`
- Create: `frontend/src/components/ui/__tests__/EmptyState.spec.ts`
- Create: `frontend/src/components/ui/__tests__/Skeleton.spec.ts`

**Interfaces:**
- Consumes: token `--muted`, `--duration-slow`, `--ease-inOut`,
  `--radius-sm`; class `.text-body-sm`, `.text-body-xs` (Phase 0)
- Produces: đúng chữ ký Contract trong `README.md`

**Đặc tả nguồn:** `spec-section3-patterns.md` §3.2 (dòng 116–195), §3.3.

- [ ] **Step 1: Viết test thất bại cho EmptyState**

```ts
// frontend/src/components/ui/__tests__/EmptyState.spec.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import EmptyState from '../EmptyState.vue'
import { mountOptions } from './helpers'

describe('EmptyState', () => {
  it('hiện đủ 3 yếu tố bắt buộc: icon, tiêu đề, hành động', () => {
    const w = mount(EmptyState, {
      ...mountOptions(),
      props: { title: 'Chưa có kênh nào', actionLabel: 'Kết nối kênh đầu tiên' },
    })
    expect(w.find('.v-icon').exists()).toBe(true)
    expect(w.text()).toContain('Chưa có kênh nào')
    expect(w.text()).toContain('Kết nối kênh đầu tiên')
  })

  it('phát sự kiện action khi bấm nút', async () => {
    const w = mount(EmptyState, {
      ...mountOptions(),
      props: { title: 'x', actionLabel: 'Thử lại' },
    })
    await w.find('button').trigger('click')
    expect(w.emitted('action')).toHaveLength(1)
  })

  it('variant error dùng nút outlined, variant khác dùng nút flat', () => {
    const err = mount(EmptyState, {
      ...mountOptions(),
      props: { title: 'x', actionLabel: 'y', variant: 'error' as const },
    })
    const first = mount(EmptyState, {
      ...mountOptions(),
      props: { title: 'x', actionLabel: 'y', variant: 'first-run' as const },
    })
    expect(err.find('button').classes()).toContain('v-btn--variant-outlined')
    expect(first.find('button').classes()).toContain('v-btn--variant-flat')
  })

  it('không render mô tả khi không truyền', () => {
    const w = mount(EmptyState, { ...mountOptions(), props: { title: 'x' } })
    expect(w.find('[data-test="description"]').exists()).toBe(false)
  })
})
```

- [ ] **Step 2: Chạy test để chắc chắn nó đỏ**

Run: `cd frontend && npx vitest run src/components/ui`
Expected: FAIL — `Cannot find module '../EmptyState.vue'`.

- [ ] **Step 3: Viết EmptyState**

```vue
<!-- frontend/src/components/ui/EmptyState.vue -->
<!--
  Trạng thái rỗng / không kết quả / lỗi — DS §3.2.
  Ba yếu tố BẮT BUỘC: icon, tiêu đề, hành động. Tiêu đề không được là "Oops!"
  hay "Không có gì ở đây"; mô tả nên chứa số cụ thể hoặc bước tiếp theo (§5.2).
  Biến thể `error` là một variant của chính component này, không tách riêng.
-->
<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    variant?: 'first-run' | 'no-data' | 'error'
    icon?: string
    title: string
    description?: string
    actionLabel?: string
  }>(),
  { variant: 'first-run' },
)

defineEmits<{ action: [] }>()

const DEFAULT_ICON = {
  'first-run': 'mdi-plus-box-outline',
  'no-data': 'mdi-file-search-outline',
  error: 'mdi-alert-outline',
} as const

const ICON_COLOR = {
  'first-run': 'primary',
  'no-data': 'medium-emphasis',
  error: 'error',
} as const

const resolvedIcon = computed(() => props.icon ?? DEFAULT_ICON[props.variant])
const iconColor = computed(() => ICON_COLOR[props.variant])
// DS §3.2 dòng 1635: error → outlined, còn lại → primary flat
const btnVariant = computed(() => (props.variant === 'error' ? 'outlined' : 'flat'))
</script>

<template>
  <div class="empty-state">
    <v-icon :icon="resolvedIcon" :color="iconColor" size="48" class="mb-4" />
    <h3 class="text-body-sm font-weight-bold">{{ title }}</h3>
    <p v-if="description" data-test="description" class="empty-state__desc text-body-sm">
      {{ description }}
    </p>
    <v-btn v-if="actionLabel" :variant="btnVariant" color="primary" @click="$emit('action')">
      {{ actionLabel }}
    </v-btn>
  </div>
</template>

<style scoped>
/* Số đo lấy từ DS §3.2 dòng 1621–1640. */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  text-align: center;
}

.empty-state h3 {
  color: rgb(var(--v-theme-on-surface));
  margin-block-end: 6px;
}

.empty-state__desc {
  max-inline-size: 320px;
  margin-block-end: 20px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
</style>
```

- [ ] **Step 4: Chạy test để chắc chắn nó xanh**

Run: `cd frontend && npx vitest run src/components/ui`
Expected: 4 test PASS.

- [ ] **Step 5: Viết test thất bại cho bộ Skeleton**

```ts
// frontend/src/components/ui/__tests__/Skeleton.spec.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SkeletonTable from '../SkeletonTable.vue'
import SkeletonKpi from '../SkeletonKpi.vue'
import SkeletonCard from '../SkeletonCard.vue'
import { mountOptions } from './helpers'

describe('Skeleton', () => {
  it('SkeletonTable dựng đúng số hàng × số cột', () => {
    const w = mount(SkeletonTable, { ...mountOptions(), props: { rows: 3, cols: 4 } })
    expect(w.findAll('[data-test="skeleton-row"]')).toHaveLength(3)
    expect(w.findAll('[data-test="skeleton-cell"]')).toHaveLength(12)
  })

  it('SkeletonTable mặc định 5 hàng', () => {
    const w = mount(SkeletonTable, { ...mountOptions(), props: { cols: 2 } })
    expect(w.findAll('[data-test="skeleton-row"]')).toHaveLength(5)
  })

  it('SkeletonKpi dựng đúng số thẻ, mỗi thẻ có khối 60% và 40%', () => {
    const w = mount(SkeletonKpi, { ...mountOptions(), props: { count: 4 } })
    expect(w.findAll('[data-test="skeleton-kpi-card"]')).toHaveLength(4)
    // quyết định A16: dùng bộ số của DS §3.3 (60%/40%), không phải của §2.9
    expect(w.html()).toContain('width: 60%')
    expect(w.html()).toContain('width: 40%')
  })

  it('SkeletonCard dựng đúng số dòng', () => {
    const w = mount(SkeletonCard, { ...mountOptions(), props: { lines: 2 } })
    expect(w.findAll('[data-test="skeleton-line"]')).toHaveLength(2)
  })
})
```

- [ ] **Step 6: Chạy test để chắc chắn nó đỏ**

Run: `cd frontend && npx vitest run src/components/ui/__tests__/Skeleton.spec.ts`
Expected: FAIL — không tìm thấy module.

- [ ] **Step 7: Viết bộ Skeleton**

```vue
<!-- frontend/src/components/ui/SkeletonBlock.vue -->
<!--
  Khối xám nhấp nháy — primitive dùng chung của mọi skeleton.
  DS §3.3 cấm spinner toàn trang làm trạng thái tải (anti-pattern #7);
  skeleton phải khớp HÌNH DẠNG nội dung thật để không gây layout shift.
  Tôn trọng prefers-reduced-motion theo DS §1.3.
-->
<script setup lang="ts">
withDefaults(defineProps<{ width?: string; height?: string; radius?: string }>(), {
  width: '100%',
  height: '12px',
  radius: 'var(--radius-sm)',
})
</script>

<template>
  <div class="skeleton-block" :style="{ width, height, borderRadius: radius }" />
</template>

<style scoped>
.skeleton-block {
  background: rgb(var(--v-theme-muted));
  animation: skeleton-pulse var(--duration-slow) var(--ease-inOut) infinite alternate;
}

@keyframes skeleton-pulse {
  from { opacity: 1; }
  to { opacity: 0.55; }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-block { animation: none; }
}
</style>
```

```vue
<!-- frontend/src/components/ui/SkeletonTable.vue -->
<script setup lang="ts">
import SkeletonBlock from './SkeletonBlock.vue'

withDefaults(defineProps<{ rows?: number; cols: number }>(), { rows: 5 })
</script>

<template>
  <div class="pa-4">
    <div v-for="r in rows" :key="r" data-test="skeleton-row" class="d-flex ga-4 mb-4">
      <div v-for="c in cols" :key="c" data-test="skeleton-cell" class="flex-grow-1">
        <SkeletonBlock height="16px" />
      </div>
    </div>
  </div>
</template>
```

```vue
<!-- frontend/src/components/ui/SkeletonCard.vue -->
<script setup lang="ts">
import SkeletonBlock from './SkeletonBlock.vue'

withDefaults(defineProps<{ lines?: number }>(), { lines: 3 })
</script>

<template>
  <v-card>
    <div class="pa-5">
      <SkeletonBlock width="40%" height="16px" class="mb-4" />
      <SkeletonBlock
        v-for="l in lines"
        :key="l"
        data-test="skeleton-line"
        height="12px"
        class="mb-2"
      />
    </div>
  </v-card>
</template>
```

```vue
<!-- frontend/src/components/ui/SkeletonKpi.vue -->
<!--
  Khớp hình dạng thẻ KPI thật (DS §2.2 dòng 846–868): nhãn nhỏ trên, số lớn
  giữa, delta dưới. Bộ số 60%/40% theo DS §3.3 — quyết định A16 (§2.9 có bộ
  số khác, không dùng).
-->
<script setup lang="ts">
import SkeletonBlock from './SkeletonBlock.vue'

withDefaults(defineProps<{ count?: number }>(), { count: 4 })
</script>

<template>
  <v-row>
    <v-col v-for="i in count" :key="i" cols="12" sm="6" lg="3">
      <v-card data-test="skeleton-kpi-card">
        <div class="pa-5">
          <SkeletonBlock width="50%" height="12px" class="mb-4" />
          <SkeletonBlock width="60%" height="30px" class="mb-3" />
          <SkeletonBlock width="40%" height="12px" />
        </div>
      </v-card>
    </v-col>
  </v-row>
</template>
```

- [ ] **Step 8: Chạy test và type-check**

Run: `cd frontend && npx vitest run src/components/ui && npx vue-tsc -b`
Expected: 8 test PASS, không lỗi type.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/components/ui
git commit -m "feat(frontend): EmptyState và bộ Skeleton theo design system"
```

---

### Story 1B: DataTable + FilterBar

`v-data-table` dùng **0 lần** trong repo; 14 chỗ dùng `v-table` thô không
sort, không phân trang, không tìm kiếm.

**Files:**
- Create: `frontend/src/components/ui/DataTable.vue`
- Create: `frontend/src/components/ui/FilterBar.vue`
- Create: `frontend/src/components/ui/__tests__/DataTable.spec.ts`

**Interfaces:**
- Consumes: `EmptyState.vue`, `SkeletonTable.vue` (story 1A)
- Produces: đúng chữ ký Contract trong `README.md`

**Đặc tả nguồn:** `spec-section2-components.md` §2.6,
`spec-section3-patterns.md` §3.6. Quyết định B4: toolbar cao **56px**,
padding-X **16px**, gap **12px**. Quyết định B9: mọi control trong FilterBar
cao **36px**.

- [ ] **Step 1: Viết test thất bại**

```ts
// frontend/src/components/ui/__tests__/DataTable.spec.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DataTable from '../DataTable.vue'
import { mountOptions } from './helpers'

const headers = [
  { title: 'Tên', key: 'name' },
  { title: 'Trạng thái', key: 'status' },
]

describe('DataTable', () => {
  it('đang tải thì hiện skeleton, không hiện empty', () => {
    const w = mount(DataTable, {
      ...mountOptions(),
      props: { headers, items: [], loading: true },
    })
    expect(w.findAll('[data-test="skeleton-row"]').length).toBeGreaterThan(0)
    expect(w.find('[data-test="empty"]').exists()).toBe(false)
  })

  it('lỗi thì hiện EmptyState variant error và phát retry', async () => {
    const w = mount(DataTable, {
      ...mountOptions(),
      props: { headers, items: [], error: true },
    })
    expect(w.find('[data-test="empty"]').exists()).toBe(true)
    await w.find('button').trigger('click')
    expect(w.emitted('retry')).toHaveLength(1)
  })

  it('rỗng mà không lỗi thì hiện EmptyState với tiêu đề truyền vào', () => {
    const w = mount(DataTable, {
      ...mountOptions(),
      props: { headers, items: [], emptyTitle: 'Chưa có công việc nào' },
    })
    expect(w.text()).toContain('Chưa có công việc nào')
  })

  it('có dữ liệu thì render hàng, không hiện skeleton', () => {
    const w = mount(DataTable, {
      ...mountOptions(),
      props: { headers, items: [{ name: 'Job A', status: 'success' }] },
    })
    expect(w.text()).toContain('Job A')
    expect(w.find('[data-test="skeleton-row"]').exists()).toBe(false)
  })
})
```

- [ ] **Step 2: Chạy test để chắc chắn nó đỏ**

Run: `cd frontend && npx vitest run src/components/ui/__tests__/DataTable.spec.ts`
Expected: FAIL — không tìm thấy module.

- [ ] **Step 3: Viết DataTable**

```vue
<!-- frontend/src/components/ui/DataTable.vue -->
<!--
  Bảng dữ liệu chuẩn — bọc v-data-table và ÉP xử lý đủ 4 trạng thái
  (tải / lỗi / rỗng / có dữ liệu) theo README §"Quy tắc 4 trạng thái".
  Trước đợt này repo dùng v-table thô 14 chỗ: không sort, không phân trang,
  và phần lớn không có trạng thái nào.
-->
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import EmptyState from './EmptyState.vue'
import SkeletonTable from './SkeletonTable.vue'

interface Header {
  title: string
  key: string
  sortable?: boolean
  align?: 'start' | 'center' | 'end'
}

const props = withDefaults(
  defineProps<{
    headers: Header[]
    items: unknown[]
    loading?: boolean
    error?: boolean
    totalItems?: number
    page?: number
    itemsPerPage?: number
    emptyTitle?: string
    emptyDescription?: string
  }>(),
  { loading: false, error: false, page: 1, itemsPerPage: 20 },
)

const emit = defineEmits<{
  'update:page': [value: number]
  'update:itemsPerPage': [value: number]
  retry: []
}>()

const { t } = useI18n()
</script>

<template>
  <v-card>
    <div v-if="$slots.toolbar" class="data-table__toolbar">
      <slot name="toolbar" />
    </div>

    <SkeletonTable v-if="loading" :cols="headers.length" />

    <EmptyState
      v-else-if="error"
      data-test="empty"
      variant="error"
      :title="t('error_load_failed_title')"
      :description="t('error_load_failed_desc')"
      :action-label="t('retry')"
      @action="emit('retry')"
    />

    <EmptyState
      v-else-if="!items.length"
      data-test="empty"
      variant="no-data"
      :title="props.emptyTitle ?? t('no_data')"
      :description="props.emptyDescription"
    />

    <v-data-table
      v-else
      :headers="headers"
      :items="items"
      :page="page"
      :items-per-page="itemsPerPage"
      :items-length="totalItems ?? items.length"
      @update:page="emit('update:page', $event)"
      @update:items-per-page="emit('update:itemsPerPage', $event)"
    >
      <!-- Chuyển tiếp mọi slot item.<key> để view tự vẽ ô -->
      <template v-for="(_, name) in $slots" #[name]="slotProps" :key="name">
        <slot :name="name" v-bind="slotProps ?? {}" />
      </template>
    </v-data-table>
  </v-card>
</template>

<style scoped>
/* Quyết định B4: toolbar cao 56px, padding-X 16px, gap 12px. */
.data-table__toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  block-size: 56px;
  padding-inline: 16px;
  border-block-end: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
```

- [ ] **Step 4: Viết FilterBar**

```vue
<!-- frontend/src/components/ui/FilterBar.vue -->
<!--
  Hàng bộ lọc — DS §3.5. Đặc tả gốc để 4 chiều cao control khác nhau trên
  cùng một hàng (input 36 / select 32 / button 30 / chip 28); quyết định B9
  thống nhất TẤT CẢ về 36px.
-->
<template>
  <div class="filter-bar">
    <slot />
  </div>
</template>

<style scoped>
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.filter-bar :deep(.v-field),
.filter-bar :deep(.v-btn) {
  block-size: 36px;
  min-block-size: 36px;
}
</style>
```

- [ ] **Step 5: Bảo đảm khoá i18n mà DataTable dùng đã có**

`DataTable` gọi `t('error_load_failed_title')`, `t('error_load_failed_desc')`,
`t('retry')`, `t('no_data')`. Ba khoá đầu thuộc **story 1D**
(`i18n/*/errors.ts`); `no_data` đã có sẵn trong `common`.

Nếu 1D chưa merge, thêm tạm vào `i18n/vi/common.ts` + `i18n/en/common.ts` và
**báo cho 1D** để gộp — đừng để khoá trùng ở hai module (test
`i18n.spec.ts` của Phase 0 bắt trùng lặp và sẽ đỏ).

- [ ] **Step 6: Chạy test và type-check**

Run: `cd frontend && npx vitest run src/components/ui && npx vue-tsc -b`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/ui frontend/src/i18n
git commit -m "feat(frontend): DataTable xử lý đủ 4 trạng thái và FilterBar"
```

---

### Story 1C: PageHeader, SectionCard, ConfirmDialog, FormField, StatusBadge

**Files:**
- Create: `frontend/src/components/ui/PageHeader.vue`
- Create: `frontend/src/components/ui/SectionCard.vue`
- Create: `frontend/src/components/ui/ConfirmDialog.vue`
- Create: `frontend/src/components/ui/FormField.vue`
- Modify: `frontend/src/components/StatusBadge.vue`
- Create: `frontend/src/components/ui/__tests__/ConfirmDialog.spec.ts`
- Create: `frontend/src/components/__tests__/StatusBadge.spec.ts`

**Interfaces:** đúng chữ ký Contract trong `README.md`.

**Bối cảnh `StatusBadge`:** file đã tồn tại (51 dòng, chuẩn hoá tốt) nhưng
grep toàn `src/` **không nơi nào import** — code chết, trong khi 78 chỗ tự
viết `<v-chip variant="tonal">`. Story này sửa nó khớp bảng ánh xạ trạng thái
ở README §Contract và bỏ `'grey'` (không có trong token).

- [ ] **Step 1: Viết test thất bại cho StatusBadge**

```ts
// frontend/src/components/__tests__/StatusBadge.spec.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StatusBadge from '../StatusBadge.vue'
import { mountOptions } from '../ui/__tests__/helpers'

describe('StatusBadge', () => {
  it('ánh xạ trạng thái sang màu token, không dùng palette Vuetify', () => {
    const cases: Array<[string, string]> = [
      ['running', 'amber'],
      ['syncing', 'amber'],
      ['success', 'success'],
      ['active', 'success'],
      ['failed', 'error'],
      ['pending', 'medium-emphasis'],
      ['disabled', 'medium-emphasis'],
    ]
    for (const [status, color] of cases) {
      const w = mount(StatusBadge, { ...mountOptions(), props: { status } })
      expect(w.attributes('data-color'), `${status} sai màu`).toBe(color)
    }
  })

  it('không bao giờ trả màu grey — grey không có trong token', () => {
    const w = mount(StatusBadge, { ...mountOptions(), props: { status: 'khong-biet' } })
    expect(w.attributes('data-color')).not.toBe('grey')
  })
})
```

- [ ] **Step 2: Chạy test để chắc chắn nó đỏ**

Run: `cd frontend && npx vitest run src/components/__tests__/StatusBadge.spec.ts`
Expected: FAIL — `StatusBadge` hiện trả `'grey'`/`'info'` và chưa có
attribute `data-color`.

- [ ] **Step 3: Sửa StatusBadge khớp bảng ánh xạ**

Thay script + template của `frontend/src/components/StatusBadge.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(defineProps<{ status: string; size?: string }>(), {
  size: 'small',
})

const { t } = useI18n()

// Đây là NƠI DUY NHẤT ánh xạ trạng thái → màu. View không được tự viết
// <v-chip :color="..."> cho trạng thái — xem README §Contract.
const COLOR: Record<string, string> = {
  running: 'amber', syncing: 'amber',
  success: 'success', active: 'success', pass: 'success',
  failed: 'error', error: 'error',
  pending: 'medium-emphasis', queued: 'medium-emphasis',
  disabled: 'medium-emphasis', paused: 'medium-emphasis',
}

const color = computed(() => COLOR[props.status] ?? 'medium-emphasis')
const label = computed(() => t(`status_${props.status}`))
</script>

<template>
  <v-chip :color="color" :size="size" :data-color="color" variant="tonal">
    {{ label }}
  </v-chip>
</template>
```

Thêm 11 khoá `status_*` vào `i18n/vi/common.ts` và `i18n/en/common.ts`
(`status_running`, `status_syncing`, `status_success`, `status_active`,
`status_pass`, `status_failed`, `status_error`, `status_pending`,
`status_queued`, `status_disabled`, `status_paused`).

- [ ] **Step 4: Chạy test để chắc chắn nó xanh**

Run: `cd frontend && npx vitest run src/components/__tests__/StatusBadge.spec.ts`
Expected: PASS.

- [ ] **Step 5: Viết test thất bại cho ConfirmDialog**

```ts
// frontend/src/components/ui/__tests__/ConfirmDialog.spec.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ConfirmDialog from '../ConfirmDialog.vue'
import { mountOptions } from './helpers'

describe('ConfirmDialog', () => {
  it('destructive thì nút xác nhận mang màu error', () => {
    const w = mount(ConfirmDialog, {
      ...mountOptions(),
      props: {
        modelValue: true, title: 'Xoá kênh', message: 'Không hoàn tác được.',
        confirmLabel: 'Xoá vĩnh viễn', destructive: true,
      },
      attachTo: document.body,
    })
    const btn = document.querySelector('[data-test="confirm"]')
    expect(btn?.className).toContain('text-error')
    w.unmount()
  })

  it('phát confirm khi bấm nút xác nhận', async () => {
    const w = mount(ConfirmDialog, {
      ...mountOptions(),
      props: { modelValue: true, title: 'x', message: 'y', confirmLabel: 'Đồng ý' },
      attachTo: document.body,
    })
    ;(document.querySelector('[data-test="confirm"]') as HTMLElement).click()
    await w.vm.$nextTick()
    expect(w.emitted('confirm')).toHaveLength(1)
    w.unmount()
  })
})
```

- [ ] **Step 6: Chạy test để chắc chắn nó đỏ**

Run: `cd frontend && npx vitest run src/components/ui/__tests__/ConfirmDialog.spec.ts`
Expected: FAIL — không tìm thấy module.

- [ ] **Step 7: Viết bốn component còn lại**

```vue
<!-- frontend/src/components/ui/ConfirmDialog.vue -->
<!--
  Hộp thoại xác nhận — thay 3 chỗ đang dùng confirm() native tiếng Anh
  (Channels.vue:426, JobList.vue:74, MCPConnections.vue:162).
  Quyết định A13: CHỈ hành động không hoàn tác được mới dùng hộp thoại này;
  hành động hoàn tác được thì cập nhật lạc quan + toast "Hoàn lại" 5s.
  Nhãn nút phải nói rõ hậu quả — "Xoá vĩnh viễn", không phải "Xoá" (DS §5.1).
-->
<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{
  modelValue: boolean
  title: string
  message: string
  confirmLabel: string
  destructive?: boolean
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
}>()

const { t } = useI18n()
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="420"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="text-heading-3">{{ title }}</v-card-title>
      <v-card-text class="text-body-sm">{{ message }}</v-card-text>
      <v-card-actions class="justify-end">
        <v-btn variant="text" color="default" @click="emit('update:modelValue', false)">
          {{ t('cancel') }}
        </v-btn>
        <v-btn
          data-test="confirm"
          :color="destructive ? 'error' : 'primary'"
          :variant="destructive ? 'text' : 'flat'"
          :loading="loading"
          @click="emit('confirm')"
        >
          {{ confirmLabel }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
```

```vue
<!-- frontend/src/components/ui/PageHeader.vue -->
<!--
  Tiêu đề trang + hành động. Trước đợt này mỗi view tự dựng bằng
  div.text-subtitle-1 — class đó là no-op trong Vuetify 4 (xem
  phase-0-foundation.md §"252 class typography đang là no-op").
-->
<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  breadcrumbs?: { title: string; to?: string }[]
}>()
</script>

<template>
  <div class="mb-6">
    <v-breadcrumbs v-if="breadcrumbs?.length" :items="breadcrumbs" class="pa-0 mb-2" />
    <div class="d-flex align-center justify-space-between ga-4 flex-wrap">
      <div>
        <h1 class="text-heading-1">{{ title }}</h1>
        <p v-if="subtitle" class="text-body-sm text-medium-emphasis mt-1">{{ subtitle }}</p>
      </div>
      <div class="d-flex align-center ga-2">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>
```

```vue
<!-- frontend/src/components/ui/SectionCard.vue -->
<!-- Card có tiêu đề/mô tả chuẩn DS §2.2: header padding 20px, padding-bottom 0. -->
<script setup lang="ts">
defineProps<{ title?: string; subtitle?: string }>()
</script>

<template>
  <v-card>
    <div v-if="title || $slots.actions" class="section-card__header">
      <div>
        <h2 v-if="title" class="text-heading-3">{{ title }}</h2>
        <p v-if="subtitle" class="text-body-xs text-medium-emphasis mt-1">{{ subtitle }}</p>
      </div>
      <div class="d-flex align-center ga-2">
        <slot name="actions" />
      </div>
    </div>
    <div class="section-card__body">
      <slot />
    </div>
  </v-card>
</template>

<style scoped>
.section-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 20px 0;
}

.section-card__body {
  padding: 20px;
}
</style>
```

```vue
<!-- frontend/src/components/ui/FormField.vue -->
<!--
  DS §2.3/§3.4: label LUÔN nằm TRÊN field ("UX VN quen label trên field"),
  placeholder là ví dụ chứ không phải nhãn. Vuetify mặc định thả nổi label vào
  viền field — trái đặc tả. Vì vậy field đặt trong slot KHÔNG nhận prop
  `label`; truyền `placeholder` thay thế.
  Thứ tự dọc bắt buộc: Label → Field → Helper (luôn hiện khi có) → Error
  (THAY THẾ helper khi có lỗi).
-->
<script setup lang="ts">
import { computed, useId } from 'vue'

const props = defineProps<{
  label: string
  required?: boolean
  hint?: string
  error?: string
  inputId?: string
}>()

const auto = useId()
const id = computed(() => props.inputId ?? `field-${auto}`)
</script>

<template>
  <div class="form-field">
    <label :for="id" class="text-body-sm">
      {{ label }}<span v-if="required" class="text-error ms-1">*</span>
    </label>
    <slot :id="id" :describedby="error ? `${id}-error` : undefined" />
    <p v-if="error" :id="`${id}-error`" class="text-body-xs text-error">{{ error }}</p>
    <p v-else-if="hint" class="text-body-xs text-medium-emphasis">{{ hint }}</p>
  </div>
</template>

<style scoped>
.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
</style>
```

- [ ] **Step 8: Chạy test và type-check**

Run: `cd frontend && npx vitest run src/components && npx vue-tsc -b`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/components frontend/src/i18n
git commit -m "feat(frontend): khung trang, hộp thoại xác nhận, FormField và hồi sinh StatusBadge"
```

---

### Story 1D: Định dạng số kiểu vi-VN và ánh xạ lỗi

**Không phụ thuộc Phase 0 — chạy được ngay.**

**Files:**
- Create: `frontend/src/utils/format.ts`
- Create: `frontend/src/utils/errors.ts`
- Create: `frontend/src/utils/__tests__/format.spec.ts`
- Create: `frontend/src/utils/__tests__/errors.spec.ts`
- Create: `frontend/src/i18n/vi/errors.ts` và `frontend/src/i18n/en/errors.ts`

**Interfaces:** đúng chữ ký Contract trong `README.md`.

**Đặc tả nguồn:** DS §5.4 (dòng 2450–2493) và §5.3 (dòng 2431–2446).
Năm quy tắc số tiếng Việt (dòng 2488–2493): dấu **chấm** phân cách nghìn ·
dấu **phẩy** thập phân · tên tháng/thứ **không viết hoa** · **không có số
nhiều** · số < 0,1% hiện **`<0,1%`**.

- [ ] **Step 1: Viết test thất bại**

```ts
// frontend/src/utils/__tests__/format.spec.ts
import { describe, it, expect } from 'vitest'
import { vnd, vndShort, pct, usd, dateTable, dateWithTime } from '../format'

describe('format vi-VN', () => {
  it('vnd dùng dấu chấm phân cách nghìn, không phần thập phân', () => {
    expect(vnd(2847621000)).toBe('2.847.621.000 ₫')
    expect(vnd(0)).toBe('0 ₫')
  })

  it('vndShort rút gọn tỷ / triệu / nghìn, dấu phẩy thập phân', () => {
    expect(vndShort(2847621000)).toBe('2,85 tỷ')
    expect(vndShort(384700000)).toBe('384,7 tr')
    expect(vndShort(14000)).toBe('14k')
    expect(vndShort(942)).toBe('942')
  })

  it('pct dùng dấu phẩy thập phân', () => {
    expect(pct(18.4)).toBe('18,4%')
    expect(pct(100)).toBe('100,0%')
  })

  it('pct hiện <0,1% thay vì làm tròn về 0,0%', () => {
    expect(pct(0.07)).toBe('<0,1%')
    expect(pct(0)).toBe('0,0%')
  })

  it('dateTable là dd/MM/yyyy, dateWithTime kèm giờ', () => {
    const d = new Date('2026-03-09T14:05:00')
    expect(dateTable(d)).toBe('09/03/2026')
    expect(dateWithTime(d)).toBe('09/03/2026 lúc 14:05')
  })

  it('usd giữ 2 số lẻ kiểu Mỹ — dùng cho chi phí AI', () => {
    expect(usd(12.3456)).toBe('$12.35')
  })
})
```

```ts
// frontend/src/utils/__tests__/errors.spec.ts
import { describe, it, expect } from 'vitest'
import { errorCode, errorKey } from '../errors'

describe('errorCode', () => {
  it('lấy mã lỗi đã biết từ phản hồi axios', () => {
    expect(errorCode({ response: { data: { code: 'auth.token.expired' } } }))
      .toBe('auth.token.expired')
  })

  it('quy mọi lỗi lạ về system.internal — KHÔNG lộ message raw của backend', () => {
    expect(errorCode(new Error('pq: duplicate key value violates unique constraint')))
      .toBe('system.internal')
    expect(errorCode(undefined)).toBe('system.internal')
  })

  it('errorKey đổi dấu chấm thành gạch dưới để tra i18n', () => {
    expect(errorKey({ response: { data: { code: 'system.rate_limit' } } }))
      .toBe('err_system_rate_limit')
  })
})
```

- [ ] **Step 2: Chạy test để chắc chắn nó đỏ**

Run: `cd frontend && npx vitest run src/utils`
Expected: FAIL — không tìm thấy module.

- [ ] **Step 3: Viết format.ts**

```ts
// frontend/src/utils/format.ts
// Định dạng số/tiền/ngày theo quy ước tiếng Việt — ERP design system §5.4.
// Dấu CHẤM phân cách nghìn, dấu PHẨY thập phân. Phần trăm nhỏ hơn 0,1% hiện
// "<0,1%" chứ không làm tròn về "0,0%" — làm tròn khiến người đọc tưởng bằng
// không.
const VND = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

const USD = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** "2.847.621.000 ₫" */
export function vnd(n: number): string {
  return VND.format(n)
}

/** "2,85 tỷ" · "384,7 tr" · "14k" · "942" */
export function vndShort(n: number): string {
  const comma = (v: number, d: number) => v.toFixed(d).replace('.', ',')
  if (Math.abs(n) >= 1e9) return `${comma(n / 1e9, 2)} tỷ`
  if (Math.abs(n) >= 1e6) return `${comma(n / 1e6, 1)} tr`
  if (Math.abs(n) >= 1e3) return `${Math.round(n / 1e3)}k`
  return String(n)
}

/** "18,4%" — số dương nhỏ hơn 0,1 trả "<0,1%" */
export function pct(n: number, decimals = 1): string {
  if (n > 0 && n < 0.1) return '<0,1%'
  return `${n.toFixed(decimals).replace('.', ',')}%`
}

/** "$12.35" — chi phí AI tính bằng đô, giữ quy ước Mỹ */
export function usd(n: number): string {
  return USD.format(n)
}

const pad = (n: number) => String(n).padStart(2, '0')
const toDate = (d: string | Date) => (d instanceof Date ? d : new Date(d))

/** "09/03/2026" */
export function dateTable(d: string | Date): string {
  const x = toDate(d)
  return `${pad(x.getDate())}/${pad(x.getMonth() + 1)}/${x.getFullYear()}`
}

/** "09/03/2026 lúc 14:05" */
export function dateWithTime(d: string | Date): string {
  const x = toDate(d)
  return `${dateTable(x)} lúc ${pad(x.getHours())}:${pad(x.getMinutes())}`
}

/** "3 phút trước" · "2 ngày trước" — tên tháng/thứ không viết hoa (§5.4) */
export function dateRelative(d: string | Date): string {
  const mins = Math.floor((Date.now() - toDate(d).getTime()) / 60000)
  if (mins < 1) return 'vừa xong'
  if (mins < 60) return `${mins} phút trước`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} giờ trước`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} ngày trước`
  return dateTable(d)
}
```

- [ ] **Step 4: Viết errors.ts**

```ts
// frontend/src/utils/errors.ts
// Ánh xạ lỗi backend sang thông báo người đọc được — ERP design system §5.3.
// Quy tắc tuyệt đối: KHÔNG BAO GIỜ hiện message raw của backend cho người
// dùng (anti-pattern #10). Mọi mã lạ đều quy về 'system.internal'.
const KNOWN = new Set([
  'auth.login.invalid_credentials',
  'auth.token.expired',
  'validation.required',
  'system.rate_limit',
  'system.internal',
])

/** Rút mã lỗi đã biết; mọi thứ khác quy về 'system.internal'. */
export function errorCode(err: unknown): string {
  const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code
  return code && KNOWN.has(code) ? code : 'system.internal'
}

/**
 * Khoá i18n tương ứng, để view gọi t(errorKey(err)).
 * Tách khỏi errorCode để test được mà không cần dựng i18n.
 */
export function errorKey(err: unknown): string {
  return `err_${errorCode(err).replace(/\./g, '_')}`
}
```

- [ ] **Step 5: Thêm module i18n cho lỗi**

```ts
// frontend/src/i18n/vi/errors.ts
export default {
  err_auth_login_invalid_credentials: 'Email hoặc mật khẩu không đúng.',
  err_auth_token_expired: 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.',
  err_validation_required: 'Vui lòng điền đầy đủ thông tin bắt buộc.',
  err_system_rate_limit: 'Quá nhiều yêu cầu. Đợi vài giây rồi thử lại.',
  err_system_internal: 'Có lỗi xảy ra. Đã báo đội kỹ thuật. Thử lại hoặc liên hệ hỗ trợ.',
  error_load_failed_title: 'Không tải được dữ liệu',
  error_load_failed_desc: 'Có lỗi kết nối. Thử tải lại hoặc liên hệ hỗ trợ nếu vẫn lỗi.',
  retry: 'Tải lại',
}
```

```ts
// frontend/src/i18n/en/errors.ts
export default {
  err_auth_login_invalid_credentials: 'Incorrect email or password.',
  err_auth_token_expired: 'Your session expired. Please sign in again.',
  err_validation_required: 'Please fill in all required fields.',
  err_system_rate_limit: 'Too many requests. Wait a few seconds and try again.',
  err_system_internal: 'Something went wrong. The team has been notified. Try again or contact support.',
  error_load_failed_title: 'Could not load data',
  error_load_failed_desc: 'Connection error. Try reloading, or contact support if it persists.',
  retry: 'Reload',
}
```

Thêm `import errors from './errors'` và `...errors` vào `i18n/vi/index.ts`
và `i18n/en/index.ts`. Cập nhật số khoá trong `i18n.spec.ts` (Phase 0.4 chốt
243; story này thêm 8 ⇒ **251**) trong cùng commit.

Nếu Phase 0.4 chưa xong (chưa có thư mục `i18n/vi/`), thêm tạm vào `vi.ts` /
`en.ts` và **báo cho Phase 0** để đưa vào module `errors` khi tách.

- [ ] **Step 6: Chạy test và type-check**

Run: `cd frontend && npx vitest run && npx vue-tsc -b`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/utils frontend/src/i18n frontend/src/__tests__
git commit -m "feat(frontend): định dạng số kiểu vi-VN và ánh xạ lỗi không lộ raw"
```

---

### Story 1E: StatCard + KpiGrid

Thay 7 khối KPI đang chép tay: `Dashboard.vue:68-80, 83-96, 97-118` và
`JobDetail.vue:176-219, 223-256`.

**Files:**
- Create: `frontend/src/components/ui/StatCard.vue`
- Create: `frontend/src/components/ui/KpiGrid.vue`
- Create: `frontend/src/components/ui/__tests__/StatCard.spec.ts`

**Interfaces:** đúng chữ ký Contract trong `README.md`.
Consumes: `pct()` (story 1D).

**Đặc tả nguồn:** `spec-section3-patterns.md` §3.1 (dòng 39–113) và
`spec-section2-components.md` §2.2.

**Ba điều CẤM (DS §3.1 dòng 1534–1536), test phải chốt:**
1. Giá trị KPI **cấm** dùng `--muted-foreground` — phải full opacity
   (anti-pattern #1).
2. Delta badge vượt ngưỡng **cấm** dùng tint — phải solid.
3. Lưới **cấm** quá 5 thẻ.

- [ ] **Step 1: Viết test thất bại**

```ts
// frontend/src/components/ui/__tests__/StatCard.spec.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StatCard from '../StatCard.vue'
import { mountOptions } from './helpers'

describe('StatCard', () => {
  it('giá trị dùng bậc heading-1 và KHÔNG bị làm mờ (anti-pattern #1)', () => {
    const w = mount(StatCard, {
      ...mountOptions(),
      props: { label: 'Tổng hội thoại', value: '1.284' },
    })
    const v = w.find('[data-test="value"]')
    expect(v.classes()).toContain('text-heading-1')
    expect(v.classes()).not.toContain('text-medium-emphasis')
  })

  it('nhãn viết hoa dùng bậc label', () => {
    const w = mount(StatCard, {
      ...mountOptions(),
      props: { label: 'Tổng hội thoại', value: '1' },
    })
    expect(w.find('[data-test="label"]').classes()).toContain('text-label')
  })

  it('delta dương mũi tên lên màu success, delta âm mũi tên xuống màu error', () => {
    const up = mount(StatCard, {
      ...mountOptions(), props: { label: 'x', value: '1', change: 18.4 },
    })
    const down = mount(StatCard, {
      ...mountOptions(), props: { label: 'x', value: '1', change: -2.1 },
    })
    expect(up.find('[data-test="delta"]').text()).toContain('↑')
    expect(up.find('[data-test="delta"]').text()).toContain('18,4%')
    expect(down.find('[data-test="delta"]').text()).toContain('↓')
    expect(down.find('[data-test="delta"]').text()).toContain('2,1%')
  })

  it('loading thì không hiện giá trị — tránh số 0 giả', () => {
    const w = mount(StatCard, {
      ...mountOptions(), props: { label: 'x', value: 0, loading: true },
    })
    expect(w.find('[data-test="value"]').exists()).toBe(false)
  })
})
```

- [ ] **Step 2: Chạy test để chắc chắn nó đỏ**

Run: `cd frontend && npx vitest run src/components/ui/__tests__/StatCard.spec.ts`
Expected: FAIL — không tìm thấy module.

- [ ] **Step 3: Viết StatCard và KpiGrid**

```vue
<!-- frontend/src/components/ui/StatCard.vue -->
<!--
  Thẻ KPI — DS §2.2 (anatomy) và §3.1 (hierarchy 4 tầng).
  Ba điều CẤM: giá trị không được làm mờ; delta vượt ngưỡng phải dùng badge
  solid; lưới không quá 5 thẻ (KpiGrid cảnh báo).
  Thay 7 khối chép tay ở Dashboard.vue và JobDetail.vue.
-->
<script setup lang="ts">
import { computed } from 'vue'
import { pct } from '../../utils/format'

const props = defineProps<{
  label: string
  value: string | number
  unit?: string
  change?: number
  icon?: string
  loading?: boolean
  to?: string
}>()

const deltaUp = computed(() => (props.change ?? 0) >= 0)
const deltaText = computed(() =>
  props.change === undefined ? '' : `${deltaUp.value ? '↑' : '↓'} ${pct(Math.abs(props.change))}`,
)
</script>

<template>
  <v-card :to="to" class="h-100">
    <div class="stat-card__header">
      <span data-test="label" class="text-label text-medium-emphasis">{{ label }}</span>
      <v-icon v-if="icon" :icon="icon" size="16" class="text-medium-emphasis" />
    </div>

    <div class="stat-card__body">
      <v-progress-circular v-if="loading" indeterminate size="24" />
      <template v-else>
        <div class="d-flex align-end ga-1">
          <span data-test="value" class="stat-card__value text-heading-1">{{ value }}</span>
          <span v-if="unit" class="text-body-base text-medium-emphasis mb-1">{{ unit }}</span>
        </div>
        <div v-if="change !== undefined" class="d-flex align-center ga-2 mt-3">
          <v-chip
            data-test="delta"
            size="small"
            variant="tonal"
            :color="deltaUp ? 'success' : 'error'"
          >
            {{ deltaText }}
          </v-chip>
        </div>
      </template>
    </div>
  </v-card>
</template>

<style scoped>
/* DS §2.2: header padding 20px với padding-bottom 0; body padding-top 16px. */
.stat-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 0;
}

.stat-card__body {
  padding: 16px 20px 20px;
}

/* Anti-pattern #1: số KPI phải full opacity, cấm muted-foreground. */
.stat-card__value {
  color: rgb(var(--v-theme-on-surface));
  font-variant-numeric: tabular-nums;
}
</style>
```

```vue
<!-- frontend/src/components/ui/KpiGrid.vue -->
<!--
  Lưới KPI — DS §3.1: 1 cột dưới 600px, 2 cột từ sm, 4 cột từ lg.
  DS cấm quá 5 thẻ trong một lưới (quá tải nhận thức, dòng 1513).
-->
<script setup lang="ts">
import { useSlots, onMounted } from 'vue'

const slots = useSlots()

onMounted(() => {
  const n = slots.default?.().length ?? 0
  if (n > 5)
    console.warn(`[KpiGrid] ${n} thẻ — design system giới hạn 5. Tách 2 hàng hoặc dùng tab.`)
})
</script>

<template>
  <v-row class="kpi-grid">
    <slot />
  </v-row>
</template>

<style scoped>
/* Ép mọi card cùng hàng cao bằng nhau — Dashboard hiện đang lệch. */
.kpi-grid :deep(.v-card) {
  block-size: 100%;
}
</style>
```

Cách dùng ở view (mỗi thẻ tự bọc `v-col` để giữ `cols`/`sm`/`lg`):

```vue
<KpiGrid>
  <v-col cols="12" sm="6" lg="3">
    <StatCard label="Tổng hội thoại" :value="stats.total" :change="stats.delta" />
  </v-col>
</KpiGrid>
```

- [ ] **Step 4: Chạy test và type-check**

Run: `cd frontend && npx vitest run src/components/ui && npx vue-tsc -b`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui
git commit -m "feat(frontend): StatCard và KpiGrid thay 7 khối KPI chép tay"
```

---

## Kiểm tra cuối phase

```bash
cd frontend && npx vue-tsc -b && npx vitest run
```

Không cần `make test-contrast` ở phase này — component mới chưa được view nào
dùng nên chưa xuất hiện trên DOM thật. Phase 2 mới chạy.

**Bàn giao cho Phase 2:** khi cả 5 story merge, mọi chữ ký trong `README.md`
§Contract phải khớp code thật. Có chỗ lệch thì **sửa README trong cùng PR** —
10 story Phase 2 đọc README, không đọc code.
