<!--
  Header dùng chung cho "card có tiêu đề" — trước đây SectionCard.vue tự
  dựng khối này, DataTable.vue định dựng lại y hệt (chép nguyên khối markup
  ra hai chỗ). Tách riêng để cả hai cùng dùng.

  Component NỘI BỘ — Phase 2 không import trực tiếp, chỉ SectionCard và
  DataTable dùng.

  Tự quyết định có render hay không (title HOẶC slot 'actions'), KHÔNG dựa
  vào nơi gọi tự bọc `v-if`. Vì vậy nơi gọi PHẢI forward slot 'actions' có
  điều kiện — `<template v-if="$slots.actions" #actions>` — chứ không phải
  luôn luôn `<template #actions>`. Nếu luôn luôn forward, CardHeader nhận một
  slot function không rỗng bất kể nơi dùng CardHeader có thực sự truyền nội
  dung actions hay không ($slots.actions trong Vue chỉ hỏi "có block này được
  khai không", không hỏi "bên trong có nội dung"), nên `title || $slots.actions`
  bên dưới sẽ luôn đúng và card không có title vẫn hiện header trống.
-->
<script setup lang="ts">
defineProps<{ title?: string; subtitle?: string }>()
</script>

<template>
  <div v-if="title || $slots.actions" class="card-header">
    <div>
      <h2 v-if="title" class="text-heading-3">{{ title }}</h2>
      <p v-if="subtitle" class="text-body-xs text-medium-emphasis mt-1">{{ subtitle }}</p>
    </div>
    <div class="d-flex align-center ga-2">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 20px 0;
}
</style>
