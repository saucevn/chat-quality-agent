<template>
  <div>
    <PageHeader :title="t('dashboard')">
      <template #actions>
        <v-chip-group v-model="datePreset">
          <v-chip
            v-for="p in datePresets"
            :key="p.value"
            :value="p.value"
            size="small"
            variant="outlined"
            @click="applyPreset(p.value)"
          >
            {{ t(p.labelKey) }}
          </v-chip>
        </v-chip-group>
        <v-text-field
          v-model="dateFrom"
          type="date"
          density="compact"
          hide-details
          style="max-width: 160px"
          @change="loadDashboard"
        />
        <v-text-field
          v-model="dateTo"
          type="date"
          density="compact"
          hide-details
          style="max-width: 160px"
          @change="loadDashboard"
        />
      </template>
    </PageHeader>

    <!-- Banner nhập dữ liệu demo -->
    <v-alert v-if="demoStatus && !demoStatus.has_data" type="info" variant="tonal" class="mb-6" prominent>
      <div>
        <div class="text-body-base font-weight-bold mb-1">{{ t('demo_import_title') }}</div>
        <div class="text-body-sm mb-3">{{ t('demo_import_desc') }}</div>
        <v-btn color="primary" variant="flat" :loading="importingDemo" @click="importDemo">
          <v-icon start>mdi-database-import</v-icon>
          {{ t('import_demo_data') }}
        </v-btn>
      </div>
    </v-alert>

    <!-- Banner xoá dữ liệu demo -->
    <v-alert v-if="demoStatus && demoStatus.is_demo" type="warning" variant="tonal" class="mb-6" density="compact">
      <div class="d-flex align-center flex-wrap ga-2">
        <v-icon size="small">mdi-information</v-icon>
        <span class="text-body-sm flex-grow-1">{{ t('demo_active_desc') }}</span>
        <v-btn color="error" variant="text" size="small" @click="resetDialog = true">
          <v-icon start size="small">mdi-delete</v-icon>
          {{ t('reset_demo_data') }}
        </v-btn>
      </div>
    </v-alert>

    <ConfirmDialog
      v-model="resetDialog"
      :title="t('reset_demo_dialog_title')"
      :message="t('reset_demo_dialog_message')"
      :confirm-label="t('reset_demo_confirm_label')"
      destructive
      :loading="resettingDemo"
      @confirm="resetDemo"
    />

    <template v-if="loading">
      <SkeletonKpi :count="4" class="mb-6" />
      <SkeletonKpi :count="4" class="mb-6" />
      <v-row class="mb-6">
        <v-col cols="12" md="7"><SkeletonCard :lines="5" /></v-col>
        <v-col cols="12" md="5">
          <SkeletonCard :lines="2" class="mb-6" />
          <SkeletonCard :lines="3" />
        </v-col>
      </v-row>
      <v-row class="mb-6">
        <v-col cols="12" md="6"><SkeletonCard :lines="4" /></v-col>
        <v-col cols="12" md="6"><SkeletonCard :lines="4" /></v-col>
      </v-row>
    </template>

    <EmptyState
      v-else-if="loadError"
      variant="error"
      class="mb-6"
      :title="t('error_load_failed_title')"
      :description="t('error_load_failed_desc')"
      :action-label="t('retry')"
      @action="loadDashboard"
    />

    <template v-else>
      <!-- KPI tổng quan -->
      <KpiGrid class="mb-6">
        <StatCard v-for="stat in stats" :key="stat.label" :label="t(stat.label)" :value="count(stat.value)" :icon="stat.icon" />
      </KpiGrid>

      <!-- KPI theo kênh + tổng hợp -->
      <KpiGrid class="mb-6">
        <StatCard
          v-for="ch in channelCounts"
          :key="ch.channel_type"
          :label="channelLabel(ch.channel_type)"
          :value="count(ch.count)"
          :icon="channelIcon(ch.channel_type)"
        />
        <StatCard :label="t('total_messages')" :value="count(totalMessages)" icon="mdi-email-multiple" />
        <StatCard :label="t('ai_cost')" :value="vnd(Math.round(costToday * exchangeRate))" icon="mdi-currency-usd" />
      </KpiGrid>

      <v-row class="mb-6">
        <!-- Hoạt động gần đây -->
        <v-col cols="12" md="7">
          <SectionCard :title="t('recent_activity')">
            <div v-if="recentActivity.length">
              <div
                v-for="item in recentActivity"
                :key="item.id"
                class="activity-row"
                :class="item._type === 'qc' ? 'activity-row--qc' : 'activity-row--class'"
                @click="goToConversation(item.conversation_id, item._type === 'qc' ? 'evaluation' : 'classification')"
              >
                <template v-if="item._type === 'qc'">
                  <StatusBadge :status="item.severity === 'NGHIEM_TRONG' ? 'error' : 'warning'" class="mr-2 flex-shrink-0" />
                  <span class="text-body-sm flex-grow-1 activity-row__text">{{ item.evidence || item.rule_name }}</span>
                </template>
                <template v-else>
                  <span class="text-body-sm font-weight-medium mr-2 flex-shrink-0">{{ item.customer_name || '—' }}</span>
                  <span class="text-body-xs text-medium-emphasis mr-2 flex-shrink-0">{{ t('classification_label') }}:</span>
                  <v-chip size="x-small" color="primary" variant="tonal" class="mr-1 flex-shrink-0">{{ item.rule_name }}</v-chip>
                </template>
                <v-spacer />
                <span class="text-body-xs text-medium-emphasis text-no-wrap ml-2">{{ dateRelative(item.created_at) }}</span>
              </div>
            </div>
            <EmptyState
              v-else
              variant="no-data"
              :title="t('empty_no_data_title')"
              :description="t('empty_no_data_desc')"
            />
          </SectionCard>
        </v-col>

        <!-- Chi phí AI + trạng thái dịch vụ -->
        <v-col cols="12" md="5">
          <SectionCard :title="t('ai_cost')" class="mb-6">
            <div class="d-flex ga-6">
              <div>
                <div class="text-body-xs text-medium-emphasis">{{ t('cost_today') }}</div>
                <div class="text-heading-3">{{ vnd(Math.round(costToday * exchangeRate)) }}</div>
              </div>
              <div>
                <div class="text-body-xs text-medium-emphasis">{{ t('cost_this_month') }}</div>
                <div class="text-heading-3">{{ vnd(Math.round(costMonth * exchangeRate)) }}</div>
              </div>
            </div>
          </SectionCard>

          <SectionCard :title="t('service_status')">
            <v-list density="compact">
              <v-list-item v-for="svc in services" :key="svc.nameKey" class="px-0">
                <v-list-item-title class="text-body-sm">{{ t(svc.nameKey) }}</v-list-item-title>
                <template #append>
                  <StatusBadge :status="svc.ok ? 'active' : 'failed'" />
                </template>
              </v-list-item>
            </v-list>
          </SectionCard>
        </v-col>
      </v-row>

      <!-- Biểu đồ -->
      <v-row class="mb-6">
        <v-col cols="12" md="6">
          <SectionCard :title="t('messages_by_day')">
            <Line v-if="messagesChartData.labels.length" :data="messagesChartData" :options="chartOptions" style="max-height: 250px" />
            <EmptyState v-else variant="no-data" :title="t('empty_no_data_title')" :description="t('empty_no_data_desc')" />
          </SectionCard>
        </v-col>
        <v-col cols="12" md="6">
          <SectionCard :title="t('cost_by_day_chart')">
            <Line v-if="costChartData.labels.length" :data="costChartData" :options="chartOptionsNoLegend" style="max-height: 250px" />
            <EmptyState v-else variant="no-data" :title="t('empty_no_data_title')" :description="t('empty_no_data_desc')" />
          </SectionCard>
        </v-col>
      </v-row>
    </template>

    <!-- Bảng chi phí theo ngày.
         Bug review 2A: trước đây DataTable nằm NGOÀI khối v-if/v-else-if/v-else
         nên luôn render, kể cả khi loadError=true — và DataTable tự vẽ nhánh
         lỗi nội bộ bằng ĐÚNG BA khoá i18n giống EmptyState cấp trang phía
         trên (error_load_failed_title/desc, retry). Kết quả: hai khối "Không
         tải được dữ liệu", hai nút "Thử lại" cùng gọi loadDashboard.
         Gate bằng v-if="!loadError" — trang chỉ dùng MỘT loadError chung cho
         cả trang nên chỉ cần MỘT khối lỗi (khối cấp trang ở trên). Không còn
         truyền :error/@retry vì trong nhánh này error luôn là false; DataTable
         vẫn giữ nguyên khả năng tự báo lỗi riêng (props error/retry chưa bị
         xoá khỏi component) — nếu sau này bảng cần trạng thái lỗi RIÊNG (phần
         còn lại của trang vẫn ổn), thêm một ref lỗi riêng cho bảng và bind lại
         :error/@retry lúc đó, đừng dùng chung loadError của trang nữa. -->
    <DataTable
      v-if="!loadError"
      :headers="costHeaders"
      :items="costRows"
      :loading="loading"
      :title="t('cost_by_day_table')"
      :empty-title="t('empty_no_data_title')"
      :empty-description="t('empty_no_data_desc')"
    />

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">{{ snackbar.text }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useTheme } from 'vuetify'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler, Legend } from 'chart.js'
import api from '../api'
import { chartTokens } from '../design/chart-tokens'
import { vnd, count, dateTable, dateRelative } from '../utils/format'
import { errorKey } from '../utils/errors'
import PageHeader from '../components/ui/PageHeader.vue'
import SectionCard from '../components/ui/SectionCard.vue'
import KpiGrid from '../components/ui/KpiGrid.vue'
import StatCard from '../components/ui/StatCard.vue'
import DataTable from '../components/ui/DataTable.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import SkeletonKpi from '../components/ui/SkeletonKpi.vue'
import SkeletonCard from '../components/ui/SkeletonCard.vue'
import ConfirmDialog from '../components/ui/ConfirmDialog.vue'
import StatusBadge from '../components/StatusBadge.vue'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler, Legend)

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const theme = useTheme()
const tenantId = computed(() => route.params.tenantId as string)


