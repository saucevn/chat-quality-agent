/**
 * Chặn toàn bộ HTTP của SPA và trả dữ liệu giả.
 *
 * Mục tiêu là dựng được trang THẬT (router thật, layout thật, component thật)
 * mà không cần backend + MySQL. Dữ liệu ở đây cố ý phủ hết các nhánh rẽ màu:
 * mỗi trường quyết định màu (`status`, `severity`, `channel_type`, `is_active`,
 * `score`...) đều có đủ giá trị để mọi nhánh cùng hiện trên một trang.
 *
 * Toàn bộ là dữ liệu bịa. Không lấy gì từ DB thật.
 */
import type { Page } from '@playwright/test'

export const TENANT = 't-demo'
export const CHANNEL = 'c-demo'
export const JOB = 'j-demo'
export const CONV = 'cv-demo'

const iso = (d: string) => `2026-07-${d}T08:30:00Z`

/** Kênh: phủ 3 channel_type, cả active/inactive, cả 3 trạng thái sync. */
const channels = [
  {
    id: CHANNEL, tenant_id: TENANT, channel_type: 'pancake', name: 'Kênh Shopee demo',
    external_id: 'spo_1', is_active: true, metadata: '{"sync_files":true,"sync_interval":15}',
    last_sync_at: iso('20'), last_sync_attempt_at: iso('20'), last_sync_status: 'success',
    conversation_count: 17, created_at: iso('01'),
  },
  {
    id: 'c-zalo', tenant_id: TENANT, channel_type: 'zalo_oa', name: 'Kênh Zalo demo',
    external_id: 'zl_1', is_active: false, metadata: '{"sync_files":false,"sync_interval":30}',
    last_sync_at: null, last_sync_attempt_at: iso('19'), last_sync_status: 'error',
    conversation_count: 0, created_at: iso('02'),
  },
  {
    id: 'c-fb', tenant_id: TENANT, channel_type: 'facebook', name: 'Kênh Facebook demo',
    external_id: '123', is_active: true, metadata: '{"sync_files":false,"sync_interval":15}',
    last_sync_at: iso('18'), last_sync_attempt_at: iso('18'), last_sync_status: '',
    conversation_count: 42, created_at: iso('03'),
  },
]

/** JobResult: phủ PASS/FAIL/SKIP, 3 mức điểm, 2 mức severity, 5 nhãn phân loại. */
const jobResults = [
  {
    id: 'r1', job_run_id: 'run1', result_type: 'conversation_evaluation', conversation_id: CONV,
    customer_name: 'Khách A', conversation_date: iso('20'), severity: 'PASS', rule_name: 'Tổng quan',
    evidence: 'Nhân viên chào hỏi và xử lý đúng quy trình.',
    detail: '{"score":92,"verdict":"PASS","summary":"Hội thoại đạt yêu cầu."}', created_at: iso('20'),
  },
  {
    id: 'r2', job_run_id: 'run1', result_type: 'conversation_evaluation', conversation_id: 'cv-2',
    customer_name: 'Khách B', conversation_date: iso('20'), severity: 'FAIL', rule_name: 'Tổng quan',
    evidence: 'Bỏ lỡ câu hỏi của khách trong 2 giờ.',
    detail: '{"score":61,"verdict":"FAIL","summary":"Cần cải thiện thời gian phản hồi."}', created_at: iso('20'),
  },
  {
    id: 'r3', job_run_id: 'run1', result_type: 'conversation_evaluation', conversation_id: 'cv-3',
    customer_name: 'Khách C', conversation_date: iso('20'), severity: 'SKIP', rule_name: 'Tổng quan',
    evidence: 'Hội thoại quá ngắn để chấm.',
    detail: '{"score":38,"verdict":"SKIP","summary":"Bỏ qua."}', created_at: iso('20'),
  },
  {
    id: 'r4', job_run_id: 'run1', result_type: 'violation', conversation_id: 'cv-2',
    customer_name: 'Khách B', conversation_date: iso('20'), severity: 'NGHIEM_TRONG',
    rule_name: 'Thái độ', evidence: 'Trả lời cộc lốc.', detail: '{}', created_at: iso('20'),
  },
  {
    id: 'r5', job_run_id: 'run1', result_type: 'violation', conversation_id: 'cv-2',
    customer_name: 'Khách B', conversation_date: iso('20'), severity: 'CAN_CAI_THIEN',
    rule_name: 'Thời gian phản hồi', evidence: 'Chậm 2 giờ.', detail: '{}', created_at: iso('20'),
  },
  // 5 nhãn phân biệt để chạm hết chart-1..chart-5
  ...['Hỏi giá', 'Khiếu nại', 'Đổi trả', 'Vận chuyển', 'Tư vấn'].map((tag, i) => ({
    id: `t${i}`, job_run_id: 'run1', result_type: 'classification_tag', conversation_id: `cv-${i}`,
    customer_name: `Khách ${i}`, conversation_date: iso('20'), severity: '', rule_name: tag,
    evidence: `Ví dụ cho nhãn ${tag}.`, detail: '{}', created_at: iso('20'),
  })),
]

