import { describe, expect, it } from 'vitest'
import { defaultRoomName } from './displayName'

describe('defaultRoomName', () => {
  it('uses the day and month with two digits', () => {
    expect(defaultRoomName(new Date(2026, 9, 4))).toBe('Votación del 04/10')
    expect(defaultRoomName(new Date(2026, 11, 24))).toBe('Votación del 24/12')
  })
})
