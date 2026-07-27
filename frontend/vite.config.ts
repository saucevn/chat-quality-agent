// defineConfig lấy từ 'vitest/config' (bản re-export của Vite, có thêm kiểu cho
// khoá `test`) để cấu hình vitest ngay tại đây.
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'

export default defineConfig({
  plugins: [
    vue(),
    vuetify({ autoImport: true }),
  ],
  test: {
    // Chỉ nhặt unit test trong src/. Thư mục tests/ là của Playwright: mặc định
    // vitest quét cả *.spec.ts ở đó rồi vỡ với "Playwright Test did not expect
    // test() to be called here."
    include: ['src/**/*.spec.ts'],
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
