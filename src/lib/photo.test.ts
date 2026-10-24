import { describe, expect, it } from 'vitest'
import { centerSquareCrop } from './photo'

describe('centerSquareCrop', () => {
  it('crops the center of landscape images', () => {
    expect(centerSquareCrop(400, 300)).toEqual({ sx: 50, sy: 0, side: 300 })
  })

  it('crops the center of portrait images', () => {
    expect(centerSquareCrop(300, 500)).toEqual({ sx: 0, sy: 100, side: 300 })
  })

  it('keeps square images whole', () => {
    expect(centerSquareCrop(256, 256)).toEqual({ sx: 0, sy: 0, side: 256 })
  })
})
