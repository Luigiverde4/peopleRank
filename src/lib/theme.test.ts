import { describe, expect, it } from 'vitest'
import { nextPreference, parsePreference, resolveTheme } from './theme'

describe('resolveTheme', () => {
  it('follows the system only for the system preference', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })
})

describe('nextPreference', () => {
  it('cycles system → light → dark → system', () => {
    expect(nextPreference('system')).toBe('light')
    expect(nextPreference('light')).toBe('dark')
    expect(nextPreference('dark')).toBe('system')
  })
})

describe('parsePreference', () => {
  it('falls back to system for missing or unknown values', () => {
    expect(parsePreference('dark')).toBe('dark')
    expect(parsePreference(null)).toBe('system')
    expect(parsePreference('neon')).toBe('system')
  })
})
