// Gộp các fragment do tests/contrast/contrast.spec.ts sinh ra (khi chạy với
// UPDATE_CONTRAST_BASELINE=1) thành tests/contrast/baseline.json.
//
// Mỗi test ghi một file riêng nên chạy song song không tranh nhau; việc gộp và
// khử trùng lặp làm ở đây.
import { readdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const FRAGMENTS = resolve(here, '../test-results/contrast-baseline')
const OUT = resolve(here, '../tests/contrast/baseline.json')

if (!existsSync(FRAGMENTS)) {
  console.error(`Không thấy ${FRAGMENTS}.\nChạy: UPDATE_CONTRAST_BASELINE=1 npx playwright test`)
  process.exit(1)
}

const merged = new Map()
for (const file of readdirSync(FRAGMENTS).filter((f) => f.endsWith('.json'))) {
  for (const f of JSON.parse(readFileSync(resolve(FRAGMENTS, file), 'utf8'))) {
    const key = `${f.fg}|${f.bg}|${f.required}`
    const seen = merged.get(key)
    if (seen) {
      seen.where.add(`${f.route}/${f.theme}`)
      // Giữ tỉ số tệ nhất để baseline mô tả đúng mức xấu nhất đang có.
      seen.ratio = Math.min(seen.ratio, f.ratio)
    } else {
      merged.set(key, {
        fg: f.fg,
        bg: f.bg,
        required: f.required,
        ratio: f.ratio,
        sample: f.text || '',
        where: new Set([`${f.route}/${f.theme}`]),
      })
    }
  }
}

const out = [...merged.values()]
  .sort((a, b) => a.ratio - b.ratio)
  .map(({ fg, bg, required, ratio, sample, where }) => ({
    fg,
    bg,
    required,
    ratio,
    note: `${[...where].sort().join(', ')}${sample ? ` — "${sample}"` : ''}`,
  }))

writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n')
rmSync(FRAGMENTS, { recursive: true, force: true })
console.log(`baseline.json: ${out.length} cặp màu (tệ nhất ${out[0]?.ratio}:1)`)
