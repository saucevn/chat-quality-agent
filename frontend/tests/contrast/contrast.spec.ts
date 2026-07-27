import { test, expect, type Page } from '@playwright/test'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { auditContrast, type ContrastFinding } from './audit'
import { seedSession, mockApi, TENANT, CHANNEL, JOB, CONV } from './mock-api'

const here = dirname(fileURLToPath(import.meta.url))

/**
 * Baseline = danh sách cặp màu ĐANG hỏng, đã chốt và có commit.
 *
 * Test chỉ đỏ khi xuất hiện cặp MỚI, nhờ vậy gắn được vào CI mà không phải sửa
 * hết các vi phạm sẵn có trước. Mỗi mục ghi rõ tỉ số thật nên không giấu gì —
 * và file này chỉ nên ngắn dần đi.
 *
 * Điểm yếu cần biết: khoá theo cặp (fg, bg, ngưỡng), không theo vị trí. Nên một
 * cặp đã nằm trong baseline mà xuất hiện thêm ở chỗ mới thì test không bắt.
 * Đổi lại, baseline không vỡ mỗi lần sửa chữ hay đổi bố cục.
 *
 * Cập nhật: `npm run contrast:baseline`
 */
interface BaselineEntry {
  fg: string
  bg: string
  required: number
  ratio: number
  note: string
}

const UPDATE = !!process.env.UPDATE_CONTRAST_BASELINE
const FRAGMENTS = resolve(here, '../../test-results/contrast-baseline')

const baseline: BaselineEntry[] = UPDATE
  ? []
  : JSON.parse(readFileSync(resolve(here, 'baseline.json'), 'utf8'))

const key = (f: { fg: string; bg: string; required: number }) => `${f.fg}|${f.bg}|${f.required}`
const known = new Set(baseline.map(key))

/**
 * Mỗi route được dựng thật rồi quét toàn bộ chữ đang hiện.
 *
 * `minNodes` là chốt chống "xanh giả": nếu view hỏng và chỉ dựng ra khung rỗng,
 * số phần tử có chữ sẽ tụt xuống và test báo lỗi, thay vì pass vì chẳng có gì
 * để đo. Con số lấy thấp hơn hẳn thực tế để không vỡ khi thêm bớt nội dung.
 */
const ROUTES: Array<{
  name: string
  path: string
  minNodes: number
  themes?: readonly ('light' | 'dark')[]
}> = [
  { name: 'login', path: '/login', minNodes: 5, themes: ['light'] },
  { name: 'tenants', path: '/', minNodes: 5 },
  { name: 'dashboard', path: `/${TENANT}`, minNodes: 20 },
  { name: 'channels', path: `/${TENANT}/channels`, minNodes: 20 },
  { name: 'channel-detail', path: `/${TENANT}/channels/${CHANNEL}`, minNodes: 20 },
  { name: 'messages', path: `/${TENANT}/messages?conv=${CONV}`, minNodes: 20 },
  { name: 'jobs', path: `/${TENANT}/jobs`, minNodes: 15 },
  { name: 'job-detail', path: `/${TENANT}/jobs/${JOB}`, minNodes: 25 },
  { name: 'job-edit', path: `/${TENANT}/jobs/${JOB}/edit`, minNodes: 15 },
  { name: 'activity-logs', path: `/${TENANT}/activity-logs`, minNodes: 15 },
  { name: 'cost-logs', path: `/${TENANT}/cost-logs`, minNodes: 15 },
  { name: 'notifications', path: `/${TENANT}/notifications`, minNodes: 15 },
  { name: 'mcp', path: `/${TENANT}/mcp`, minNodes: 10 },
  { name: 'users', path: `/${TENANT}/users`, minNodes: 15 },
  { name: 'settings', path: `/${TENANT}/settings`, minNodes: 15 },
]

/**
 * Nút đổi theme chỉ có icon, không có aria-label, nên phải bám vào class icon.
 * Nút này nằm trong DefaultLayout — route dùng layout `auth` (login) không có.
 */
