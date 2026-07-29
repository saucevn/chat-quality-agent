// Test hành vi của DataTable — ép đủ 4 trạng thái (README §"Quy tắc 4 trạng
// thái") và hợp đồng 3 slot ('toolbar', 'item.<key>', 'bulk-actions') theo
// Contract ở research/plans/2026-07-29-ui-upgrade/README.md.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DataTable from '../DataTable.vue'
import { mountOptions } from './helpers'

const headers = [
  { title: 'Tên', key: 'name' },
  { title: 'Trạng thái', key: 'status' },
]

// `emptyTitle` là prop BẮT BUỘC (nhánh rỗng không được là một dòng "Không có
// dữ liệu"), nên mọi ca mount đều phải truyền.
const base = { headers, emptyTitle: 'Chưa có công việc nào' }

describe('DataTable', () => {
  it('đang tải thì hiện skeleton, không hiện empty', () => {
    const w = mount(DataTable, {
      ...mountOptions(),
      props: { ...base, items: [], loading: true },
    })
    expect(w.findAll('[data-test="skeleton-row"]').length).toBeGreaterThan(0)
    expect(w.find('[data-test="empty"]').exists()).toBe(false)
  })

  it('lỗi thì hiện EmptyState variant error và phát retry', async () => {
    const w = mount(DataTable, {
      ...mountOptions(),
      props: { ...base, items: [], error: true },
    })
    expect(w.find('[data-test="empty"]').exists()).toBe(true)
    await w.find('button').trigger('click')
    expect(w.emitted('retry')).toHaveLength(1)
  })

  it('rỗng mà không lỗi thì hiện EmptyState với tiêu đề truyền vào', () => {
    const w = mount(DataTable, {
      ...mountOptions(),
      props: { ...base, items: [] },
    })
    expect(w.text()).toContain('Chưa có công việc nào')
  })

  // §3.2: nhánh rỗng phải có CTA hoặc số cụ thể, cấm chỉ một dòng "Không có dữ
  // liệu". Không có đường nối CTA thì 14 bảng Phase 2 hợp lệ về type mà vẫn vi
  // phạm quy tắc.
  it('nhánh rỗng nối được CTA và phát empty-action khi bấm', async () => {
    const w = mount(DataTable, {
      ...mountOptions(),
      props: { ...base, items: [], emptyActionLabel: 'Tạo công việc đầu tiên' },
    })
    const cta = w.find('[data-test="empty"] button')
    expect(cta.exists()).toBe(true)
    expect(cta.text()).toContain('Tạo công việc đầu tiên')
    await cta.trigger('click')
    expect(w.emitted('empty-action')).toHaveLength(1)
  })

  // Chốt ở tầng KIỂU, không phải tầng chạy: `emptyTitle` bắt buộc. Nếu ai đó
  // đưa lại `emptyTitle?: string` (kèm mặc định `t('no_data')`) thì
  // `@ts-expect-error` dưới đây thành thừa và `vue-tsc -b` đỏ ngay tại dòng
  // này — đúng chỗ reviewer nhìn thấy.
  it('emptyTitle là prop bắt buộc ở tầng kiểu', () => {
    // @ts-expect-error -- cố ý thiếu emptyTitle
    const w = mount(DataTable, { ...mountOptions(), props: { headers, items: [] } })
    expect(w.exists()).toBe(true)
  })

  it('không truyền emptyActionLabel thì nhánh rỗng không có nút', () => {
    const w = mount(DataTable, { ...mountOptions(), props: { ...base, items: [] } })
    expect(w.find('[data-test="empty"] button').exists()).toBe(false)
  })

  it('có dữ liệu thì render hàng, không hiện skeleton', () => {
    const w = mount(DataTable, {
      ...mountOptions(),
      props: { ...base, items: [{ name: 'Job A', status: 'success' }] },
    })
    expect(w.text()).toContain('Job A')
    expect(w.find('[data-test="skeleton-row"]').exists()).toBe(false)
  })

  // ĐIỂM CHẶN MERGE: `items-length` không phải prop của VDataTable — nó tự tính
  // `items.length`. Bảng phân trang server-side vì thế hỏng IM LẶNG: 20 dòng
  // trên tổng 500 vẫn báo đúng 1 trang và 'update:page' không bao giờ phát.
  // Ca dưới đây cố ý để items.length (3) lệch hẳn totalItems (500) để hai
  // nguồn số không thể lẫn vào nhau.
  describe('phân trang đọc totalItems chứ không đọc items.length', () => {
    const paged = {
      ...base,
      items: [
        { name: 'Job A', status: 'success' },
        { name: 'Job B', status: 'failed' },
        { name: 'Job C', status: 'pending' },
      ],
      totalItems: 500,
      itemsPerPage: 20,
    }

    it('footer báo "1-20 of 500", không phải "1-3 of 3"', () => {
      const w = mount(DataTable, { ...mountOptions(), props: paged })
      const info = w.find('.v-data-table-footer__info')
      expect(info.exists()).toBe(true)
      expect(info.text().replace(/\s+/g, ' ')).toContain('1-20 of 500')
    })

    it('có nhiều hơn 1 trang — nút sang trang sau không bị vô hiệu', () => {
      const w = mount(DataTable, { ...mountOptions(), props: paged })
      const next = w.find('.v-pagination__next button')
      expect(next.exists()).toBe(true)
      expect(next.attributes('disabled')).toBeUndefined()
    })

    it('bấm sang trang sau thì phát update:page', async () => {
      const w = mount(DataTable, { ...mountOptions(), props: paged })
      await w.find('.v-pagination__next button').trigger('click')
      expect(w.emitted('update:page')).toBeTruthy()
      expect(w.emitted('update:page')?.[0]).toEqual([2])
    })

    it('không truyền totalItems thì vẫn phân trang phía client như cũ', () => {
      const items = Array.from({ length: 45 }, (_, i) => ({ name: `Job ${i}`, status: 'success' }))
      const w = mount(DataTable, {
        ...mountOptions(),
        props: { ...base, items, itemsPerPage: 20 },
      })
      // 45 mục, mỗi trang 20 ⇒ chỉ 20 hàng được render (client tự cắt trang).
      expect(w.findAll('tbody tr')).toHaveLength(20)
      expect(w.find('.v-data-table-footer').text()).toContain('45')
    })
  })

  // Không có `v-bind="$attrs"` + `inheritAttrs: false` thì attr không khai báo
  // rơi lên <v-card> gốc một cách im lặng: bảng không có ô chọn dòng, và slot
  // 'bulk-actions' không bao giờ có gì để thao tác.
  it('attr không khai báo rơi xuống bảng, không dính lên v-card gốc', () => {
    const w = mount(DataTable, {
      ...mountOptions(),
      props: { ...base, items: [{ name: 'Job A', status: 'success' }] },
      attrs: { 'show-select': true, 'item-value': 'name' },
    })
    // show-select được VDataTable hiểu ⇒ có cột checkbox trong <thead>.
    expect(w.find('thead .v-selection-control').exists()).toBe(true)
    // và attr không được đọng lại trên phần tử gốc.
    expect(w.attributes('show-select')).toBeUndefined()
    expect(w.attributes('item-value')).toBeUndefined()
  })

  it('slot toolbar chỉ render đúng 1 lần (không bị chuyển tiếp lặp vào v-data-table)', () => {
    const w = mount(DataTable, {
      ...mountOptions(),
      props: { ...base, items: [{ name: 'Job A', status: 'success' }] },
      slots: { toolbar: '<button data-test="toolbar-btn">Xuất Excel</button>' },
    })
    expect(w.findAll('[data-test="toolbar-btn"]').length).toBe(1)
  })

  it('không truyền slot toolbar thì không render vùng toolbar', () => {
    const w = mount(DataTable, {
      ...mountOptions(),
      props: { ...base, items: [{ name: 'Job A', status: 'success' }] },
    })
    expect(w.find('.data-table__toolbar').exists()).toBe(false)
  })

  it('slot bulk-actions render khi được truyền, có dữ liệu', () => {
    const w = mount(DataTable, {
      ...mountOptions(),
      props: { ...base, items: [{ name: 'Job A', status: 'success' }] },
      slots: { 'bulk-actions': '<div data-test="bulk-bar">2 SKU đã chọn</div>' },
    })
    expect(w.find('[data-test="bulk-bar"]').exists()).toBe(true)
    expect(w.text()).toContain('2 SKU đã chọn')
  })

  it('không truyền slot bulk-actions thì không render vùng đó', () => {
    const w = mount(DataTable, {
      ...mountOptions(),
      props: { ...base, items: [{ name: 'Job A', status: 'success' }] },
    })
    expect(w.find('[data-test="bulk-bar"]').exists()).toBe(false)
  })

  it('slot item.<key> cho phép tuỳ biến nội dung một ô', () => {
    const w = mount(DataTable, {
      ...mountOptions(),
      props: { ...base, items: [{ name: 'Job A', status: 'success' }] },
      slots: {
        'item.name': '<template #default="{ item }"><b data-test="custom-name">{{ item.name.toUpperCase() }}</b></template>',
      },
    })
    expect(w.find('[data-test="custom-name"]').exists()).toBe(true)
    expect(w.find('[data-test="custom-name"]').text()).toBe('JOB A')
  })

  // Ca server-side cũng phải giữ nguyên hợp đồng slot — VDataTableServer là
  // component khác, slot không tự nhiên chuyển tiếp giống VDataTable.
  it('slot item.<key> vẫn hoạt động ở chế độ server-side', () => {
    const w = mount(DataTable, {
      ...mountOptions(),
      props: { ...base, items: [{ name: 'Job A', status: 'success' }], totalItems: 500 },
      slots: {
        'item.name': '<template #default="{ item }"><b data-test="custom-name">{{ item.name.toUpperCase() }}</b></template>',
      },
    })
    expect(w.find('[data-test="custom-name"]').text()).toBe('JOB A')
  })
})
