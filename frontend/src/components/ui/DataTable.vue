<!--
  Bảng dữ liệu chuẩn — bọc v-data-table và ÉP xử lý đủ 4 trạng thái
  (tải / lỗi / rỗng / có dữ liệu) theo README §"Quy tắc 4 trạng thái".
  Trước đợt này repo dùng v-table thô 14 chỗ: không sort, không phân trang,
  và phần lớn không có trạng thái nào.

  Ba slot theo Contract (research/plans/2026-07-29-ui-upgrade/README.md):
  - 'toolbar'      → dải công cụ phía trên bảng (đã có số đo riêng B4).
  - 'bulk-actions' → dải thao tác hàng loạt, render CÓ ĐIỀU KIỆN như toolbar
                     (ẩn hoàn toàn khi không truyền) — DataTable không tự quản
                     lý trạng thái chọn dòng, việc đó thuộc về nơi dùng.
  - 'item.<key>'   → tuỳ biến từng ô, chuyển tiếp thẳng vào v-data-table.

  Lưu ý: vòng lặp chuyển tiếp `v-for="(_, name) in $slots"` KHÔNG bao gồm
  'toolbar' và 'bulk-actions' — hai slot đó đã được render riêng ở trên,
  đưa lại vào trong sẽ bị lặp và không đúng chỗ (v-data-table không hiểu
  slot 'toolbar'/'bulk-actions').
-->
<script setup lang="ts">
import { computed, useSlots } from 'vue'
import { useI18n } from 'vue-i18n'
import { VDataTable, VDataTableServer } from 'vuetify/components'
import EmptyState from './EmptyState.vue'
import SkeletonTable from './SkeletonTable.vue'

// Mọi attr không khai báo (show-select, item-value, density, hover…) phải rơi
// xuống bảng, KHÔNG dính lên <v-card> gốc. Trước đây `inheritAttrs` để mặc
// định nên `<DataTable show-select item-value="id">` đặt hai attr đó lên
// v-card một cách im lặng: bảng không có ô chọn, và slot 'bulk-actions' không
// bao giờ có gì để thao tác (component cố ý không tự quản lý selection).
defineOptions({ inheritAttrs: false })

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
    // BẮT BUỘC, không có mặc định `t('no_data')`. Quy tắc 4 trạng thái cấm
    // nhánh rỗng chỉ có một dòng "Không có dữ liệu" — có mặc định thì 14 bảng
    // Phase 2 sẽ hợp lệ về type mà vẫn vi phạm quy tắc. Bắt buộc mới ép được.
    emptyTitle: string
    emptyDescription?: string
    // Nhánh rỗng phải có CTA hoặc số cụ thể (§3.2). Đây là CTA.
    emptyActionLabel?: string
  }>(),
  { loading: false, error: false, page: 1, itemsPerPage: 20 },
)

const emit = defineEmits<{
  'update:page': [value: number]
  'update:itemsPerPage': [value: number]
  retry: []
  'empty-action': []
}>()

const { t } = useI18n()

const slots = useSlots()

// Slot chuyển tiếp vào v-data-table: mọi slot NGOẠI TRỪ 'toolbar' và
// 'bulk-actions' — hai slot đó đã được render riêng ở ngoài v-data-table
// (khối phía trên), đưa lại vào trong v-data-table lần nữa là thừa vì
// v-data-table không hiểu hai tên slot đó.
const forwardedSlotNames = computed(() =>
  Object.keys(slots).filter((name) => name !== 'toolbar' && name !== 'bulk-actions'),
)

// `items-length` KHÔNG phải prop của VDataTable — `makeVDataTableProps`
// (node_modules/vuetify/lib/components/VDataTable/VDataTable.js) không có nó,
// và dòng ~146 tự tính `itemsLength = items.length`. Nó CHỈ tồn tại trên
// VDataTableServer. Truyền vào VDataTable là hỏng im lặng: view khai
// totalItems=500 với 20 dòng vẫn thấy footer báo 1 trang và 'update:page'
// không bao giờ phát.
//
// Chọn phân nhánh (thay vì "luôn dùng bản server") vì VDataTableServer KHÔNG
// tự phân trang/sắp xếp phía client: chuyển hết sang nó thì mọi bảng không
// truyền totalItems — ca phổ biến nhất ở Phase 2 — sẽ mất phân trang và sort,
// đổi một lỗi im lặng lấy một lỗi im lặng khác. Có totalItems là tuyên bố
// "server phân trang"; không có là "client tự lo".
const serverSide = computed(() => props.totalItems !== undefined)
const tableComponent = computed(() => (serverSide.value ? VDataTableServer : VDataTable))
</script>

<template>
  <v-card>
    <div v-if="$slots.toolbar" class="data-table__toolbar">
      <slot name="toolbar" />
    </div>

    <div v-if="$slots['bulk-actions']" class="data-table__bulk-actions">
      <slot name="bulk-actions" />
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
      :title="props.emptyTitle"
      :description="props.emptyDescription"
      :action-label="props.emptyActionLabel"
      @action="emit('empty-action')"
    />

    <component
      :is="tableComponent"
      v-else
      v-bind="$attrs"
      :headers="headers"
      :items="items"
      :page="page"
      :items-per-page="itemsPerPage"
      :items-length="serverSide ? totalItems : undefined"
      @update:page="emit('update:page', $event)"
      @update:items-per-page="emit('update:itemsPerPage', $event)"
    >
      <template v-for="name in forwardedSlotNames" #[name]="slotProps" :key="name">
        <slot :name="name" v-bind="slotProps ?? {}" />
      </template>
    </component>
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

/* §3.6.B: dải thao tác hàng loạt, nền primary-mist báo hiệu "đang ở chế độ
   chọn". Repo không có token --primary-mist riêng nên dùng primary với độ
   mờ thấp qua biến Vuetify sẵn có, tránh hard-code hex. */
.data-table__bulk-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-block: 10px;
  padding-inline: 16px;
  background-color: rgba(var(--v-theme-primary), 0.08);
  border-block-end: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