function channelLabel(type: string) {
  if (type === 'pancake') return t('channel_pancake')
  if (type === 'facebook') return t('channel_facebook')
  return t('channel_zalo')
}
function channelIcon(type: string) {
  if (type === 'pancake') return 'mdi-storefront'
  if (type === 'facebook') return 'mdi-facebook-messenger'
  return 'mdi-chat'
}

const stats = ref([
  { label: 'total_conversations', value: 0 as number, icon: 'mdi-message-text' },
  { label: 'issues_today', value: 0 as number, icon: 'mdi-alert-circle' },
  { label: 'active_jobs', value: 0 as number, icon: 'mdi-briefcase-check' },
  { label: 'active_channels', value: 0 as number, icon: 'mdi-connection' },
])

interface QcAlert {
  id: string
  conversation_id: string
  severity: string
  evidence?: string
  rule_name?: string
  created_at: string
}
interface ClassRecent {
  id: string
  conversation_id: string
  customer_name?: string
  rule_name: string
  created_at: string
}

const qcAlerts = ref<QcAlert[]>([])
const classRecent = ref<ClassRecent[]>([])

const recentActivity = computed(() => {
  const qc = qcAlerts.value.map((a) => ({ ...a, _type: 'qc' as const }))
  const cls = classRecent.value.map((a) => ({ ...a, _type: 'class' as const }))
  return [...qc, ...cls]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10)
})

