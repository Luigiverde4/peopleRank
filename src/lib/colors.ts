/** Distinguishable default colors for new groups. */
export const GROUP_PALETTE = [
  '#e11d48',
  '#2563eb',
  '#16a34a',
  '#d97706',
  '#7c3aed',
  '#0891b2',
  '#db2777',
  '#65a30d',
  '#ea580c',
  '#4f46e5',
] as const

export const NO_GROUP_COLOR = '#cbd5e1'

/** First palette color not in use yet; cycles when all are used. */
export function nextGroupColor(usedColors: readonly string[]): string {
  const used = new Set(usedColors.map((color) => color.toLowerCase()))
  const free = GROUP_PALETTE.find((color) => !used.has(color))
  return free ?? GROUP_PALETTE[usedColors.length % GROUP_PALETTE.length]!
}

/** CSS background for a token ring split in equal segments per group. */
export function ringBackground(colors: readonly string[]): string {
  if (colors.length === 0) return NO_GROUP_COLOR
  if (colors.length === 1) return colors[0]!
  const step = 100 / colors.length
  const segments = colors.map((color, i) => `${color} ${i * step}% ${(i + 1) * step}%`)
  return `conic-gradient(${segments.join(', ')})`
}
