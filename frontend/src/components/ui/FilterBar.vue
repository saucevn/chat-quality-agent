<!--
  Hàng bộ lọc — DS §3.5. Đặc tả gốc để 4 chiều cao control khác nhau trên
  cùng một hàng (input 36 / select 32 / button 30 / chip 28); quyết định B9
  thống nhất TẤT CẢ về 36px.

  Contract (research/plans/2026-07-29-ui-upgrade/README.md) khai
  `modelValue: Record<string, unknown>` — đối tượng trạng thái bộ lọc hiện
  tại, do nơi dùng sở hữu và truyền vào để các control trong slot mặc định
  đọc/ghi qua v-model của chính chúng. FilterBar chỉ là khung bố cục + ép
  chiều cao 36px, không tự diễn giải nội dung modelValue.

  Expose qua slot props (`:filters`), KHÔNG qua emit — Contract không khai
  emit nào cho component này. FilterBar vẫn chỉ là container trình bày;
  control bên trong slot tự v-model vào state của view, filters ở đây chỉ để
  đọc lại (vd. hiển thị số lượng filter đang bật) mà không cần view truyền
  lại modelValue một lần nữa qua props riêng.
-->
<script setup lang="ts">
defineProps<{ modelValue: Record<string, unknown> }>()
</script>

<template>
  <div class="filter-bar">
    <slot :filters="modelValue" />
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
