<!--
  Trạng thái rỗng / không kết quả / lỗi — DS §3.2.
  Ba yếu tố BẮT BUỘC: icon, tiêu đề, hành động. Tiêu đề không được là "Oops!"
  hay "Không có gì ở đây"; mô tả nên chứa số cụ thể hoặc bước tiếp theo (§5.2).
  Biến thể `error` là một variant của chính component này, không tách riêng.
-->
<script setup lang="ts">
import { computed } from 'vue'

/**
 * Chữ ký prop là UNION có phân biệt (discriminated union), không phải một khối
 * phẳng với `actionLabel?`.
 *
 * Lý do: bảng "Quy tắc 4 trạng thái" (README §Contract) bắt nhánh lỗi phải CÓ
 * nút thử lại và CẤM nuốt lỗi. Với `actionLabel?` optional,
 * `<EmptyState variant="error" title="…" />` — một trạng thái lỗi câm, không lối
 * thoát — vẫn qua `vue-tsc` sạch sẽ. Cùng cơ chế đã dùng cho `emptyTitle` của
 * DataTable: khoá bằng KIỂU, không bằng lời hứa trong tài liệu.
 *
 * Các variant còn lại giữ `actionLabel?` optional: nhánh rỗng được phép chỉ có
 * số cụ thể thay cho CTA (§3.2).
 *
 * KHÔNG bọc `withDefaults` quanh union này: đã đo bằng `vue-tsc`, `withDefaults`
 * làm kiểu prop suy biến thành `{ [x: string]: any }` — mọi ràng buộc kiểu biến
 * mất, kể cả `title` bắt buộc. Mặc định của `variant` vì thế đặt bằng `??` ở
 * `variant` bên dưới.
 */
const props = defineProps<
  | { variant: 'error'; icon?: string; title: string; description?: string; actionLabel: string }
  | {
      variant?: 'first-run' | 'no-data'
      icon?: string
      title: string
      description?: string
      actionLabel?: string
    }
>()

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

const variant = computed(() => props.variant ?? 'first-run')
const resolvedIcon = computed(() => props.icon ?? DEFAULT_ICON[variant.value])
const iconColor = computed(() => ICON_COLOR[variant.value])
// DS §3.2 dòng 1635: error → outlined, còn lại → primary flat
const btnVariant = computed(() => (variant.value === 'error' ? 'outlined' : 'flat'))
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