const costToday = ref(0)
const costMonth = ref(0)
interface CostByDay { date: string; input_tokens: number; output_tokens: number; total_cost: number }
const costByDay = ref<CostByDay[]>([])
const exchangeRate = ref(26000)
const services = ref([
  { nameKey: 'service_api_server', ok: true },
  { nameKey: 'service_database', ok: true },
  { nameKey: 'service_scheduler', ok: true },
])
interface MessagesByDay { date: string; count: number; chat_count?: number; reply_count?: number }
const messagesByDay = ref<MessagesByDay[]>([])
interface ChannelCount { channel_type: string; count: number }
const channelCounts = ref<ChannelCount[]>([])
const totalMessages = computed(() => messagesByDay.value.reduce((sum, d) => sum + (d.count || 0), 0))

// Bảng chi phí theo ngày — DataTable (bug #7): không còn cắt cứng .slice(0,7),
// phân trang phía client do component tự lo (không truyền totalItems).
const costHeaders = computed(() => [
  { title: t('date'), key: 'date' },
  { title: t('tokens'), key: 'tokens', align: 'end' as const },
  { title: t('cost'), key: 'cost', align: 'end' as const },
])
const costRows = computed(() =>
  costByDay.value.map((d) => ({
    date: dateTable(d.date),
    tokens: count(d.input_tokens + d.output_tokens),
    cost: vnd(Math.round(d.total_cost * exchangeRate.value)),
  })),
)

