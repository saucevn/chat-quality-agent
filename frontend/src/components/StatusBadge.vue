<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(defineProps<{ status: string; size?: string; label?: string }>(), {
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

// Token CHỮ đi kèm mỗi màu nền. Bảng ánh xạ ở trên giữ nguyên tên màu (Contract)
// — bảng này chỉ nói "chữ của màu đó lấy token nào".
//
// Vì sao không để chữ dùng luôn chính màu nền như trước: `variant="tonal"` vẽ
// nền bằng CHÍNH màu đó ở opacity 0.12 (xem ghi chú UNDERLAY_OPACITY), nên chữ
// nằm trên một nền gần như `card`. Đo bằng số ở theme light:
//   amber #E17100  → 2.81:1   (Contract yêu cầu 4.5 — quyết định A7)
//   error #E7000B  → 3.85:1
//   success        → 4.53:1   (đạt nhưng sát mép)
// Ba token `*-fg` dưới đây là bản đậm hơn của cùng một hue, và LẬT theo theme
// (tối ở light, sáng ở dark) nên đạt AA ở cả hai. `muted-foreground` vốn đã là
// một token chữ nên dùng chính nó.
//
// CẢNH BÁO: KHÔNG dùng `amber-foreground` ở đây. Nó là chữ đặt trên nền amber
// ĐẶC nên tối (#15151F) ở CẢ HAI theme — trên chip tonal ở dark theme chỉ còn
// 1.13:1. `amber-fg` mới là cặp lật theo theme.
const TEXT_TOKEN: Record<string, string> = {
  amber: 'amber-fg',
  success: 'success-fg',
  error: 'destructive-fg',
  'muted-foreground': 'muted-foreground',
}

// `disabled`/`paused`/`inactive`/`cancelled` dùng CHUNG màu nền
// `muted-foreground` với `pending`/`queued`, nhưng phải mờ hơn để phân biệt hai
// nhóm (Contract). `pending`/`queued` KHÔNG được giảm opacity.
const DIMMED = new Set(['disabled', 'paused', 'inactive', 'cancelled'])

// Vuetify vẽ nền của variant tonal ở lớp RIÊNG `.v-chip__underlay`
// (node_modules/vuetify/lib/components/VChip/VChip.css:310 —
// `background: currentColor; opacity: var(--v-activated-opacity)`), mặc định
// 0.12 (composables/theme.js:47). Đã xác nhận trên DOM đã render, không suy đoán.
const UNDERLAY_OPACITY = 0.12

// Làm mờ CHỈ phần nền, giữ chữ ở full opacity — quyết định của người dùng.
// Cách cũ (`style="opacity: .6"` phủ lên cả chip) làm mờ chữ LẪN nền và kéo
// tương phản xuống ≈2.0:1, ngược đúng lý do tồn tại của quyết định A17
// ("dữ liệu cũ vẫn phải đọc được").
const DIMMED_FACTOR = 0.6

const color = computed(() => COLOR[props.status] ?? 'muted-foreground')
const textToken = computed(() => TEXT_TOKEN[color.value] ?? 'muted-foreground')
const dimmed = computed(() => DIMMED.has(props.status))
const underlayOpacity = computed(() =>
  dimmed.value ? UNDERLAY_OPACITY * DIMMED_FACTOR : UNDERLAY_OPACITY,
)

// Chỉ biến CSS trỏ tới token theme — không hex nào viết tay trong file này.
const chipStyle = computed(() => ({
  '--sb-fg': `rgb(var(--v-theme-${textToken.value}))`,
  '--sb-underlay-opacity': String(underlayOpacity.value),
}))

// Trạng thái lạ (backend thêm mã mới, hoặc gõ sai) KHÔNG được rơi ra chuỗi
// khoá thô `status_xxx` trên giao diện — `t()` của vue-i18n trả về chính khoá
// khi thiếu bản dịch, kèm cảnh báo trong console. `te()` kiểm tra trước, thiếu
// thì hiện nguyên mã trạng thái: xấu nhưng vẫn đọc được.
//
// `label` CHỈ đổi chữ hiển thị — không phải cửa sau cho màu. Có truyền thì
// dùng nguyên văn (view cần nhãn cụ thể hơn khoá i18n chung, vd "Nghiêm
// trọng" thay vì "Lỗi"); không truyền thì giữ nguyên hành vi i18n cũ. Dù
// `label` là gì, `color`/`textToken`/`underlayOpacity` ở trên vẫn tính THẲNG
// từ `props.status` — hai nhánh hoàn toàn tách biệt.
const label = computed(
  () => props.label ?? (te(`status_${props.status}`) ? t(`status_${props.status}`) : props.status),
)

// variant="tonal" không khai lại ở template — đã là default toàn cục của
// VChip (frontend/src/plugins/vuetify.ts). `data-color`, `data-text-token` và
// `data-underlay-opacity` chỉ để test khẳng định hành vi (test tính tương phản
// bằng số phải đọc được ĐÚNG ba giá trị này), không dùng để style.
</script>

<template>
  <v-chip
    :color="color"
    :size="size"
    :data-color="color"
    :data-text-token="textToken"
    :data-underlay-opacity="underlayOpacity"
    :style="chipStyle"
  >
    {{ label }}
  </v-chip>
</template>

<style scoped>
/* Chữ đặt trên `.v-chip__content`, KHÔNG trên `.v-chip`: nền tonal lấy
   `currentColor` của `.v-chip`, nên đổi màu chữ ở thẻ gốc sẽ đổi luôn màu nền
   và chip amber thành chip nâu. Đặt ở phần tử con thì nền giữ nguyên hue. */
.v-chip :deep(.v-chip__content) {
  color: var(--sb-fg);
}

/* Chỉ lớp NỀN bị giảm opacity. Selector này ghi đè
   `.v-chip--variant-tonal .v-chip__underlay` (2 class) vì có thêm attribute
   scope của SFC ⇒ 3 hạng class. */
.v-chip :deep(.v-chip__underlay) {
  opacity: var(--sb-underlay-opacity);
}
</style>
