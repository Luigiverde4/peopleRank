import { describe, expect, it } from 'vitest'
import { AppError } from '../lib/appError'
import { en } from './en'
import { es } from './es'
import { describeError } from './index'

describe('defaultRoomName', () => {
  it('uses the day and month with two digits in Spanish', () => {
    expect(es.home.defaultRoomName(new Date(2026, 9, 4))).toBe('Votación del 04/10')
    expect(es.home.defaultRoomName(new Date(2026, 11, 24))).toBe('Votación del 24/12')
  })

  it('uses the short month name in English', () => {
    expect(en.home.defaultRoomName(new Date(2026, 9, 4))).toBe('Vote of 4 Oct')
  })
})

describe('describeError', () => {
  it('translates app errors and keeps their detail', () => {
    expect(describeError(new AppError('bridgeExists'), es)).toBe('Ese puente ya existe')
    expect(describeError(new AppError('bridgeExists'), en)).toBe('That bridge already exists')
    expect(describeError(new AppError('sessionReadFailed', 'lock timeout'), en)).toBe(
      'Could not read your session: lock timeout',
    )
  })

  it('translates the known database exceptions', () => {
    expect(describeError(new Error('Room not found'), es)).toBe('No existe ninguna sala con ese enlace.')
    expect(describeError(new Error('A subgroup cannot contain subgroups'), en)).toBe(
      'A subgroup cannot have subgroups',
    )
  })

  it('shows any other error as it is', () => {
    expect(describeError(new Error('new row violates row-level security policy'), es)).toBe(
      'new row violates row-level security policy',
    )
    expect(describeError('boom', en)).toBe('boom')
  })
})

describe('plurals', () => {
  it('agrees in number in both languages', () => {
    expect(es.people.added(1, 2)).toBe('Añadidas 1 persona · 2 repetidas ignoradas')
    expect(en.people.added(3, 1)).toBe('Added 3 people · 1 duplicate ignored')
    expect(en.bridges.count(1)).toBe('1 bridge')
  })
})
