import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StatCard from '../StatCard.vue'
import { mountOptions } from './helpers'

describe('StatCard', () => {
  it('giá trị dùng bậc heading-1 và KHÔNG bị làm mờ (anti-pattern #1)', () => {
    const w = mount(StatCard, {
      ...mountOptions(),
      props: { label: 'Tổng hội thoại', value: '1.284' },
    })
    const v = w.find('[data-test="value"]')
    expect(v.classes()).toContain('text-heading-1')
    expect(v.classes()).not.toContain('text-medium-emphasis')
  })

  it('nhãn viết hoa dùng bậc label', () => {
    const w = mount(StatCard, {
      ...mountOptions(),
      props: { label: 'Tổng hội thoại', value: '1' },
    })
    expect(w.find('[data-test="label"]').classes()).toContain('text-label')
  })

  it('delta dương mũi tên lên màu success, delta âm mũi tên xuống màu error', () => {
    const up = mount(StatCard, {
      ...mountOptions(), props: { label: 'x', value: '1', change: 18.4 },
    })
    const down = mount(StatCard, {
      ...mountOptions(), props: { label: 'x', value: '1', change: -2.1 },
    })
    expect(up.find('[data-test="delta"]').text()).toContain('↑')
    expect(up.find('[data-test="delta"]').text()).toContain('18,4%')
    expect(down.find('[data-test="delta"]').text()).toContain('↓')
    expect(down.find('[data-test="delta"]').text()).toContain('2,1%')
  })

  // CẤM #2 (§2.2): delta vượt ngưỡng phải là badge SOLID. Vuetify sinh
  // `v-btn/v-chip--variant-flat` cho solid và `--variant-tonal` cho nền mờ.
  describe('ngưỡng delta (CẤM #2)', () => {
    const at = (change: number, changeThreshold?: number) =>
      mount(StatCard, {
        ...mountOptions(),
        props: { label: 'x', value: '1', change, changeThreshold },
      }).find('[data-test="delta"]')

    it('dưới ngưỡng thì badge tonal', () => {
      expect(at(4.9, 5).classes()).toContain('v-chip--variant-tonal')
    })

    it('đúng bằng ngưỡng đã tính là vượt ⇒ badge solid (flat)', () => {
      expect(at(5, 5).classes()).toContain('v-chip--variant-flat')
    })

    it('trên ngưỡng thì badge solid (flat)', () => {
      expect(at(18.4, 5).classes()).toContain('v-chip--variant-flat')
    })

    it('sụt sâu cũng vượt ngưỡng — so trên giá trị tuyệt đối', () => {
      expect(at(-18.4, 5).classes()).toContain('v-chip--variant-flat')
    })

    it('không khai ngưỡng thì mọi delta giữ nguyên tonal', () => {
      expect(at(99).classes()).toContain('v-chip--variant-tonal')
    })
  })

  it('loading thì không hiện giá trị — tránh số 0 giả', () => {
    const w = mount(StatCard, {
      ...mountOptions(), props: { label: 'x', value: 0, loading: true },
    })
    expect(w.find('[data-test="value"]').exists()).toBe(false)
  })

  it('loading dùng skeleton chứ không dùng spinner (anti-pattern #7)', () => {
    const w = mount(StatCard, {
      ...mountOptions(), props: { label: 'x', value: 0, loading: true },
    })
    expect(w.find('[data-test="loading"]').exists()).toBe(true)
    expect(w.find('.v-progress-circular').exists()).toBe(false)
  })
})
