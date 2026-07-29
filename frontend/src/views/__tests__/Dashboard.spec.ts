import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import vuetify from '../../plugins/vuetify'
import viMessages from '../../i18n/vi'
import Dashboard from '../Dashboard.vue'
import api from '../../api'

// vue-chartjs dựng canvas thật qua chart.js — happy-dom không có canvas 2D
// context đầy đủ nên chỉ cần một stub tối thiểu để mount không vỡ. Test này
// khẳng định hành vi Dashboard.vue (trạng thái tải/lỗi/rỗng/dữ liệu), không
// khẳng định chart.js vẽ đúng — việc đó không thuộc phạm vi story.
vi.mock('vue-chartjs', () => ({
  Line: { template: '<canvas data-test="chart" />', props: ['data', 'options'] },
}))

const push = vi.fn()
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { tenantId: 'tenant-1' } }),
  useRouter: () => ({ push }),
}))

vi.mock('../../api', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}))

function mountDashboard(options: { attachToBody?: boolean } = {}) {
  return mount(Dashboard, {
    // VDialog (dùng trong ConfirmDialog) teleport nội dung ra <body> — phải
    // attachTo document.body thì wrapper.text()/document mới thấy được nó.
    ...(options.attachToBody ? { attachTo: document.body } : {}),
    global: {
      plugins: [vuetify, createI18n({ legacy: false, locale: 'vi', messages: { vi: viMessages } })],
    },
  })
}

const FULL_DATA = {
  total_conversations: 1284,
  issues_today: 3,
  active_jobs: 2,
  active_channels: 4,
  cost_today: 0.42,
  cost_this_month: 12.5,
  exchange_rate: 26000,
  cost_by_day: [
    { date: '2026-03-21', input_tokens: 1000, output_tokens: 500, total_cost: 0.1 },
    { date: '2026-03-20', input_tokens: 800, output_tokens: 400, total_cost: 0.08 },
  ],
  qc_alerts: [
    {
      id: 'a1',
      conversation_id: 'c1',
      severity: 'NGHIEM_TRONG',
      evidence: 'Nhân viên trả lời sai giá',
      created_at: '2026-03-21T10:00:00Z',
    },
    {
      id: 'a2',
      conversation_id: 'c2',
      severity: 'CAN_CAI_THIEN',
      evidence: 'Phản hồi chậm',
      created_at: '2026-03-21T09:00:00Z',
    },
  ],
  classification_recent: [],
  messages_by_day: [{ date: '2026-03-21', count: 10, chat_count: 5, reply_count: 5 }],
  conversations_by_channel: [{ channel_type: 'zalo_oa', count: 7 }],
}

const EMPTY_DATA = {
  total_conversations: 0,
  issues_today: 0,
  active_jobs: 0,
  active_channels: 0,
  cost_today: 0,
  cost_this_month: 0,
  exchange_rate: 26000,
  cost_by_day: [],
  qc_alerts: [],
  classification_recent: [],
  messages_by_day: [],
  conversations_by_channel: [],
}

