<!--
  Khớp hình dạng thẻ KPI thật (DS §2.2 dòng 846–868): nhãn nhỏ trên, số lớn
  giữa, delta dưới. Bộ số 60%/40% theo DS §3.3 — quyết định A16 (§2.9 có bộ
  số khác, không dùng).
-->
<script setup lang="ts">
import SkeletonBlock from './SkeletonBlock.vue'

withDefaults(defineProps<{ count?: number }>(), { count: 4 })
</script>

<template>
  <v-row>
    <v-col v-for="i in count" :key="i" cols="12" sm="6" lg="3">
      <v-card data-test="skeleton-kpi-card">
        <div class="pa-5">
          <SkeletonBlock width="50%" height="12px" class="mb-4" />
          <SkeletonBlock width="60%" height="30px" class="mb-3" />
          <SkeletonBlock width="40%" height="12px" />
        </div>
      </v-card>
    </v-col>
  </v-row>
</template>
