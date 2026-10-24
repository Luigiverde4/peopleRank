import { clamp01, type BoardPoint } from './geometry'

/**
 * Which part of the board is visible. Works in "top-down" board units (u = x, v = 1 - y), so the
 * visible window is [u0, u0 + 1/scale] × [v0, v0 + 1/scale]. Screen positions are fractions of the
 * board element (0..1 from its top-left corner).
 *
 * Zooming enlarges the space between tokens, not the tokens: that is what eases a crowded board.
 */
export interface Viewport {
  scale: number
  u0: number
  v0: number
}

export const MIN_SCALE = 1
export const MAX_SCALE = 6
export const FULL_VIEW: Viewport = { scale: 1, u0: 0, v0: 0 }

/** Keeps the scale in range and the visible window inside the board. */
export function clampViewport({ scale, u0, v0 }: Viewport): Viewport {
  const clampedScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))
  const maxOrigin = 1 - 1 / clampedScale
  return {
    scale: clampedScale,
    u0: Math.min(maxOrigin, Math.max(0, u0)),
    v0: Math.min(maxOrigin, Math.max(0, v0)),
  }
}

/** Screen fractions (0..1 of the board element) of a board point; outside 0..1 when off-screen. */
export function toScreen(point: BoardPoint, view: Viewport): { sx: number; sy: number } {
  return { sx: (point.x - view.u0) * view.scale, sy: (1 - point.y - view.v0) * view.scale }
}

/** Board point under a screen position (fractions of the board element). */
export function fromScreen(sx: number, sy: number, view: Viewport): BoardPoint {
  return { x: clamp01(view.u0 + sx / view.scale), y: clamp01(1 - (view.v0 + sy / view.scale)) }
}

/** Multiplies the scale by `factor` keeping the board point under (sx, sy) where it is. */
export function zoomAt(view: Viewport, factor: number, sx: number, sy: number): Viewport {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, view.scale * factor))
  const u = view.u0 + sx / view.scale
  const v = view.v0 + sy / view.scale
  return clampViewport({ scale, u0: u - sx / scale, v0: v - sy / scale })
}

/** Moves the view by a screen distance (fractions of the board element), like dragging a map. */
export function panBy(view: Viewport, dsx: number, dsy: number): Viewport {
  return clampViewport({ ...view, u0: view.u0 - dsx / view.scale, v0: view.v0 - dsy / view.scale })
}

/** CSS box of the whole board (the "world" layer) inside the board element, in percentages. */
export function worldBox(view: Viewport): { left: string; top: string; width: string; height: string } {
  const size = `${view.scale * 100}%`
  return { left: `${-view.u0 * view.scale * 100}%`, top: `${-view.v0 * view.scale * 100}%`, width: size, height: size }
}
