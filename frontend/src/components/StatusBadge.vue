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
  pending: 'medium-emphasis',
  queued: 'medium-emphasis',
  disabled: 'medium-emphasis',
  paused: 'medium-emphasis',
}

const color = computed(() => COLOR[props.status] ?? 'medium-emphasis')
const label = computed(() => t(`status_${props.status}`))

// variant="tonal" không khai lại ở template — đã là default toàn cục của
// VChip (frontend/src/plugins/vuetify.ts). data-color chỉ để test khẳng
// định hành vi, không dùng để style.
</script>

<template>
  <v-chip :color="color" :size="size" :data-color="color">
    {{ label }}
  </v-chip>
</template>
