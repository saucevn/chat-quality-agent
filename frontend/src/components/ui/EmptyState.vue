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
