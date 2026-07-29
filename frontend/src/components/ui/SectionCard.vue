<script setup lang="ts">
// Card có tiêu đề/mô tả chuẩn DS §2.2: header padding 20px, padding-bottom 0.
// Khối header dùng chung với DataTable qua CardHeader.vue — xem comment ở đó
// về lý do phải forward slot 'actions' CÓ ĐIỀU KIỆN (`v-if="$slots.actions"`).
import CardHeader from './CardHeader.vue'

// `icon`/`iconColor` chỉ chuyển tiếp thẳng xuống CardHeader — xem comment ở
// CardHeader.vue để biết lý do `iconColor` nhận tên token theme thay vì hex.
defineProps<{ title?: string; subtitle?: string; icon?: string; iconColor?: string }>()
</script>

<template>
  <v-card>
    <CardHeader :title="title" :subtitle="subtitle" :icon="icon" :icon-color="iconColor">
      <template v-if="$slots.actions" #actions>
        <slot name="actions" />
      </template>
    </CardHeader>
    <div class="section-card__body">
      <slot />
    </div>
  </v-card>
</template>

<style scoped>
.section-card__body {
  padding: 20px;
}
</style>
