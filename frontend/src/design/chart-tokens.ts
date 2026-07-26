// chart.js nhận màu dạng chuỗi CSS, không nhận biến — phải đọc giá trị đã tính.
// Gọi lại sau mỗi lần đổi theme; giá trị thay đổi theo class .dark.
export function chartTokens() {
  const s = getComputedStyle(document.documentElement)
  const g = (n: string) => s.getPropertyValue(n).trim()
  return {
    c1: g('--chart-1'), c2: g('--chart-2'), c3: g('--chart-3'),
    c4: g('--chart-4'), c5: g('--chart-5'),
    foreground: g('--foreground'),
    muted: g('--muted-foreground'),
    border: g('--border'),
    success: g('--success'),
    destructive: g('--destructive'),
  }
}
