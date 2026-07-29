// Điểm phối hợp dùng chung cho test của mọi component trong `components/ui/`.
// Story 1B/1C/1E import trực tiếp `mountOptions` từ file này — đừng đổi chữ ký.
//
// Dùng THẲNG plugin thật (`src/plugins/vuetify.ts`), không dựng lại
// `createVuetify()` rỗng. Lý do đã kiểm chứng:
//
//   1. `node_modules/vuetify/lib/composables/color.js` (`computeColor`) đẩy
//      thẳng `text-${color}` vào class khi chuỗi màu không phải CSS color, KHÔNG
//      đối chiếu theme. Vuetify rỗng ⇒ mọi khẳng định về class màu đều xanh kể
//      cả với tên màu bịa ⇒ test vô giá trị. Có theme thật thì Vuetify mới sinh
//      biến `--v-theme-*` tương ứng và test mới nói lên điều gì đó.
//   2. Component dựa vào `defaults` toàn cục (VChip variant 'tonal',
//      VDialog maxWidth 420, VCard elevation 1) và cố ý KHÔNG khai lại ở
//      template. Vuetify rỗng ⇒ test chạy trên một cấu hình không tồn tại thật.
//
// Không cần truyền `components`/`directives`: `vite-plugin-vuetify` đang bật
// `autoImport` (vite.config.ts) nên component được nạp lúc biên dịch template.
import { createI18n } from 'vue-i18n'
import vuetify from '../../../plugins/vuetify'
import vi from '../../../i18n/vi'

export function mountOptions() {
  return {
    global: {
      plugins: [vuetify, createI18n({ legacy: false, locale: 'vi', messages: { vi } })],
    },
  }
}
