<script setup lang="ts">
// Card có tiêu đề/mô tả chuẩn DS §2.2: header padding 20px, padding-bottom 0.
// Khối header dùng chung với DataTable qua CardHeader.vue — xem comment ở đó
// về lý do phải forward slot 'actions' CÓ ĐIỀU KIỆN (`v-if="$slots.actions"`).
import CardHeader from './CardHeader.vue'

defineProps<{ title?: string; subtitle?: string }>()
</script>

<template>
  <v-card>
    <CardHeader :title="title" :subtitle="subtitle">
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
