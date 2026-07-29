// File setup chạy trước MỌI test (khai trong `test.setupFiles`, vite.config.ts).
//
// happy-dom (môi trường test) không cài `visualViewport` trên `window`.
// `VOverlay` của Vuetify (dùng bên trong VDialog, VMenu, VTooltip...) đọc
// `window.visualViewport` để tính vị trí/kích thước overlay, và tham chiếu
// biến toàn cục này thẳng chứ không qua optional chaining — thiếu nó gây
// `ReferenceError` trước khi component kịp mount. Bất kỳ test nào mount một
// component dùng VOverlay bên trong (ConfirmDialog và ~10 dialog ở Phase 2)
// đều đụng lỗi này, nên polyfill được đặt ở đây một lần thay vì chép lại
// trong từng file spec.
if (typeof globalThis.visualViewport === 'undefined') {
  // @ts-expect-error -- stub tối thiểu cho môi trường test, không đầy đủ API thật
  globalThis.visualViewport = {
    width: 1024,
    height: 768,
    offsetLeft: 0,
    offsetTop: 0,
    addEventListener: () => {},
    removeEventListener: () => {},
  }
}

// Node 22+ có sẵn `globalThis.localStorage` (Web Storage thử nghiệm) dưới
// dạng accessor (getter/setter), nhưng nó chỉ hoạt động thật khi tiến trình
// chạy với cờ `--localstorage-file` — thiếu cờ đó, MỌI truy cập trả về
// `undefined` kèm một ExperimentalWarning in ra stderr (làm bẩn output test),
// không phải ReferenceError. happy-dom dùng chính `globalThis` làm `window`
// ở môi trường test (`window === globalThis`), nên bị chung vấn đề:
// `window.localStorage` cũng `undefined`. `src/i18n/index.ts` gọi
// `localStorage.getItem('cqa_locale')` ngay ở module scope để khôi phục
// locale đã lưu — bất kỳ test nào import instance i18n đó, trực tiếp hoặc
// gián tiếp qua `utils/format.ts`, đều crash nếu thiếu polyfill này.
//
// Đọc `typeof globalThis.localStorage` để kiểm tra sẽ TỰ kích hoạt getter
// của Node (in ra đúng cái warning ta đang tránh) — nên dùng
// `getOwnPropertyDescriptor` để xem descriptor có phải accessor (`get`) hay
// không mà không gọi nó, rồi ghi đè hẳn bằng `defineProperty` (không đi qua
// setter cũ) bằng một Storage giả tối thiểu, lưu trong bộ nhớ tiến trình.
const localStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
if (!localStorageDescriptor || typeof localStorageDescriptor.get === 'function') {
  const store = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
      setItem: (key: string, value: string) => {
        store.set(key, String(value))
      },
      removeItem: (key: string) => {
        store.delete(key)
      },
      clear: () => {
        store.clear()
      },
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      get length() {
        return store.size
      },
    },
    writable: true,
    configurable: true,
    enumerable: false,
  })
}
