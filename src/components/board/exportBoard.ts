import { toPng } from 'html-to-image'

/** Marks the element that "Exportar PNG" captures (the visible board or graph). */
export const EXPORT_ATTRIBUTE = 'data-board-export'

/** Renders the visible board (DOM) or graph (canvas) to a PNG data URL on a white background. */
export async function renderVisibleBoard(): Promise<string | null> {
  const target = document.querySelector<HTMLElement>(`[${EXPORT_ATTRIBUTE}]`)
  if (!target) return null
  const canvas = target.querySelector('canvas')
  if (canvas) return canvas.toDataURL('image/png')
  return toPng(target, { backgroundColor: '#ffffff', pixelRatio: 2, cacheBust: true })
}

export async function downloadVisibleBoard(fileName: string): Promise<void> {
  const dataUrl = await renderVisibleBoard()
  if (!dataUrl) return
  const link = document.createElement('a')
  link.download = fileName
  link.href = dataUrl
  link.click()
}
