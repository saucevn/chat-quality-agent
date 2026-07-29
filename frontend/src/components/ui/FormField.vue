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

// §6.4: `describedby` phải liệt kê id của MỌI phần tử mô tả ĐANG hiển thị.
// Trước đây nó chỉ nối `<p>` lỗi và `<p>` hint không có `id` nào cả, nên
// trình đọc màn hình nghe được lỗi mà không bao giờ nghe được gợi ý.
//
// Chỉ nối id CÓ THẬT trong DOM: lỗi THAY THẾ hint (xem `v-else-if` dưới
// template), nên khi có cả hai thì phần tử hint không tồn tại — nối id của nó
// vào sẽ tạo idref treo, trình đọc màn hình bỏ qua cả chuỗi. Danh sách vẫn
// dựng theo kiểu gộp để nếu sau này hint và lỗi hiện đồng thời thì chỗ này
// không phải sửa lại.
const describedby = computed(() => {
  const ids: string[] = []
  if (props.error) ids.push(`${id.value}-error`)
  else if (props.hint) ids.push(`${id.value}-hint`)
  return ids.length ? ids.join(' ') : undefined
})
</script>

<template>
  <div class="form-field">
    <label :for="id" class="text-body-sm">
      {{ label }}<span v-if="required" class="text-error ms-1">*</span>
    </label>
    <slot :id="id" :describedby="describedby" />
    <p v-if="error" :id="`${id}-error`" class="text-body-xs text-error">{{ error }}</p>
    <p v-else-if="hint" :id="`${id}-hint`" class="text-body-xs text-medium-emphasis">{{ hint }}</p>
  </div>
</template>

<style scoped>
.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
</style>
