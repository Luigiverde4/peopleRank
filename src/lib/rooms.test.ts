import { describe, expect, it } from 'vitest'
import type { Group } from '../data/types'
import { groupIdsByPerson, matchesSearch, passesGroupFilter, placementsOf } from './rooms'

const group = (id: string): Group => ({ id, roomId: 'r', name: id, color: '#000', createdAt: '' })

describe('groupIdsByPerson', () => {
  it('lists groups in group order and skips unknown groups', () => {
    const memberships = [
      { personId: 'p1', groupId: 'g2', roomId: 'r' },
      { personId: 'p1', groupId: 'g1', roomId: 'r' },
      { personId: 'p2', groupId: 'gone', roomId: 'r' },
    ]
    const result = groupIdsByPerson(memberships, [group('g1'), group('g2')])
    expect(result.get('p1')).toEqual(['g1', 'g2'])
    expect(result.has('p2')).toBe(false)
  })
})

describe('placementsOf', () => {
  it('keeps only the participant placements', () => {
    const base = { roomId: 'r', x: 0, y: 0, updatedAt: '' }
    const result = placementsOf(
      [
        { ...base, participantId: 'a', personId: 'p1' },
        { ...base, participantId: 'b', personId: 'p2' },
      ],
      'a',
    )
    expect([...result.keys()]).toEqual(['p1'])
  })
})

describe('passesGroupFilter', () => {
  it('passes everyone without filter and members of any selected group otherwise', () => {
    expect(passesGroupFilter([], [])).toBe(true)
    expect(passesGroupFilter(['g1'], ['g2'])).toBe(false)
    expect(passesGroupFilter(['g1', 'g2'], ['g2'])).toBe(true)
  })
})

describe('matchesSearch', () => {
  it('ignores accents and case, and never matches an empty search', () => {
    expect(matchesSearch('Lucía Gómez', 'luc')).toBe(true)
    expect(matchesSearch('Lucía Gómez', 'GOMEZ')).toBe(true)
    expect(matchesSearch('Lucía Gómez', '  ')).toBe(false)
  })
})