function mockGet(dashboardResolver: () => Promise<{ data: unknown }>) {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url.includes('/demo/status')) return Promise.resolve({ data: { has_data: true, is_demo: false } })
    if (url.includes('/dashboard')) return dashboardResolver()
    return Promise.reject(new Error(`unexpected GET ${url}`))
  })
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset()
    vi.mocked(api.post).mockReset()
    vi.mocked(api.delete).mockReset()
    push.mockReset()
    // happy-dom không cài sẵn window.alert — gán trực tiếp một hàm ném lỗi để
    // bất kỳ chỗ nào trong component còn gọi alert() sẽ làm test tự sập.
    window.alert = vi.fn(() => {
      throw new Error('alert() không được gọi — phải dùng ConfirmDialog/snackbar')
    })
  })

  it('trạng thái tải: dùng SkeletonKpi, KHÔNG dùng spinner giữa màn (anti-pattern #7)', async () => {
    mockGet(() => new Promise(() => {})) // không bao giờ resolve — giữ nguyên trạng thái loading
    const w = mountDashboard()
    await flushPromises()
    expect(w.find('[data-test="skeleton-kpi-card"]').exists()).toBe(true)
    expect(w.find('.v-progress-circular').exists()).toBe(false)
  })

  it('trạng thái lỗi: hiện EmptyState variant=error có nút thử lại, KHÔNG hiện số 0 giả (bug #3)', async () => {
    mockGet(() => Promise.reject({ response: { data: { code: 'system.internal' } } }))
    const w = mountDashboard()
    await flushPromises()

    expect(w.text()).toContain('Không tải được dữ liệu')
    const retryBtn = w.findAll('button').find((b) => b.text().includes('Tải lại'))
    expect(retryBtn).toBeTruthy()
    expect(w.find('[data-test="value"]').exists()).toBe(false) // không có StatCard nào render số 0 giả

    // Bấm thử lại phải gọi lại API, không nuốt lỗi câm lặng
    vi.mocked(api.get).mockClear()
    mockGet(() => Promise.resolve({ data: FULL_DATA }))
    await retryBtn!.trigger('click')
    await flushPromises()
    expect(w.text()).toContain('1.284') // total_conversations đã format qua vnd/formatNumber, xem test số bên dưới
  })

  it('có dữ liệu: KPI hiện đúng số, chi phí format qua vnd() (₫, dấu chấm phân cách nghìn)', async () => {
    mockGet(() => Promise.resolve({ data: FULL_DATA }))
    const w = mountDashboard()
    await flushPromises()

    const values = w.findAll('[data-test="value"]').map((n) => n.text())
    expect(values).toContain('1.284')
    expect(values).toContain('3')

    // costToday = 0.42 * 26000 = 10920 -> "10.920 ₫" qua vnd()
    expect(w.text()).toContain('10.920')
    expect(w.text()).toContain('₫')
  })

  it('chip mức độ QC severity dùng StatusBadge, không tự chế v-chip (Ba lỗi lặp lại — mẫu c)', async () => {
    mockGet(() => Promise.resolve({ data: FULL_DATA }))
    const w = mountDashboard()
    await flushPromises()

    // Khẳng định qua data-color do StatusBadge tự gắn — NGHIEM_TRONG -> error, còn lại -> warning
    expect(w.html()).toContain('data-color="error"')
    expect(w.html()).toContain('data-color="amber"')
  })

  it('rỗng: recent activity + biểu đồ dùng EmptyState (variant no-data), không phải một dòng "Không có dữ liệu" suông', async () => {
    mockGet(() => Promise.resolve({ data: EMPTY_DATA }))
    const w = mountDashboard()
    await flushPromises()

    // EmptyState luôn có icon + title + mô tả — không phải một <span> đơn lẻ
    const empties = w.findAll('.empty-state')
    expect(empties.length).toBeGreaterThan(0)
    for (const e of empties) {
      expect(e.find('.v-icon').exists()).toBe(true)
    }
  })

  it('import demo lỗi: KHÔNG gọi alert(), hiện snackbar qua t(errorKey(e))', async () => {
    mockGet(() => Promise.resolve({ data: { ...EMPTY_DATA } }))
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/demo/status')) return Promise.resolve({ data: { has_data: false, is_demo: false } })
      return Promise.resolve({ data: EMPTY_DATA })
    })
    vi.mocked(api.post).mockRejectedValue({ response: { data: { code: 'system.internal' } } })

    const w = mountDashboard()
    await flushPromises()

    const importBtn = w.findAll('button').find((b) => b.text().includes('Nhập dữ liệu demo'))
    expect(importBtn).toBeTruthy()
    await importBtn!.trigger('click')
    await flushPromises()

    // window.alert đã được mock để throw nếu gọi — nếu code còn alert() thì test này tự crash
    expect(w.findComponent({ name: 'VSnackbar' }).exists() || w.html().includes('v-snackbar')).toBeTruthy()
  })

  it('xoá dữ liệu demo dùng ConfirmDialog destructive, không dùng confirm() native', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/demo/status')) return Promise.resolve({ data: { has_data: true, is_demo: true } })
      return Promise.resolve({ data: FULL_DATA })
    })
    const w = mountDashboard({ attachToBody: true })
    await flushPromises()

    const openBtn = w.findAll('button').find((b) => b.text().includes('Xoá dữ liệu demo'))
    expect(openBtn).toBeTruthy()
    await openBtn!.trigger('click')
    await flushPromises()

    expect(document.body.textContent).toContain('Xoá vĩnh viễn dữ liệu demo')
    w.unmount()
  })

  it('bảng chi phí theo ngày dùng DataTable — không còn cắt cứng .slice(0,7) (bug #7)', async () => {
    const manyDays = Array.from({ length: 10 }, (_, i) => ({
      date: `2026-03-${10 + i}`,
      input_tokens: 100,
      output_tokens: 50,
      total_cost: 0.01,
    }))
    mockGet(() => Promise.resolve({ data: { ...FULL_DATA, cost_by_day: manyDays } }))
    const w = mountDashboard()
    await flushPromises()

    // DataTable client-side tự phân trang (itemsPerPage mặc định 20) — cả 10 dòng phải có mặt trong DOM/items,
    // không bị cắt còn 7 như v-table cũ.
    expect(w.findAll('tbody tr').length).toBe(10)
  })
})