async function switchToDark(page: Page) {
  await page.locator('button:has(.mdi-weather-night)').first().click()
  await page.waitForFunction(() => document.documentElement.classList.contains('dark'))
}

function report(findings: ContrastFinding[]): string {
  return findings
    .map(
      (f) =>
        `  ${f.ratio}:1 (cần ${f.required}:1)  ${f.fg} trên ${f.bg}  ` +
        `${f.fontSize}px/${f.fontWeight}\n` +
        `      ${f.selector}\n      "${f.text}"`,
    )
    .join('\n')
}

for (const route of ROUTES) {
  for (const theme of route.themes ?? (['light', 'dark'] as const)) {
    test(`${route.name} — ${theme} — chữ đạt tương phản AA`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(e.message))

      await seedSession(page)
      await mockApi(page)
      await page.goto(route.path)
      await page.waitForLoadState('networkidle')

      // Tắt mọi transition/animation TRƯỚC khi đổi theme.
      // Không tắt thì phép đo rơi vào giữa lúc màu đang chuyển: baseline sinh ra
      // lệch nhau mỗi lần chạy (đã gặp: một mục 1.58:1 lúc có lúc không, và 3
      // test dark đỏ ngẫu nhiên).
      await page.addStyleTag({
        content: '*,*::before,*::after{transition:none!important;animation:none!important}',
      })

      if (theme === 'dark') await switchToDark(page)

      // Chờ view dựng xong thay vì ngủ một khoảng cố định: chạy song song thì
      // `networkidle` có thể về trước lúc Vue mount xong, và đo sớm sẽ ra 0
      // phần tử — đã gặp đúng lỗi này khi chạy cả bộ.
      await page
        .waitForFunction(
          (min) =>
            Array.from(document.querySelectorAll('body *')).filter((el) =>
              Array.from(el.childNodes).some(
                (n) => n.nodeType === Node.TEXT_NODE && (n.textContent || '').trim(),
              ),
            ).length >= min,
          route.minNodes,
          { timeout: 10_000 },
        )
        // Hết giờ thì vẫn đo tiếp: assertion minNodes bên dưới sẽ báo lỗi kèm
        // số đếm thật, hữu ích hơn là timeout trần của waitForFunction.
        .catch(() => {})

      // Vuetify dựng overlay/underlay sau khi mount; đo sớm sẽ đọc nhầm nền.
      await page.waitForTimeout(200)

      const findings = await page.evaluate(auditContrast)

      expect(errors, `Lỗi JS khi dựng ${route.path}:\n${errors.join('\n')}`).toEqual([])
      expect(
        findings.length,
        `${route.path} chỉ có ${findings.length} phần tử chữ — view nhiều khả năng dựng hỏng, ` +
          `không phải "không có lỗi tương phản".`,
      ).toBeGreaterThanOrEqual(route.minNodes)

      const failures = findings.filter((f) => f.ratio < f.required)

      if (UPDATE) {
        // Mỗi test ghi một file riêng để chạy song song không tranh nhau;
        // scripts/merge-contrast-baseline.mjs gộp lại thành baseline.json.
        mkdirSync(FRAGMENTS, { recursive: true })
        writeFileSync(
          resolve(FRAGMENTS, `${route.name}-${theme}.json`),
          JSON.stringify(
            failures.map((f) => ({ ...f, route: route.name, theme })),
            null,
            2,
          ),
        )
        return
      }

      const regressions = failures.filter((f) => !known.has(key(f)))
      expect(
        regressions,
        `${regressions.length} cặp màu MỚI không đạt AA ở ${route.path} (${theme}).\n` +
          `(${failures.length - regressions.length} cặp khác đã nằm trong baseline.)\n` +
          report(regressions) +
          `\n\nNếu đây là thay đổi có chủ đích: npm run contrast:baseline`,
      ).toEqual([])
    })
  }
}
