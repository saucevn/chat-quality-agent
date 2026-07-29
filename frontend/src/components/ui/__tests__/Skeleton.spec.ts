import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SkeletonTable from '../SkeletonTable.vue'
import SkeletonKpi from '../SkeletonKpi.vue'
import SkeletonCard from '../SkeletonCard.vue'
import { mountOptions } from './helpers'

describe('Skeleton', () => {
  it('SkeletonTable dựng đúng số hàng × số cột', () => {
    const w = mount(SkeletonTable, { ...mountOptions(), props: { rows: 3, cols: 4 } })
    expect(w.findAll('[data-test="skeleton-row"]')).toHaveLength(3)
    expect(w.findAll('[data-test="skeleton-cell"]')).toHaveLength(12)
  })

  it('SkeletonTable mặc định 5 hàng', () => {
    const w = mount(SkeletonTable, { ...mountOptions(), props: { cols: 2 } })
    expect(w.findAll('[data-test="skeleton-row"]')).toHaveLength(5)
  })

  it('SkeletonKpi dựng đúng số thẻ, mỗi thẻ có khối 60% và 40%', () => {
    const w = mount(SkeletonKpi, { ...mountOptions(), props: { count: 4 } })
    expect(w.findAll('[data-test="skeleton-kpi-card"]')).toHaveLength(4)
    // quyết định A16: dùng bộ số của DS §3.3 (60%/40%), không phải của §2.9
    expect(w.html()).toContain('width: 60%')
    expect(w.html()).toContain('width: 40%')
  })

  it('SkeletonCard dựng đúng số dòng', () => {
    const w = mount(SkeletonCard, { ...mountOptions(), props: { lines: 2 } })
    expect(w.findAll('[data-test="skeleton-line"]')).toHaveLength(2)
  })
})
