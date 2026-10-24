import { describe, expect, it } from 'vitest'
import { boardToPercent, clamp01, clientToBoard, isInsideBoard } from './geometry'

const rect = { left: 100, top: 50, width: 200, height: 200 }

describe('clientToBoard', () => {
  it('maps the corners with y = 1 at the top', () => {
    expect(clientToBoard(100, 50, rect)).toEqual({ x: 0, y: 1 })
    expect(clientToBoard(300, 250, rect)).toEqual({ x: 1, y: 0 })
    expect(clientToBoard(200, 150, rect)).toEqual({ x: 0.5, y: 0.5 })
  })

  it('returns values outside [0, 1] when the pointer is outside', () => {
    const point = clientToBoard(50, 300, rect)
    expect(isInsideBoard(point)).toBe(false)
  })
})

describe('clamp01', () => {
  it('limits to [0, 1]', () => {
    expect(clamp01(-0.2)).toBe(0)
    expect(clamp01(1.4)).toBe(1)
    expect(clamp01(0.3)).toBe(0.3)
  })
})

describe('boardToPercent', () => {
  it('inverts the y axis for CSS', () => {
    expect(boardToPercent({ x: 0.25, y: 0.75 })).toEqual({ left: '25%', top: '25%' })
  })
})
