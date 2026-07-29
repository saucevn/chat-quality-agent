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
  <!--
    `persistent` khi đang loading: không có nó thì ESC hoặc click ra ngoài đóng
    được hộp thoại NGAY TRONG LÚC lệnh xoá đang bay — người dùng mất phản hồi
    về việc mình vừa kích hoạt một hành động không hoàn tác được.
  -->
  <v-dialog
    :model-value="modelValue"
    :persistent="loading"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="text-heading-3">{{ title }}</v-card-title>
      <v-card-text class="text-body-sm">{{ message }}</v-card-text>
      <v-card-actions class="justify-end">
        <v-btn variant="text" @click="emit('update:modelValue', false)">
          {{ t('cancel') }}
        </v-btn>
        <!--
          variant LUÔN 'flat', không phân nhánh theo `destructive`. Nút Huỷ đã
          là variant 'text'; cho nút xác nhận destructive cũng 'text' thì hộp
          thoại nguy hiểm nhất app lại là hộp thoại duy nhất KHÔNG có nút chính
          — hai nút cùng trọng lượng thị giác. spec-section2-components.md:768
          quy định nút phải là variant destructive, và §2.1 định nghĩa variant
          đó là nền `--destructive` ĐẶC. Chỉ `color` đổi theo destructive.
        -->
        <v-btn
          data-test="confirm"
          :color="destructive ? 'error' : 'primary'"
          variant="flat"
          :loading="loading"
          @click="emit('confirm')"
        >
          {{ confirmLabel }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
