// defineConfig lấy từ 'vitest/config' (bản re-export của Vite, có thêm kiểu cho
// khoá `test`) để cấu hình vitest ngay tại đây.
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'

export default defineConfig({
  plugins: [
    vue(),
    vuetify({
      autoImport: true,
      // Biên dịch lại SCSS của từng component Vuetify với biến của ERP design
      // system. Bỏ dòng styles này là mọi số đo trong vuetify-settings.scss
      // mất tác dụng — Vuetify quay về dùng CSS dựng sẵn.
      styles: { configFile: 'src/design/vuetify-settings.scss' },
    }),
  ],
  test: {
    // Chỉ nhặt unit test trong src/. Thư mục tests/ là của Playwright: mặc định
    // vitest quét cả *.spec.ts ở đó rồi vỡ với "Playwright Test did not expect
    // test() to be called here."
    include: ['src/**/*.spec.ts'],
    // Component test (Phase 1 UI) cần DOM thật để @vue/test-utils mount được.
    environment: 'happy-dom',
    // Vitest mặc định externalize gói trong node_modules và dùng loader ESM
    // gốc của Node để import chúng — loader đó không hiểu file .css mà
    // vuetify/components import kèm theo mỗi component. Bắt vitest transform
    // vuetify qua pipeline của Vite (như lúc build thật) để .css được xử lý.
    server: {
      deps: {
        inline: ['vuetify'],
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/oauth': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/mcp': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
