import { describe, it, expect } from 'vitest'
import vi from '../i18n/vi'
import en from '../i18n/en'

describe('i18n', () => {
  it('vi và en có cùng tập khoá', () => {
    expect(Object.keys(vi).sort()).toEqual(Object.keys(en).sort())
  })

  it('không khoá nào rỗng', () => {
    for (const [k, v] of Object.entries(vi)) expect(v, `vi.${k} rỗng`).toBeTruthy()
    for (const [k, v] of Object.entries(en)) expect(v, `en.${k} rỗng`).toBeTruthy()
  })

  it('không khoá nào bị khai trùng ở hai module', () => {
    // Object spread nuốt trùng lặp im lặng; test này bắt nó.
    const files = import.meta.glob('../i18n/vi/*.ts', { eager: true }) as Record<
      string,
      { default: Record<string, string> }
    >
    const seen = new Map<string, string>()
    const dupes: string[] = []
    for (const [path, mod] of Object.entries(files)) {
      if (path.endsWith('/index.ts')) continue
      for (const k of Object.keys(mod.default)) {
        if (seen.has(k)) dupes.push(`${k}: ${seen.get(k)} và ${path}`)
        seen.set(k, path)
      }
    }
    expect(dupes, `khoá trùng:\n${dupes.join('\n')}`).toEqual([])
  })

  // Trước đây có ca đếm cứng "toHaveLength(275)" để canh việc tách vi.ts/en.ts
  // (mỗi file 288 dòng, phẳng) thành module theo domain ở Phase 0.4 — việc
  // tách đó đã xong. Giữ số đếm cứng lại thì Phase 2 (10 story chạy song
  // song, mỗi story thêm khoá vào module riêng) sẽ khiến cả 10 story cùng
  // phải sửa đúng một dòng số đếm ⇒ xung đột merge liên tục. Đổi ca đó
  // thành kiểm cấu trúc bên dưới: không phụ thuộc số lượng khoá, nhưng vẫn
  // bắt đúng rủi ro mà số đếm cứng từng canh — thêm module mới mà quên
  // import + spread vào index.ts thì khoá của module đó im lặng biến mất,
  // và ba ca phía trên không phát hiện được (vi/en vẫn cân bằng vì cùng
  // thiếu, không rỗng vì không tồn tại để kiểm, không trùng vì không có ở
  // đâu cả). Đừng thêm lại số đếm cứng "cho chặt".
  it('mọi module vi/* đều được index.ts spread vào', () => {
    const files = import.meta.glob('../i18n/vi/*.ts', { eager: true }) as Record<
      string,
      { default: Record<string, string> }
    >
    const merged = new Set(Object.keys(vi))
    const missing: string[] = []
    for (const [path, mod] of Object.entries(files)) {
      if (path.endsWith('/index.ts')) continue
      for (const k of Object.keys(mod.default)) {
        if (!merged.has(k)) missing.push(`${k} (từ ${path})`)
      }
    }
    expect(missing, `module có khoá không lọt vào vi/index.ts:\n${missing.join('\n')}`).toEqual([])
  })

  it('mọi module en/* đều được index.ts spread vào', () => {
    const files = import.meta.glob('../i18n/en/*.ts', { eager: true }) as Record<
      string,
      { default: Record<string, string> }
    >
    const merged = new Set(Object.keys(en))
    const missing: string[] = []
    for (const [path, mod] of Object.entries(files)) {
      if (path.endsWith('/index.ts')) continue
      for (const k of Object.keys(mod.default)) {
        if (!merged.has(k)) missing.push(`${k} (từ ${path})`)
      }
    }
    expect(missing, `module có khoá không lọt vào en/index.ts:\n${missing.join('\n')}`).toEqual([])
  })
})
