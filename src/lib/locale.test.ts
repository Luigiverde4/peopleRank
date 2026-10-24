import { describe, expect, it } from 'vitest'
import { detectLocale, parseLocale } from './locale'

describe('parseLocale', () => {
  it('accepts only the supported locales', () => {
    expect(parseLocale('en')).toBe('en')
    expect(parseLocale('es')).toBe('es')
    expect(parseLocale('fr')).toBeNull()
    expect(parseLocale(null)).toBeNull()
  })
})

describe('detectLocale', () => {
  it('takes the first supported language, ignoring the region', () => {
    expect(detectLocale(['en-GB', 'es-ES'])).toBe('en')
    expect(detectLocale(['fr-FR', 'es-ES', 'en'])).toBe('es')
    expect(detectLocale(['ES-mx'])).toBe('es')
  })

  it('falls back to Spanish', () => {
    expect(detectLocale(['de-DE'])).toBe('es')
    expect(detectLocale([])).toBe('es')
  })
})
