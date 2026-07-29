<script setup lang="ts">
// DS §2.3/§3.4: label LUÔN nằm TRÊN field ("UX VN quen label trên field"),
// placeholder là ví dụ chứ không phải nhãn. Vuetify mặc định thả nổi label
// vào viền field — trái đặc tả. Vì vậy field đặt trong slot KHÔNG nhận prop
// `label`; truyền `placeholder` thay thế.
// Thứ tự dọc bắt buộc: Label → Field → Helper (luôn hiện khi có) → Error
// (THAY THẾ helper khi có lỗi).
import { computed, useId } from 'vue'

const props = defineProps<{
  label: string
  required?: boolean
  hint?: string
  error?: string
  inputId?: string
}>()

const auto = useId()
const id = computed(() => props.inputId ?? `field-${auto}`)
</script>

<template>
  <div class="form-field">
    <label :for="id" class="text-body-sm">
      {{ label }}<span v-if="required" class="text-error ms-1">*</span>
    </label>
    <slot :id="id" :describedby="error ? `${id}-error` : undefined" />
    <p v-if="error" :id="`${id}-error`" class="text-body-xs text-error">{{ error }}</p>
    <p v-else-if="hint" class="text-body-xs text-medium-emphasis">{{ hint }}</p>
  </div>
</template>

<style scoped>
.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
</style>
