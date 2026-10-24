/** A point on the board, normalized to [0, 1] with y = 1 at the top. */
export interface BoardPoint {
  x: number
  y: number
}

export interface RectLike {
  left: number
  top: number
  width: number
  height: number
}

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/** Converts viewport coordinates to board coordinates (not clamped). */
export function clientToBoard(clientX: number, clientY: number, rect: RectLike): BoardPoint {
  return {
    x: (clientX - rect.left) / rect.width,
    y: 1 - (clientY - rect.top) / rect.height,
  }
}

export function isInsideBoard(point: BoardPoint): boolean {
  return point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1
}

/** CSS percentages for absolutely positioning a point inside the board. */
export function boardToPercent(point: BoardPoint): { left: string; top: string } {
  return { left: `${point.x * 100}%`, top: `${(1 - point.y) * 100}%` }
}
