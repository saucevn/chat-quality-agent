<script setup lang="ts">
// Hộp thoại xác nhận — thay 3 chỗ đang dùng confirm() native tiếng Anh
// (Channels.vue:426, JobList.vue:74, MCPConnections.vue:162).
// Quyết định A13: CHỈ hành động không hoàn tác được mới dùng hộp thoại này;
// hành động hoàn tác được thì cập nhật lạc quan + toast "Hoàn lại" 5s.
// Nhãn nút phải nói rõ hậu quả — "Xoá vĩnh viễn", không phải "Xoá" (DS §5.1).
//
// max-width không khai lại ở template — VDialog đã có default toàn cục
// 420px (frontend/src/plugins/vuetify.ts, quyết định A9).
import { useI18n } from 'vue-i18n'

defineProps<{
  modelValue: boolean
  title: string
  message: string
  confirmLabel: string
  destructive?: boolean
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
}>()

const { t } = useI18n()
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="text-heading-3">{{ title }}</v-card-title>
      <v-card-text class="text-body-sm">{{ message }}</v-card-text>
      <v-card-actions class="justify-end">
        <v-btn variant="text" @click="emit('update:modelValue', false)">
          {{ t('cancel') }}
        </v-btn>
        <v-btn
          data-test="confirm"
          :color="destructive ? 'error' : 'primary'"
          :variant="destructive ? 'text' : 'flat'"
          :loading="loading"
          @click="emit('confirm')"
        >
          {{ confirmLabel }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
