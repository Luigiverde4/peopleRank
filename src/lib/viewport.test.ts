import { describe, expect, it } from 'vitest'
import { FULL_VIEW, MAX_SCALE, clampViewport, fromScreen, panBy, toScreen, worldBox, zoomAt } from './viewport'

describe('toScreen / fromScreen', () => {
  it('is the identity (with y flipped) at full view', () => {
    expect(toScreen({ x: 0.25, y: 0.75 }, FULL_VIEW)).toEqual({ sx: 0.25, sy: 0.25 })
    expect(fromScreen(0.25, 0.25, FULL_VIEW)).toEqual({ x: 0.25, y: 0.75 })
  })

  it('are inverse of each other when zoomed', () => {
    const view = { scale: 4, u0: 0.5, v0: 0.25 }
    const point = { x: 0.6, y: 0.7 }
    const { sx, sy } = toScreen(point, view)
    const back = fromScreen(sx, sy, view)
    expect(back.x).toBeCloseTo(point.x)
    expect(back.y).toBeCloseTo(point.y)
  })
})

describe('zoomAt', () => {
  it('keeps the point under the cursor in place', () => {
    const before = { scale: 1.5, u0: 0.1, v0: 0.2 }
    const under = fromScreen(0.3, 0.6, before)
    const after = zoomAt(before, 2, 0.3, 0.6)
    expect(after.scale).toBe(3)
    const stillUnder = fromScreen(0.3, 0.6, after)
    expect(stillUnder.x).toBeCloseTo(under.x)
    expect(stillUnder.y).toBeCloseTo(under.y)
  })

  it('never goes beyond the scale limits', () => {
    expect(zoomAt(FULL_VIEW, 0.5, 0.5, 0.5)).toEqual(FULL_VIEW)
    expect(zoomAt({ scale: 5, u0: 0, v0: 0 }, 10, 0, 0).scale).toBe(MAX_SCALE)
  })
})

describe('panBy', () => {
  it('moves the window opposite to the drag and stays inside the board', () => {
    const view = { scale: 2, u0: 0.25, v0: 0.25 }
    expect(panBy(view, 0.2, 0)).toEqual({ scale: 2, u0: 0.15, v0: 0.25 })
    expect(panBy(view, 5, -5)).toEqual({ scale: 2, u0: 0, v0: 0.5 })
  })

  it('does nothing at full view', () => {
    expect(panBy(FULL_VIEW, 0.3, 0.3)).toEqual(FULL_VIEW)
  })
})

describe('clampViewport', () => {
  it('limits scale and origin', () => {
    expect(clampViewport({ scale: 0.5, u0: 0.4, v0: -1 })).toEqual(FULL_VIEW)
    expect(clampViewport({ scale: 4, u0: 0.9, v0: 0.9 })).toEqual({ scale: 4, u0: 0.75, v0: 0.75 })
  })
})

describe('worldBox', () => {
  it('scales and shifts the whole board layer', () => {
    expect(worldBox({ scale: 2, u0: 0.25, v0: 0.5 })).toEqual({
      left: '-50%',
      top: '-100%',
      width: '200%',
      height: '200%',
    })
  })
})
