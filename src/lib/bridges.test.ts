import { describe, expect, it } from 'vitest'
import { bridgesByPair, normalizeBridge, sameBridge } from './bridges'

describe('normalizeBridge', () => {
  it('orders the groups and swaps the people with them', () => {
    expect(normalizeBridge({ groupAId: 'g2', groupBId: 'g1', personAId: 'ana', personBId: 'bea' })).toEqual({
      groupAId: 'g1',
      groupBId: 'g2',
      personAId: 'bea',
      personBId: 'ana',
    })
  })

  it('keeps bridges that are already ordered', () => {
    const bridge = { groupAId: 'g1', groupBId: 'g2', personAId: 'ana', personBId: 'bea', id: 'x' }
    expect(normalizeBridge(bridge)).toBe(bridge)
  })
})

describe('sameBridge', () => {
  it('treats mirrored bridges as the same one', () => {
    const ab = { groupAId: 'g1', groupBId: 'g2', personAId: 'ana', personBId: 'bea' }
    const ba = { groupAId: 'g2', groupBId: 'g1', personAId: 'bea', personBId: 'ana' }
    expect(sameBridge(ab, ba)).toBe(true)
    expect(sameBridge(ab, { ...ab, personBId: 'carla' })).toBe(false)
  })
})

describe('bridgesByPair', () => {
  it('groups by pair of groups, busiest pair first', () => {
    const bridges = [
      { groupAId: 'g1', groupBId: 'g2', personAId: 'a', personBId: 'b' },
      { groupAId: 'g1', groupBId: 'g3', personAId: 'a', personBId: 'c' },
      { groupAId: 'g1', groupBId: 'g3', personAId: 'd', personBId: 'e' },
    ]
    const pairs = bridgesByPair(bridges)
    expect(pairs.map((p) => [p.groupAId, p.groupBId, p.bridges.length])).toEqual([
      ['g1', 'g3', 2],
      ['g1', 'g2', 1],
    ])
  })

  it('is empty without bridges', () => {
    expect(bridgesByPair([])).toEqual([])
  })
})
