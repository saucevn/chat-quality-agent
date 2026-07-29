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

  `icon`/`iconColor` (vá lỗ hổng Contract 3): bản cũ mọi card có icon màu
  trước tiêu đề (mdi-bell-ring màu primary, mdi-currency-usd màu warning,
  mdi-check-circle màu success — ba màu KHÁC NHAU cho ba ngữ cảnh, xem
  Dashboard.vue hiện tại, dòng 126/167/204). Một màu icon cố định không đủ,
  nên `iconColor` nhận TÊN token theme (giống hệt cách `<v-chip color="...">`
  và `<v-icon color="...">` đã dùng khắp app — "primary"/"warning"/"success"
  đều là alias trỏ về token ERP trong plugins/vuetify.ts, KHÔNG phải palette
  Material dựng sẵn của Vuetify như "red-darken-2"). Không truyền `iconColor`
  ⇒ v-icon không nhận `color`, thừa hưởng `currentColor` của ngữ cảnh xung
  quanh — mặc định AN TOÀN, không tự ý tô màu nổi bật khi nơi gọi không yêu
  cầu.
-->
<script setup lang="ts">
defineProps<{ title?: string; subtitle?: string; icon?: string; iconColor?: string }>()
</script>

<template>
  <div v-if="title || $slots.actions" class="card-header">
    <div class="d-flex align-center ga-2">
      <v-icon v-if="icon" :icon="icon" :color="iconColor" />
      <div>
        <h2 v-if="title" class="text-heading-3">{{ title }}</h2>
        <p v-if="subtitle" class="text-body-xs text-medium-emphasis mt-1">{{ subtitle }}</p>
      </div>
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
