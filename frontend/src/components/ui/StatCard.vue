<!--
  Thẻ KPI — DS §2.2 (anatomy) và §3.1 (hierarchy 4 tầng).
  Ba điều CẤM: giá trị không được làm mờ; delta vượt ngưỡng phải dùng badge
  solid; lưới không quá 5 thẻ (KpiGrid cảnh báo).
  Thay 7 khối chép tay ở Dashboard.vue và JobDetail.vue.
-->
<script setup lang="ts">
import { computed } from 'vue'
import SkeletonBlock from './SkeletonBlock.vue'
import { pct } from '../../utils/format'

const props = defineProps<{
  label: string
  value: string | number
  unit?: string
  change?: number
  // CẤM #2 (§2.2): delta VƯỢT NGƯỠNG phải dùng badge SOLID, không phải tonal.
  // Ngưỡng là quyết định nghiệp vụ nên nơi dùng khai, không hard-code ở đây.
  // Không truyền ⇒ mọi delta giữ nguyên tonal như trước.
  changeThreshold?: number
  icon?: string
  loading?: boolean
  to?: string
}>()

// Lựa chọn có chủ ý: change === 0 tính là "tăng" (mũi tên lên, màu success).
// Đặc tả chưa nói rõ ca biên này; giữ nguyên hành vi, chỉ ghi chú lại.
const deltaUp = computed(() => (props.change ?? 0) >= 0)
const deltaText = computed(() =>
  props.change === undefined ? '' : `${deltaUp.value ? '↑' : '↓'} ${pct(Math.abs(props.change))}`,
)

// So sánh trên GIÁ TRỊ TUYỆT ĐỐI: một cú sụt -30% cũng "vượt ngưỡng" như một
// cú tăng +30%. Biên `>=` — đúng bằng ngưỡng đã là vượt.
const deltaVariant = computed(() =>
  props.change !== undefined &&
  props.changeThreshold !== undefined &&
  Math.abs(props.change) >= props.changeThreshold
    ? 'flat'
    : 'tonal',
)
</script>

<template>
  <v-card :to="to" class="h-100">
    <div class="stat-card__header">
      <span data-test="label" class="text-label text-medium-emphasis">{{ label }}</span>
      <v-icon v-if="icon" :icon="icon" size="16" class="text-medium-emphasis" />
    </div>

    <div class="stat-card__body">
      <!--
        Quyết định 2026-07-29: trạng thái tải dùng SkeletonBlock khớp hình dạng
        nội dung thật, KHÔNG dùng v-progress-circular. Bản plan đầu dùng spinner
        24px, trái Global Constraint §"Quy tắc 4 trạng thái" (anti-pattern #7)
        và lệch hình dạng so với SkeletonKpi của story 1A. Bộ số 60%/40% khớp
        đúng SkeletonKpi để chuyển từ tải sang có dữ liệu không giật layout.
      -->
      <template v-if="loading">
        <SkeletonBlock data-test="loading" width="60%" height="30px" class="mb-3" />
        <SkeletonBlock width="40%" height="12px" />
      </template>
      <template v-else>
        <div class="d-flex align-end ga-1">
          <span data-test="value" class="stat-card__value text-heading-1">{{ value }}</span>
          <span v-if="unit" class="text-body-base text-medium-emphasis mb-1">{{ unit }}</span>
        </div>
        <div v-if="change !== undefined" class="d-flex align-center ga-2 mt-3">
          <v-chip
            data-test="delta"
            size="small"
            :variant="deltaVariant"
            :color="deltaUp ? 'success' : 'error'"
          >
            {{ deltaText }}
          </v-chip>
        </div>
      </template>
    </div>
  </v-card>
</template>

<style scoped>
/* DS §2.2: header padding 20px với padding-bottom 0; body padding-top 16px. */
.stat-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 0;
}

.stat-card__body {
  padding: 16px 20px 20px;
}

/* Anti-pattern #1: số KPI phải full opacity, cấm muted-foreground. */
.stat-card__value {
  color: rgb(var(--v-theme-on-surface));
  font-variant-numeric: tabular-nums;
}
</style>
