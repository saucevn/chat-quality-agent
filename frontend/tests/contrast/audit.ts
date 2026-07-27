/**
 * Đo tương phản WCAG trên DOM thật, chạy trong trình duyệt.
 *
 * Khác với `src/design/__tests__/tokens.spec.ts` — test đó chỉ kiểm các cặp màu
 * trong bảng token. Nó không thấy được màu thực tế hiện trên màn hình, vốn là
 * kết quả của class + nền lúc chạy. Hai chỗ dễ cho số sai nếu làm ẩu:
 *
 *  1. `getComputedStyle` trả `oklch(...)` nguyên văn (Chrome giữ nguyên không
 *     gian màu đã khai báo). `design/tokens.css` khai báo 85 giá trị oklch, nên
 *     mọi thứ tô bằng biến CSS đều rơi vào trường hợp này. Parse tay dễ sai;
 *     ở đây đẩy sang canvas để chính trình duyệt quy đổi.
 *
 *  2. Vuetify `variant="tonal"` KHÔNG đặt nền lên chính phần tử — phần tử đó
 *     `background: transparent`. Nền nằm ở một phần tử con
 *     `.v-<component>__underlay` với `background: currentColor` và
 *     `opacity: var(--v-activated-opacity)` (xem
 *     `node_modules/vuetify/lib/styles/tools/_variant.sass`). Đọc
 *     `background-color` của phần tử sẽ ra "trong suốt" và cho tỉ số tương phản
 *     vô nghĩa. Repo đang có 79 chỗ dùng `variant="tonal"`.
 */

export interface ContrastFinding {
  selector: string
  text: string
  fg: string
  bg: string
  ratio: number
  required: number
  fontSize: number
  fontWeight: number
}

/**
 * Hàm này được `page.evaluate` tuần tự hoá rồi chạy trong trang, nên KHÔNG
 * được tham chiếu bất cứ thứ gì ngoài phạm vi của chính nó.
 */
