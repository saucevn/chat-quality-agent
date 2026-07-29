<!--
  Lưới KPI — DS §3.1: 1 cột dưới 600px, 2 cột từ sm, 4 cột từ lg.
  DS cấm quá 5 thẻ trong một lưới (quá tải nhận thức, dòng 1513).

  KpiGrid TỰ BỌC mỗi thẻ con trong <v-col cols="12" sm="6" lg="3">, khớp đúng
  bộ breakpoint của SkeletonKpi.vue. Trước đây component này chỉ là <v-row>
  trần và nơi dùng phải tự gõ <v-col> — chỉ cần một chỗ gõ lệch là lúc chuyển
  từ skeleton sang dữ liệu thật layout bị nhảy, đúng thứ skeleton sinh ra để
  tránh. Nơi dùng giờ chỉ cần:

      <KpiGrid><StatCard … /><StatCard … /></KpiGrid>
-->
<script setup lang="ts">
import { useSlots, Comment, Fragment, Text, type VNode } from 'vue'

const slots = useSlots()

// `slots.default()` KHÔNG trả về mỗi thẻ một vnode. Một `v-for` trong slot cho
// ra đúng MỘT vnode kiểu Fragment bọc toàn bộ danh sách (đã kiểm bằng
// @vue/compiler-dom), nên `slots.default().length` là 1 bất kể có bao nhiêu
// KPI — đó là lý do guard cũ không bao giờ chạy. Phải làm phẳng Fragment,
// đồng thời bỏ node Comment (v-if sai) và Text trắng do khoảng cách template.
function flatten(nodes: VNode[]): VNode[] {
  const out: VNode[] = []
  for (const node of nodes) {
    if (node.type === Fragment) out.push(...flatten((node.children ?? []) as VNode[]))
    else if (node.type === Comment) continue
    else if (node.type === Text && !String(node.children).trim()) continue
    else out.push(node)
  }
  return out
}

// Cảnh báo phát ngay trong lúc render, KHÔNG trong onMounted: gọi
// `slots.default()` ngoài render function làm Vue in cảnh báo dev-mode
// "Slot default invoked outside of render function" ở mọi lần mount — tiếng ồn
// đó từng bị test lọc quanh thay vì chữa. `warnedAt` chống lặp cảnh báo qua
// từng lần render mà vẫn cảnh báo lại nếu số thẻ đổi.
let warnedAt = 0

function cards(): VNode[] {
  const list = flatten(slots.default?.() ?? [])
  if (list.length > 5 && warnedAt !== list.length) {
    warnedAt = list.length
    console.warn(
      `[KpiGrid] ${list.length} thẻ — design system giới hạn 5. Tách 2 hàng hoặc dùng tab.`,
    )
  }
  return list
}
</script>

<template>
  <v-row class="kpi-grid">
    <v-col v-for="(card, i) in cards()" :key="i" cols="12" sm="6" lg="3">
      <component :is="card" />
    </v-col>
  </v-row>
</template>

<style scoped>
/* Ép mọi card cùng hàng cao bằng nhau — Dashboard hiện đang lệch. */
.kpi-grid :deep(.v-card) {
  block-size: 100%;
}
</style>
