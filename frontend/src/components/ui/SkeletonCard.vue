<!--
  Skeleton khớp hình dạng thẻ nội dung chung (tiêu đề + N dòng văn bản) — DS §3.3.
-->
<script setup lang="ts">
import SkeletonBlock from './SkeletonBlock.vue'

withDefaults(defineProps<{ lines?: number }>(), { lines: 3 })
</script>

<template>
  <v-card>
    <div class="pa-5">
      <SkeletonBlock width="40%" height="16px" class="mb-4" />
      <SkeletonBlock
        v-for="l in lines"
        :key="l"
        data-test="skeleton-line"
        height="12px"
        class="mb-2"
      />
    </div>
  </v-card>
</template>
