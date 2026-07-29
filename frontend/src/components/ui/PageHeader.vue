<script setup lang="ts">
// Tiêu đề trang + hành động. Trước đợt này mỗi view tự dựng bằng
// div.text-subtitle-1 — class đó là no-op trong Vuetify 4 (xem
// phase-0-foundation.md §"252 class typography đang là no-op").
defineProps<{
  title: string
  subtitle?: string
  breadcrumbs?: { title: string; to?: string }[]
}>()
</script>

<template>
  <div class="mb-6">
    <v-breadcrumbs v-if="breadcrumbs?.length" :items="breadcrumbs" class="pa-0 mb-2" />
    <div class="d-flex align-center justify-space-between ga-4 flex-wrap">
      <div>
        <h1 class="text-heading-1">{{ title }}</h1>
        <p v-if="subtitle" class="text-body-sm text-medium-emphasis mt-1">{{ subtitle }}</p>
      </div>
      <div class="d-flex align-center ga-2">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>