export function auditContrast(): ContrastFinding[] {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 1
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!

  /**
   * Chồng các lớp màu (dưới lên trên) lên một nền đục rồi đọc pixel kết quả.
   *
   * Để canvas làm việc quy đổi có hai cái lợi: nó hiểu mọi cú pháp màu trình
   * duyệt trả về (`oklch()`, `rgb()`, `color()`, `transparent`), và vì kết quả
   * cuối cùng đục nên không dính sai số làm tròn của alpha chưa nhân trước.
   */
  const flatten = (layers: Array<[string, number]>, base: string): [number, number, number] => {
    ctx.globalCompositeOperation = 'copy'
    ctx.globalAlpha = 1
    ctx.fillStyle = base
    ctx.fillRect(0, 0, 1, 1)
    ctx.globalCompositeOperation = 'source-over'
    for (const [color, alpha] of layers) {
      if (!(alpha > 0)) continue
      ctx.globalAlpha = Math.min(1, alpha)
      ctx.fillStyle = color
      ctx.fillRect(0, 0, 1, 1)
    }
    ctx.globalAlpha = 1
    const d = ctx.getImageData(0, 0, 1, 1).data
    return [d[0], d[1], d[2]]
  }

  const hex = (c: [number, number, number]) =>
    '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()

  // Ngưỡng 0.03928 giữ khớp với src/design/__tests__/tokens.spec.ts để hai test
  // không bao giờ báo hai con số khác nhau cho cùng một cặp màu.
  const luminance = ([r, g, b]: [number, number, number]) => {
    const f = (v: number) => {
      v /= 255
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
  }

  const contrast = (a: [number, number, number], b: [number, number, number]) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
    return (hi + 0.05) / (lo + 0.05)
  }

  /**
   * Lớp nền hiệu dụng dưới một phần tử, xếp từ dưới lên.
   *
   * Đi từ gốc xuống, mỗi nút góp `background-color` của nó, rồi góp tiếp các
   * phần tử `__underlay`/`__overlay` con trực tiếp — đây là chỗ Vuetify đặt nền
   * cho variant tonal/text. Phải quét ở MỌI nút trên đường đi chứ không chỉ ở
   * phần tử chứa chữ: với `<v-chip variant="tonal">` thì chữ nằm trong
   * `.v-chip__content`, còn underlay là anh em của nó, con của `.v-chip`.
   *
   * `opacity` của CSS làm mờ cả cây con, nên tích luỹ dần xuống (`acc`).
   */
  const backgroundOf = (el: Element): { layers: Array<[string, number]>; opacity: number } => {
    const chain: Element[] = []
    for (let n: Element | null = el; n; n = n.parentElement) chain.push(n)
    chain.reverse()

    const layers: Array<[string, number]> = []
    let acc = 1
    for (const n of chain) {
      const cs = getComputedStyle(n)
      const op = parseFloat(cs.opacity)
      acc *= Number.isFinite(op) ? op : 1
      layers.push([cs.backgroundColor, acc])
      const overlays = n.querySelectorAll(':scope > [class*="__underlay"], :scope > [class*="__overlay"]')
      for (const ov of Array.from(overlays)) {
        const ocs = getComputedStyle(ov)
        const oop = parseFloat(ocs.opacity)
        layers.push([ocs.backgroundColor, acc * (Number.isFinite(oop) ? oop : 1)])
      }
    }
    return { layers, opacity: acc }
  }

  const selectorFor = (el: Element): string => {
    const parts: string[] = []
    for (let n: Element | null = el; n && parts.length < 4; n = n.parentElement) {
      let s = n.tagName.toLowerCase()
      const cls = (n.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 2)
      if (cls.length) s += '.' + cls.join('.')
      parts.unshift(s)
      if (n.id) {
        parts[0] = '#' + n.id
        break
      }
    }
    return parts.join(' > ')
  }

  const pageBase = (() => {
    const root = getComputedStyle(document.documentElement).backgroundColor
    // Nền trang trong suốt thì trình duyệt vẽ lên trắng.
    return root === 'rgba(0, 0, 0, 0)' || root === 'transparent' ? '#FFFFFF' : root
  })()

  const findings: ContrastFinding[] = []
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT)

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const el = node as Element

    // Chỉ đo chữ do chính phần tử này chứa, tránh đếm trùng qua các lớp bọc.
    const own = Array.from(el.childNodes)
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => n.textContent || '')
      .join('')
      .trim()
    if (!own) continue

    if (el.closest('script, style, noscript')) continue
    // WCAG 1.4.3 miễn trừ control bị vô hiệu hoá.
    if (el.closest('[disabled], [aria-disabled="true"], .v-btn--disabled, .v-input--disabled')) continue

    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.display === 'none') continue

    const rect = el.getBoundingClientRect()
    if (rect.width < 1 || rect.height < 1) continue
    // Bỏ phần tử bị đẩy ra ngoài theo chiều ngang (drawer đóng nằm ở -100%).
    // Không lọc theo chiều dọc: nội dung dưới màn hình vẫn hiện khi cuộn.
    if (rect.right <= 0 || rect.left >= document.documentElement.clientWidth) continue

    const { layers, opacity } = backgroundOf(el)
    if (opacity <= 0.01) continue

    const bg = flatten(layers, pageBase)
    // Chữ có alpha thì phải chồng lên nền vừa tính, không so trực tiếp.
    const fg = flatten([...layers, [cs.color, opacity]], pageBase)

    const fontSize = parseFloat(cs.fontSize)
    const fontWeight = parseInt(cs.fontWeight, 10) || 400
    const large = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700)

    findings.push({
      selector: selectorFor(el),
      text: own.replace(/\s+/g, ' ').slice(0, 60),
      fg: hex(fg),
      bg: hex(bg),
      ratio: Math.round(contrast(fg, bg) * 100) / 100,
      required: large ? 3 : 4.5,
      fontSize,
      fontWeight,
    })
  }

  return findings
}
