import { describe, expect, it } from 'vitest'
import { GROUP_PALETTE, NO_GROUP_COLOR, nextGroupColor, ringBackground } from './colors'

describe('nextGroupColor', () => {
  it('returns the first unused palette color', () => {
    expect(nextGroupColor([])).toBe(GROUP_PALETTE[0])
    expect(nextGroupColor([GROUP_PALETTE[0].toUpperCase()])).toBe(GROUP_PALETTE[1])
  })

  it('cycles when every color is used', () => {
    expect(nextGroupColor([...GROUP_PALETTE])).toBe(GROUP_PALETTE[0])
  })
})

describe('ringBackground', () => {
  it('uses a neutral color without groups and a solid color with one', () => {
    expect(ringBackground([])).toBe(NO_GROUP_COLOR)
    expect(ringBackground(['#111111'])).toBe('#111111')
  })

  it('splits the ring in equal segments', () => {
    expect(ringBackground(['#aaa', '#bbb'])).toBe('conic-gradient(#aaa 0% 50%, #bbb 50% 100%)')
  })
})
