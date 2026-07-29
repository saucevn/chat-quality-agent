<!--
  Skeleton khớp hình dạng bảng dữ liệu — DS §3.3. `rows`/`cols` quyết định số
  hàng/cột thật để giữ layout ổn định khi dữ liệu tải xong.
-->
<script setup lang="ts">
import SkeletonBlock from './SkeletonBlock.vue'

withDefaults(defineProps<{ rows?: number; cols: number }>(), { rows: 5 })
</script>

<template>
  <div class="pa-4">
    <div v-for="r in rows" :key="r" data-test="skeleton-row" class="d-flex ga-4 mb-4">
      <div v-for="c in cols" :key="c" data-test="skeleton-cell" class="flex-grow-1">
        <SkeletonBlock height="16px" />
      </div>
    </div>
  </div>
</template>
