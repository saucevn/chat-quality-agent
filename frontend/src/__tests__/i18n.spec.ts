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

  it('giữ đúng 275 khoá sau khi tách module', () => {
    // Chốt cứng để việc tách không làm rơi key. Story nào thêm key mới thì
    // cập nhật số này trong cùng commit — đó là điểm reviewer nhìn thấy.
    // 2026-07-29: +8 khoá module format.ts (locale hoá utils/format.ts,
    // vốn khoá cứng tiếng Việt cho dateWithTime/dateRelative/vndShort/pct).
    expect(Object.keys(vi)).toHaveLength(275)
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
})
