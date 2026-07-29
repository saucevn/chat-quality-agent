// Test hành vi của FilterBar — khung bố cục cho control lọc (DS §3.5,
// quyết định B9: mọi control cao 36px qua CSS `:deep`, không kiểm ở đây vì
// happy-dom không tính layout thật — chỉ khẳng định slot mặc định hoạt động).
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FilterBar from '../FilterBar.vue'
import { mountOptions } from './helpers'

describe('FilterBar', () => {
  it('render đúng nội dung control được truyền vào slot mặc định', () => {
    const w = mount(FilterBar, {
      ...mountOptions(),
      props: { modelValue: { status: 'active' } },
      slots: { default: '<input data-test="search" />' },
    })
    expect(w.find('[data-test="search"]').exists()).toBe(true)
  })

  it('không tự vẽ thêm nội dung nào ngoài slot', () => {
    const w = mount(FilterBar, {
      ...mountOptions(),
      props: { modelValue: {} },
      slots: { default: '<button data-test="only-child">Lọc</button>' },
    })
    expect(w.findAll('[data-test="only-child"]').length).toBe(1)
    expect(w.text()).toBe('Lọc')
  })

  // modelValue từng là API chết — khai prop nhưng không đọc, không truyền
  // vào slot, không emit. Test này khẳng định slot mặc định THẬT SỰ nhận
  // được props.filters đúng bằng modelValue, không chỉ khẳng định component
  // tồn tại.
  it('truyền modelValue vào slot mặc định qua slot prop `filters`', () => {
    const modelValue = { status: 'active', channel: 'zalo_oa' }
    const w = mount(FilterBar, {
      ...mountOptions(),
      props: { modelValue },
      slots: {
        default:
          '<template #default="{ filters }"><pre data-test="filters">{{ JSON.stringify(filters) }}</pre></template>',
      },
    })
    expect(w.find('[data-test="filters"]').text()).toBe(JSON.stringify(modelValue))
  })
})
