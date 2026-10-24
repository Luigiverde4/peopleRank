import { describe, expect, it } from 'vitest'
import { SLUG_LENGTH, newId, newSlug, parseSlug } from './ids'

describe('newSlug', () => {
  it('has at least 12 url-safe characters', () => {
    const slug = newSlug()
    expect(slug).toHaveLength(SLUG_LENGTH)
    expect(SLUG_LENGTH).toBeGreaterThanOrEqual(12)
    expect(slug).toMatch(/^[0-9a-z]+$/)
  })
})

describe('newId', () => {
  it('looks like a v4 uuid', () => {
    expect(newId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })
})

describe('parseSlug', () => {
  it('accepts bare slugs and room links', () => {
    expect(parseSlug(' abcdefghijkl ')).toBe('abcdefghijkl')
    expect(parseSlug('https://peoplerank.app/r/abc123def456xy?x=1')).toBe('abc123def456xy')
  })

  it('rejects short or invalid input', () => {
    expect(parseSlug('abc')).toBeNull()
    expect(parseSlug('hola mundo cruel')).toBeNull()
  })
})
