import { defineConfig, devices } from '@playwright/test'

// Cổng riêng, không đụng 3000 của `make dev` để chạy test không phải tắt server.
const PORT = 5174

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Viewport cao để nhiều nội dung nằm trong layout một lúc; audit không lọc
    // theo chiều dọc nên chiều cao chỉ ảnh hưởng cái gì được dựng, không ảnh
    // hưởng cái gì được đo.
    viewport: { width: 1280, height: 1200 },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Dev server là đủ: CSS token và Vuetify giống hệt bản build, mà không tốn
    // một lượt `vite build` cho mỗi lần chạy test.
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
