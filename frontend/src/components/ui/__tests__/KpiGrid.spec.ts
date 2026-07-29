// Test hành vi của KpiGrid — DS §3.1 CẤM #3: lưới KPI không được quá 5 thẻ,
// và lưới phải tự đặt breakpoint 1/2/4 cột khớp SkeletonKpi.
//
// QUAN TRỌNG — mọi ca dưới đây dựng thẻ bằng `v-for` THẬT trong một component
// bọc, không phải bằng các phần tử tĩnh anh em. Lý do: `v-for` biên dịch ra
// đúng MỘT vnode Fragment, còn phần tử tĩnh ra N vnode. Bản test cũ dùng phần
// tử tĩnh nên nó xanh cả khi guard đếm sai — đúng loại test luôn đúng bất kể
// code sai. Phase 2 sẽ luôn dựng KPI bằng `v-for`, nên đây mới là ca thật.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import KpiGrid from '../KpiGrid.vue'
import SkeletonKpi from '../SkeletonKpi.vue'
import { mountOptions } from './helpers'

// Component bọc dùng `v-for` thật bên trong slot mặc định của KpiGrid.
const Host = defineComponent({
  props: { count: { type: Number, required: true } },
  components: { KpiGrid },
  template: `
    <KpiGrid>
      <div v-for="i in count" :key="i" data-test="card">{{ i }}</div>
    </KpiGrid>
  `,
})

// Vài KPI có v-if=false hoặc là dòng trắng trong template — không được tính là
// thẻ. Host này trộn cả ba loại node để chốt phần làm phẳng.
const HostWithHoles = defineComponent({
  components: { KpiGrid },
  template: `
    <KpiGrid>
      <div v-for="i in 3" :key="i" data-test="card">{{ i }}</div>
      <div v-if="false" data-test="card">không bao giờ hiện</div>
    </KpiGrid>
  `,
})

function kpiWarnings(spy: { mock: { calls: unknown[][] } }) {
  return spy.mock.calls.filter((args) => String(args[0]).includes('[KpiGrid]'))
}

describe('KpiGrid', () => {
  afterEach(() => {
    // mockRestore để spy không rò sang test khác và output test còn sạch.
    vi.restoreAllMocks()
  })

  it('cảnh báo console.warn khi có hơn 5 thẻ dựng bằng v-for', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mount(Host, { ...mountOptions(), props: { count: 6 } })
    expect(kpiWarnings(warnSpy)).toHaveLength(1)
  })

  it('không cảnh báo khi có đúng 5 thẻ hoặc ít hơn', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mount(Host, { ...mountOptions(), props: { count: 5 } })
    expect(kpiWarnings(warnSpy)).toHaveLength(0)
  })

  it('không phát cảnh báo dev-mode nào khác của Vue (output test phải sạch)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mount(Host, { ...mountOptions(), props: { count: 4 } })
    expect(warnSpy.mock.calls).toHaveLength(0)
  })

  // Ca thứ hai của cùng một yêu cầu, nhưng qua slot dạng CHUỖI của
  // @vue/test-utils. Cần cả hai vì hai đường dẫn biên dịch slot khác nhau: chỉ
  // đường chuỗi mới làm lộ cảnh báo "Slot default invoked outside of the render
  // function" khi đếm thẻ trong onMounted (đã đo: bản cũ phát đúng 2 warn, một
  // của Vue một của KpiGrid). Đây là chốt chặn để không ai đưa việc gọi
  // `slots.default()` ra khỏi lúc render lần nữa.
  it('slot dạng chuỗi cũng không làm Vue phàn nàn về việc gọi slot ngoài render', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mount(KpiGrid, {
      ...mountOptions(),
      slots: { default: '<div data-test="card">a</div><div data-test="card">b</div>' },
    })
    expect(warnSpy.mock.calls.map((c) => String(c[0]))).toEqual([])
  })

  it('bọc mỗi thẻ trong v-col với breakpoint 1/2/4 cột khớp SkeletonKpi', () => {
    const w = mount(Host, { ...mountOptions(), props: { count: 4 } })
    const cols = w.findAll('.v-col--cols-12')
    expect(cols).toHaveLength(4)
    for (const col of cols) {
      expect(col.classes()).toContain('v-col--cols-sm-6')
      expect(col.classes()).toContain('v-col--cols-lg-3')
      // Thẻ phải nằm TRONG cột, không phải anh em với nó.
      expect(col.find('[data-test="card"]').exists()).toBe(true)
    }
  })

  // Chốt cứng rằng hai component giải cùng bài toán lưới KPI ra CÙNG một bộ
  // cột — lệch bộ này là layout nhảy khi chuyển từ skeleton sang dữ liệu thật.
  it('bộ class cột trùng khớp từng chữ với SkeletonKpi', () => {
    const grid = mount(Host, { ...mountOptions(), props: { count: 4 } })
    const skeleton = mount(SkeletonKpi, { ...mountOptions(), props: { count: 4 } })
    const cls = (w: ReturnType<typeof mount>) =>
      w.findAll('.v-col').map((c) => [...c.classes()].sort().join(' '))
    expect(cls(grid)).toEqual(cls(skeleton))
  })

  it('bỏ qua node rỗng (v-if sai, khoảng trắng) khi đếm và khi bọc cột', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const w = mount(HostWithHoles, mountOptions())
    expect(w.findAll('.v-col--cols-12')).toHaveLength(3)
    expect(kpiWarnings(warnSpy)).toHaveLength(0)
  })

  it('mỗi thẻ chỉ render đúng 1 lần', () => {
    const w = mount(Host, { ...mountOptions(), props: { count: 3 } })
    expect(w.findAll('[data-test="card"]')).toHaveLength(3)
  })
})
