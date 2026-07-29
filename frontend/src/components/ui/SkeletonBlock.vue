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
