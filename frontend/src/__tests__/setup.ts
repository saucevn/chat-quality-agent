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
