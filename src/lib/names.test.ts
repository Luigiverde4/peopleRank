import { describe, expect, it } from 'vitest'
import { cleanName, initials, normalizeName, parseNameList } from './names'

describe('cleanName', () => {
  it('trims and collapses whitespace', () => {
    expect(cleanName('  Ana   María \t')).toBe('Ana María')
  })
})

describe('normalizeName', () => {
  it('ignores case, accents and extra spaces', () => {
    expect(normalizeName(' ÁNGEL  Núñez ')).toBe(normalizeName('angel nunez'))
  })
})

describe('parseNameList', () => {
  it('skips empty lines and duplicates by normalized name', () => {
    const text = 'Ana\n\n  \nana\nBeatriz\r\nÁNA\nCarlos  Pérez\ncarlos perez'
    expect(parseNameList(text)).toEqual(['Ana', 'Beatriz', 'Carlos Pérez'])
  })

  it('skips names that already exist', () => {
    expect(parseNameList('Ana\nBea', ['ána'])).toEqual(['Bea'])
  })
})

describe('initials', () => {
  it('takes the first letter of the first two words', () => {
    expect(initials('ana maría lópez')).toBe('AM')
    expect(initials('Zoe')).toBe('Z')
    expect(initials('   ')).toBe('')
  })
})