// Date filter + presets
const now = new Date()
const dateFrom = ref(formatDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 28)))
const dateTo = ref(formatDate(now))
const datePreset = ref('28days')

const datePresets = [
  { labelKey: 'date_today', value: 'today' },
  { labelKey: 'date_7days', value: '7days' },
  { labelKey: 'date_28days', value: '28days' },
  { labelKey: 'date_month', value: 'month' },
  { labelKey: 'date_quarter', value: 'quarter' },
  { labelKey: 'date_year', value: 'year' },
]

function formatDate(d: Date) {
  return d.toISOString().split('T')[0]
}

function applyPreset(preset: string) {
  const d = new Date()
  const y = d.getFullYear()
  const m = d.getMonth()
  dateTo.value = formatDate(d)

  switch (preset) {
    case 'today':
      dateFrom.value = formatDate(new Date(y, m, d.getDate()))
      break
    case '7days':
      dateFrom.value = formatDate(new Date(y, m, d.getDate() - 7))
      break
    case '28days':
      dateFrom.value = formatDate(new Date(y, m, d.getDate() - 28))
      break
    case 'month':
      dateFrom.value = formatDate(new Date(y, m, 1))
      break
    case 'quarter': {
      const qm = Math.floor(m / 3) * 3
      dateFrom.value = formatDate(new Date(y, qm, 1))
      break
    }
    case 'year':
      dateFrom.value = formatDate(new Date(y, 0, 1))
      break
  }
  loadDashboard()
}

// TẠM THỜI cục bộ (review 2A, mục 6 checklist — CHƯA ĐẠT theo nghĩa đen vì
// hàm này nằm ở đây thay vì utils/format.ts). Nhãn trục ngày của biểu đồ —
// chỉ số, không có phần chữ đổi theo ngôn ngữ, nên không khớp bất kỳ hàm nào
// trong Contract hiện có (dateTable/dateWithTime/dateRelative, cả ba đều in
// kèm năm hoặc chữ, không khớp nhãn trục "d/M" ngắn cần cho biểu đồ). PHẢI
// chuyển sang utils/format.ts ngay khi hàm cho nhãn trục biểu đồ được thêm
// vào đó — đừng chép nguyên mẫu cục bộ này sang view khác.
function formatChartDate(dateStr: string) {
  if (!dateStr) return ''
  const parts = dateStr.split('T')[0].split('-')
  if (parts.length === 3) return `${parseInt(parts[2])}/${parseInt(parts[1])}`
  return dateStr
}

// Thêm alpha vào giá trị token màu (dạng "oklch(L C H)" từ chartTokens(), xem
// src/design/tokens.css) bằng cú pháp slash CSS color — không dựng lại rgba()
// cứng như bản cũ (bug #6), và không sửa chart-tokens.ts (sở hữu Phase 0).
function withAlpha(color: string, alphaPercent: number): string {
  return color.replace(/\)\s*$/, ` / ${alphaPercent}%)`)
}

const messagesChartData = computed(() => {
  // Phụ thuộc theme để biểu đồ vẽ lại khi đổi light/dark (chart.js cần chuỗi màu đã tính, không nhận biến CSS)
  void theme.global.name.value
  const ct = chartTokens()
  return {
    labels: messagesByDay.value.map((d) => formatChartDate(d.date)),
    datasets: [
      {
        label: t('total_messages'),
        data: messagesByDay.value.map((d) => d.count),
        borderColor: ct.c1,
        backgroundColor: withAlpha(ct.c1, 10),
        fill: false,
        tension: 0.3,
      },
      {
        label: t('chart_chat_count'),
        data: messagesByDay.value.map((d) => d.chat_count || 0),
        borderColor: ct.c4,
        fill: false,
        tension: 0.3,
      },
      {
        label: t('chart_reply_count'),
        data: messagesByDay.value.map((d) => d.reply_count || 0),
        borderColor: ct.c2,
        fill: false,
        tension: 0.3,
      },
    ],
  }
})

