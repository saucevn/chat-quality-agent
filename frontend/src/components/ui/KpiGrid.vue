<!--
  Lưới KPI — DS §3.1: 1 cột dưới 600px, 2 cột từ sm, 4 cột từ lg.
  DS cấm quá 5 thẻ trong một lưới (quá tải nhận thức, dòng 1513).
-->
<script setup lang="ts">
import { useSlots, onMounted } from 'vue'

const slots = useSlots()

onMounted(() => {
  const n = slots.default?.().length ?? 0
  if (n > 5)
    console.warn(`[KpiGrid] ${n} thẻ — design system giới hạn 5. Tách 2 hàng hoặc dùng tab.`)
})
</script>

<template>
  <v-row class="kpi-grid">
    <slot />
  </v-row>
</template>

<style scoped>
/* Ép mọi card cùng hàng cao bằng nhau — Dashboard hiện đang lệch. */
.kpi-grid :deep(.v-card) {
  block-size: 100%;
}
</style>