const job = {
  id: JOB, tenant_id: TENANT, name: 'Chấm chất lượng hằng ngày',
  description: 'Job demo dùng cho test tương phản.', job_type: 'qc_analysis', is_active: true,
  input_channel_ids: JSON.stringify([CHANNEL]), rules_config: '{"rules":[]}', outputs: '[]',
  schedule_cron: '0 8 * * *', last_run_at: iso('20'), last_run_status: 'success',
  created_at: iso('01'), updated_at: iso('20'),
}

const settings = {
  settings: {
    ai_provider: 'claude', ai_model: 'claude-sonnet-5', ai_api_key: '',
    telegram_bot_token: '', telegram_chat_id: '', smtp_host: '', smtp_port: '587',
    smtp_user: '', smtp_password: '', smtp_from: '',
  },
  tenant: { name: 'Công ty demo', timezone: 'Asia/Ho_Chi_Minh', language: 'vi' },
}

/** Bảng định tuyến: regex trên pathname -> body JSON. Thứ tự có ý nghĩa. */
const ROUTES: Array<[RegExp, unknown]> = [
  [/\/setup\/status$/, { needs_setup: false }],
  [/\/profile$/, { id: 'u1', email: 'demo@example.com', name: 'Người dùng demo', is_admin: true, language: 'vi' }],
  [/\/version\/check$/, {
    current: 'v1.0.0', latest: 'v1.1.0', has_update: true,
    release_url: 'https://example.com', release_notes: 'Ghi chú phát hành demo.',
  }],
  [/\/tenants$/, [{ id: TENANT, name: 'Công ty demo', slug: 'demo', channels_count: 3, jobs_count: 2 }]],
  [/\/tenants\/[^/]+\/onboarding-status$/, {
    dismissed: false,
    steps: [
      { key: 'channel', title: 'Kết nối kênh chat', done: true, link: `/${TENANT}/channels` },
      { key: 'job', title: 'Tạo job chấm điểm', done: false, link: `/${TENANT}/jobs` },
    ],
  }],
  [/\/tenants\/[^/]+\/me$/, { role: 'owner', permissions: '{"channels":"rw","messages":"rw","jobs":"rw","settings":"rw"}' }],
  [/\/tenants\/[^/]+\/demo\/status$/, { has_data: true, is_demo: true }],
  [/\/tenants\/[^/]+\/dashboard/, {
    total_conversations: 128, issues_today: 3, active_jobs: 2, active_channels: 2,
    cost_today: 0.42, cost_this_month: 8.15, exchange_rate: 26000,
    cost_by_day: [{ date: '2026-07-20', total_cost: 0.42, input_tokens: 1200, output_tokens: 800, call_count: 4 }],
    messages_by_day: [{ date: '2026-07-20', count: 40, chat_count: 22, reply_count: 18 }],
    conversations_by_channel: [
      { channel_type: 'pancake', count: 17 }, { channel_type: 'facebook', count: 42 }, { channel_type: 'zalo_oa', count: 9 },
    ],
    qc_alerts: jobResults.filter((r) => r.result_type === 'violation'),
    classification_recent: jobResults.filter((r) => r.result_type === 'classification_tag').slice(0, 3),
  }],
  [/\/tenants\/[^/]+\/channels\/[^/]+\/sync-history/, {
    data: [
      { id: 'a1', action: 'sync.completed', detail: 'Đồng bộ 17 hội thoại.', error_message: '', created_at: iso('20') },
      { id: 'a2', action: 'sync.failed', detail: 'Token hết hạn.', error_message: 'Invalid access_token', created_at: iso('19') },
    ], total: 2, page: 1, per_page: 10,
  }],
  [/\/tenants\/[^/]+\/channels\/[^/]+$/, channels[0]],
  [/\/tenants\/[^/]+\/channels$/, channels],
  [/\/tenants\/[^/]+\/conversations\/evaluated$/, { [CONV]: 'PASS', 'cv-2': 'FAIL' }],
  [/\/tenants\/[^/]+\/conversations\/[^/]+\/messages$/, {
    conversation: { id: CONV, customer_name: 'Khách A', message_count: 3 },
    messages: [
      { id: 'm1', sender_type: 'customer', sender_name: 'Khách A', content: 'Shop ơi còn hàng không ạ?', content_type: 'text', attachments: '[]', sent_at: iso('20') },
      { id: 'm2', sender_type: 'agent', sender_name: 'Nhân viên', content: 'Dạ còn ạ, bên em giao trong 2 ngày.', content_type: 'text', attachments: '[]', sent_at: iso('20') },
      { id: 'm3', sender_type: 'system', sender_name: '', content: 'Ngọc Mai đã tham gia cuộc trò chuyện.', content_type: 'text', attachments: '[]', sent_at: iso('20') },
    ],
  }],
  [/\/tenants\/[^/]+\/conversations\/[^/]+\/evaluations$/, {
    has_evaluation: true,
    groups: [{ job_run_id: 'run1', job_name: job.name, job_type: 'qc_analysis', evaluated_at: iso('20'), results: jobResults }],
  }],
  [/\/tenants\/[^/]+\/conversations/, {
    data: [
      { id: CONV, channel_id: CHANNEL, channel_name: channels[0].name, channel_type: 'pancake', customer_name: 'Khách A', last_message_at: iso('20'), message_count: 8, created_at: iso('19') },
      { id: 'cv-2', channel_id: 'c-fb', channel_name: channels[2].name, channel_type: 'facebook', customer_name: 'Khách B', last_message_at: iso('20'), message_count: 3, created_at: iso('19') },
      { id: 'cv-3', channel_id: 'c-zalo', channel_name: channels[1].name, channel_type: 'zalo_oa', customer_name: 'Khách C', last_message_at: iso('19'), message_count: 1, created_at: iso('18') },
    ], total: 3, page: 1, per_page: 9,
  }],
  [/\/tenants\/[^/]+\/jobs\/[^/]+\/runs$/, [
    { id: 'run1', job_id: JOB, started_at: iso('20'), finished_at: iso('20'), status: 'success', summary: '{"conversations_found":12,"conversations_done":12}', error_message: '' },
    { id: 'run2', job_id: JOB, started_at: iso('19'), finished_at: iso('19'), status: 'error', summary: '{}', error_message: 'Hết hạn mức API.' },
    { id: 'run3', job_id: JOB, started_at: iso('18'), finished_at: null, status: 'cancelled', summary: '{}', error_message: '' },
  ]],
  [/\/tenants\/[^/]+\/jobs\/[^/]+\/results$/, jobResults],
  [/\/tenants\/[^/]+\/jobs\/[^/]+$/, job],
  [/\/tenants\/[^/]+\/jobs$/, [
    job,
    { ...job, id: 'j-2', name: 'Phân loại hội thoại', job_type: 'classification', is_active: false, last_run_status: 'error' },
  ]],
  [/\/tenants\/[^/]+\/activity-logs/, {
    data: [
      { id: 'l1', action: 'ai.error', user_email: 'demo@example.com', detail: 'Gọi AI thất bại.', error_message: 'rate limited', created_at: iso('20') },
      { id: 'l2', action: 'job.delete', user_email: 'demo@example.com', detail: 'Xoá job cũ.', error_message: '', created_at: iso('20') },
      { id: 'l3', action: 'job.create', user_email: 'demo@example.com', detail: 'Tạo job mới.', error_message: '', created_at: iso('19') },
      { id: 'l4', action: 'job.run', user_email: 'demo@example.com', detail: 'Chạy job.', error_message: '', created_at: iso('19') },
    ], total: 4, page: 1, per_page: 20,
  }],
  [/\/tenants\/[^/]+\/cost-logs/, {
    data: [
      { id: 'k1', provider: 'claude', model: 'claude-sonnet-5', input_tokens: 1200, output_tokens: 800, cost_usd: 0.031, created_at: iso('20') },
      { id: 'k2', provider: 'gemini', model: 'gemini-2.5-pro', input_tokens: 900, output_tokens: 400, cost_usd: 0.008, created_at: iso('19') },
    ], total: 2, exchange_rate: 26000,
  }],
  [/\/tenants\/[^/]+\/notification-logs/, {
    data: [
      { id: 'n1', channel_type: 'telegram', recipient: '@demo', subject: 'Cảnh báo QC', body: 'Có 3 hội thoại cần xem.', status: 'sent', error_message: '', sent_at: iso('20') },
      { id: 'n2', channel_type: 'email', recipient: 'demo@example.com', subject: 'Báo cáo ngày', body: 'Đính kèm báo cáo.', status: 'error', error_message: 'SMTP timeout', sent_at: iso('19') },
    ], total: 2,
  }],
  [/\/tenants\/[^/]+\/users$/, [
    { user_id: 'u1', email: 'demo@example.com', name: 'Người dùng demo', role: 'owner', permissions: '{}' },
    { user_id: 'u2', email: 'nv@example.com', name: 'Nhân viên', role: 'member', permissions: '{"messages":"r"}' },
  ]],
  [/\/tenants\/[^/]+\/settings$/, settings],
  [/\/mcp\/clients$/, [
    { id: 'mc1', client_id: 'cid-1', name: 'Claude Desktop', redirect_uris: '["https://example.com/cb"]', scopes: '["read"]', created_at: iso('10') },
  ]],
  [/\/tenants\/[^/]+$/, { id: TENANT, name: 'Công ty demo', slug: 'demo' }],
]

/**
 * Seed localStorage TRƯỚC khi app khởi động.
 *
 * Không có token thì router guard đá về /login và mọi route tenant không dựng
 * được. `cqa_dismissed_version` cố ý bỏ trống để banner cập nhật cũng được đo.
 */
export async function seedSession(page: Page) {
  await page.addInitScript(
    ([tenant]) => {
      localStorage.setItem('cqa_access_token', 'test-token')
      localStorage.setItem('cqa_current_tenant', tenant)
    },
    [TENANT],
  )
}

export async function mockApi(page: Page) {
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    for (const [re, body] of ROUTES) {
      if (re.test(path)) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
        return
      }
    }
    // Trả 200 rỗng thay vì để request rơi ra ngoài: một 401 sẽ kích hoạt
    // interceptor refresh rồi `window.location.href = '/login'`, làm hỏng phép đo.
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })
}