const costChartData = computed(() => {
  void theme.global.name.value
  const ct = chartTokens()
  return {
    labels: [...costByDay.value].reverse().map((d) => formatChartDate(d.date)),
    datasets: [
      {
        label: t('cost'),
        data: [...costByDay.value].reverse().map((d) => Math.round(d.total_cost * exchangeRate.value)),
        borderColor: ct.c2,
        backgroundColor: withAlpha(ct.c2, 10),
        fill: true,
        tension: 0.3,
      },
    ],
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: true, position: 'bottom' as const } },
  scales: { y: { beginAtZero: true } },
}

const chartOptionsNoLegend = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: true } },
}

const snackbar = ref<{ show: boolean; text: string; color: string }>({ show: false, text: '', color: 'error' })
function showError(e: unknown) {
  snackbar.value = { show: true, text: t(errorKey(e)), color: 'error' }
}

const loading = ref(true)
const loadError = ref(false)

async function loadDashboard() {
  loading.value = true
  loadError.value = false
  try {
    const params: Record<string, string> = {}
    if (dateFrom.value) params.from = dateFrom.value
    if (dateTo.value) params.to = dateTo.value

    const { data } = await api.get(`/tenants/${tenantId.value}/dashboard`, { params })
    stats.value[0].value = data.total_conversations
    stats.value[1].value = data.issues_today
    stats.value[2].value = data.active_jobs
    stats.value[3].value = data.active_channels

    costToday.value = data.cost_today || 0
    costMonth.value = data.cost_this_month || 0
    costByDay.value = data.cost_by_day || []
    exchangeRate.value = data.exchange_rate || 26000

    qcAlerts.value = data.qc_alerts || []
    classRecent.value = data.classification_recent || []
    messagesByDay.value = data.messages_by_day || []
    channelCounts.value = data.conversations_by_channel || []
  } catch (e) {
    loadError.value = true
    showError(e)
  } finally {
    loading.value = false
  }
}

// Trạng thái dữ liệu demo
const demoStatus = ref<{ has_data: boolean; is_demo: boolean } | null>(null)
const importingDemo = ref(false)
const resettingDemo = ref(false)
const resetDialog = ref(false)

async function loadDemoStatus() {
  try {
    const { data } = await api.get(`/tenants/${tenantId.value}/demo/status`)
    demoStatus.value = data
  } catch (e) {
    showError(e)
  }
}

async function importDemo() {
  importingDemo.value = true
  try {
    await api.post(`/tenants/${tenantId.value}/demo/import`)
    await loadDemoStatus()
    await loadDashboard()
  } catch (e) {
    showError(e)
  } finally {
    importingDemo.value = false
  }
}

async function resetDemo() {
  resettingDemo.value = true
  try {
    await api.delete(`/tenants/${tenantId.value}/demo/reset`)
    resetDialog.value = false
    await loadDemoStatus()
    await loadDashboard()
  } catch (e) {
    showError(e)
  } finally {
    resettingDemo.value = false
  }
}

onMounted(() => {
  loadDemoStatus()
  loadDashboard()
})

function goToConversation(convId: string, tab?: string) {
  if (convId) {
    const query: Record<string, string> = { conv: convId }
    if (tab) query.tab = tab
    router.push({ path: `/${tenantId.value}/messages`, query })
  }
}
</script>

<style scoped>
/* Bug #8: nền hàng hoạt động dùng CLASS thay vì :style inline, vẫn qua token
   (không hard-code hex) — --destructive-bg/--muted đã có sẵn trong theme. */
.activity-row {
  display: flex;
  align-items: center;
  padding: 8px;
  margin-block-end: 4px;
  border-radius: var(--radius-md);
  cursor: pointer;
}
.activity-row--qc {
  background: var(--destructive-bg);
}
.activity-row--class {
  background: var(--muted);
}
.activity-row__text {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
