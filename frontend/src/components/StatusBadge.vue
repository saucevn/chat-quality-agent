<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(defineProps<{ status: string; size?: string }>(), {
  size: 'small',
})

const { t, te } = useI18n()

// Đây là NƠI DUY NHẤT ánh xạ trạng thái → màu trong toàn bộ app. View không
// được tự viết <v-chip :color="..."> cho trạng thái — xem README §Contract
// (research/plans/2026-07-29-ui-upgrade/README.md), bảng "Ánh xạ trạng thái
// CQA ↔ màu" (thay từ vựng agent của DS — quyết định A2). Không có nhánh
// 'grey' — màu đó không có trong token.
const COLOR: Record<string, string> = {
  running: 'amber',
  syncing: 'amber',
  // `warning` (11 chỗ trong frontend) và `partial` (backend agents.go:185 —
  // một phần thành công) cùng nhóm "cần chú ý nhưng chưa hỏng" ⇒ amber.
  warning: 'amber',
  partial: 'amber',
  success: 'success',
  active: 'success',
  pass: 'success',
  // `sent` (thông báo đã gửi đi) là kết cục tốt ⇒ cùng nhóm success.
  sent: 'success',
  failed: 'error',
  error: 'error',
  pending: 'muted-foreground',
  queued: 'muted-foreground',
  disabled: 'muted-foreground',
  paused: 'muted-foreground',
  // `inactive` (kênh ngừng hoạt động) và `cancelled` (job bị huỷ,
  // backend jobs.go:386) cùng nhóm "đã dừng có chủ ý" với disabled/paused.
  inactive: 'muted-foreground',
  cancelled: 'muted-foreground',
}

// `disabled`/`paused`/`inactive`/`cancelled` dùng CHUNG màu nền
// `muted-foreground` với `pending`/`queued`, nhưng phải mờ hơn để phân biệt hai
// nhóm (Contract). `pending`/`queued` KHÔNG được giảm opacity.
const DIMMED = new Set(['disabled', 'paused', 'inactive', 'cancelled'])

const color = computed(() => COLOR[props.status] ?? 'muted-foreground')
const dimmed = computed(() => DIMMED.has(props.status))
// Trạng thái lạ (backend thêm mã mới, hoặc gõ sai) KHÔNG được rơi ra chuỗi
// khoá thô `status_xxx` trên giao diện — `t()` của vue-i18n trả về chính khoá
// khi thiếu bản dịch, kèm cảnh báo trong console. `te()` kiểm tra trước, thiếu
// thì hiện nguyên mã trạng thái: xấu nhưng vẫn đọc được.
const label = computed(() => (te(`status_${props.status}`) ? t(`status_${props.status}`) : props.status))

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
