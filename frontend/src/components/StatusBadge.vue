<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(defineProps<{ status: string; size?: string }>(), {
  size: 'small',
})

const { t } = useI18n()

// Đây là NƠI DUY NHẤT ánh xạ trạng thái → màu trong toàn bộ app. View không
// được tự viết <v-chip :color="..."> cho trạng thái — xem README §Contract
// (research/plans/2026-07-29-ui-upgrade/README.md), bảng "Ánh xạ trạng thái
// CQA ↔ màu" (thay từ vựng agent của DS — quyết định A2). Không có nhánh
// 'grey' — màu đó không có trong token.
const COLOR: Record<string, string> = {
  running: 'amber',
  syncing: 'amber',
  success: 'success',
  active: 'success',
  pass: 'success',
  failed: 'error',
  error: 'error',
  pending: 'muted-foreground',
  queued: 'muted-foreground',
  disabled: 'muted-foreground',
  paused: 'muted-foreground',
}

// `disabled`/`paused` dùng CHUNG màu nền `muted-foreground` với
// `pending`/`queued`, nhưng phải mờ hơn để phân biệt hai nhóm (Contract).
// `pending`/`queued` KHÔNG được giảm opacity.
const DIMMED = new Set(['disabled', 'paused'])

const color = computed(() => COLOR[props.status] ?? 'muted-foreground')
const dimmed = computed(() => DIMMED.has(props.status))
const label = computed(() => t(`status_${props.status}`))

// variant="tonal" không khai lại ở template — đã là default toàn cục của
// VChip (frontend/src/plugins/vuetify.ts). data-color chỉ để test khẳng
// định hành vi, không dùng để style.
</script>

<template>
  <v-chip
    :color="color"
    :size="size"
    :data-color="color"
    :style="dimmed ? 'opacity: 0.6' : undefined"
  >
    {{ label }}
  </v-chip>
</template>
