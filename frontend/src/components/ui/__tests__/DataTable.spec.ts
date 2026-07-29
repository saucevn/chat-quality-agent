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

describe('DataTable', () => {
  it('đang tải thì hiện skeleton, không hiện empty', () => {
    const w = mount(DataTable, {
      ...mountOptions(),
      props: { headers, items: [], loading: true },
    })
    expect(w.findAll('[data-test="skeleton-row"]').length).toBeGreaterThan(0)
    expect(w.find('[data-test="empty"]').exists()).toBe(false)
  })

  it('lỗi thì hiện EmptyState variant error và phát retry', async () => {
    const w = mount(DataTable, {
      ...mountOptions(),
      props: { headers, items: [], error: true },
    })
    expect(w.find('[data-test="empty"]').exists()).toBe(true)
    await w.find('button').trigger('click')
    expect(w.emitted('retry')).toHaveLength(1)
  })

  it('rỗng mà không lỗi thì hiện EmptyState với tiêu đề truyền vào', () => {
    const w = mount(DataTable, {
      ...mountOptions(),
      props: { headers, items: [], emptyTitle: 'Chưa có công việc nào' },
    })
    expect(w.text()).toContain('Chưa có công việc nào')
  })

  it('có dữ liệu thì render hàng, không hiện skeleton', () => {
    const w = mount(DataTable, {
      ...mountOptions(),
      props: { headers, items: [{ name: 'Job A', status: 'success' }] },
    })
    expect(w.text()).toContain('Job A')
    expect(w.find('[data-test="skeleton-row"]').exists()).toBe(false)
  })

  it('slot toolbar chỉ render đúng 1 lần (không bị chuyển tiếp lặp vào v-data-table)', () => {
    const w = mount(DataTable, {
      ...mountOptions(),
      props: { headers, items: [{ name: 'Job A', status: 'success' }] },
      slots: { toolbar: '<button data-test="toolbar-btn">Xuất Excel</button>' },
    })
    expect(w.findAll('[data-test="toolbar-btn"]').length).toBe(1)
  })

  it('không truyền slot toolbar thì không render vùng toolbar', () => {
    const w = mount(DataTable, {
      ...mountOptions(),
      props: { headers, items: [{ name: 'Job A', status: 'success' }] },
    })
    expect(w.find('.data-table__toolbar').exists()).toBe(false)
  })

  it('slot bulk-actions render khi được truyền, có dữ liệu', () => {
    const w = mount(DataTable, {
      ...mountOptions(),
      props: { headers, items: [{ name: 'Job A', status: 'success' }] },
      slots: { 'bulk-actions': '<div data-test="bulk-bar">2 SKU đã chọn</div>' },
    })
    expect(w.find('[data-test="bulk-bar"]').exists()).toBe(true)
    expect(w.text()).toContain('2 SKU đã chọn')
  })

  it('không truyền slot bulk-actions thì không render vùng đó', () => {
    const w = mount(DataTable, {
      ...mountOptions(),
      props: { headers, items: [{ name: 'Job A', status: 'success' }] },
    })
    expect(w.find('[data-test="bulk-bar"]').exists()).toBe(false)
  })

  it('slot item.<key> cho phép tuỳ biến nội dung một ô', () => {
    const w = mount(DataTable, {
      ...mountOptions(),
      props: { headers, items: [{ name: 'Job A', status: 'success' }] },
      slots: {
        'item.name': '<template #default="{ item }"><b data-test="custom-name">{{ item.name.toUpperCase() }}</b></template>',
      },
    })
    expect(w.find('[data-test="custom-name"]').exists()).toBe(true)
    expect(w.find('[data-test="custom-name"]').text()).toBe('JOB A')
  })
})
