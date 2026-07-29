// Điểm phối hợp dùng chung cho test của mọi component trong `components/ui/`.
// Story 1B/1C/1E import trực tiếp `mountOptions` từ file này — đừng đổi chữ ký.
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createI18n } from 'vue-i18n'
import vi from '../../../i18n/vi'

export function mountOptions() {
  return {
    global: {
      plugins: [
        createVuetify({ components, directives }),
        createI18n({ legacy: false, locale: 'vi', messages: { vi } }),
      ],
    },
  }
}
