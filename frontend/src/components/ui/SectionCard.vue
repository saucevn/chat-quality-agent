<script setup lang="ts">
// Card có tiêu đề/mô tả chuẩn DS §2.2: header padding 20px, padding-bottom 0.
defineProps<{ title?: string; subtitle?: string }>()
</script>

<template>
  <v-card>
    <div v-if="title || $slots.actions" class="section-card__header">
      <div>
        <h2 v-if="title" class="text-heading-3">{{ title }}</h2>
        <p v-if="subtitle" class="text-body-xs text-medium-emphasis mt-1">{{ subtitle }}</p>
      </div>
      <div class="d-flex align-center ga-2">
        <slot name="actions" />
      </div>
    </div>
    <div class="section-card__body">
      <slot />
    </div>
  </v-card>
</template>

<style scoped>
.section-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 20px 0;
}

.section-card__body {
  padding: 20px;
}
</style>
