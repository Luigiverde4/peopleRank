import { describe, expect, it } from 'vitest'
import {
  MAX_DISTANCE,
  consensus,
  controversial,
  dispersion,
  groupStats,
  ingroupBias,
  median,
  selfPerception,
  similarityFromDistance,
  voterAffinity,
  type PlacementRef,
} from './metrics'

const place = (participantId: string, personId: string, x: number, y: number): PlacementRef => ({
  participantId,
  personId,
  x,
  y,
})

describe('median', () => {
  it('handles odd and even lengths without mutating the input', () => {
    const values = [3, 1, 2]
    expect(median(values)).toBe(2)
    expect(values).toEqual([3, 1, 2])
    expect(median([4, 1, 3, 2])).toBe(2.5)
  })

  it('throws on an empty list', () => {
    expect(() => median([])).toThrow()
  })
})

describe('dispersion', () => {
  it('is the root mean square distance to the center', () => {
    // Distances 0.3 and 0.4 from the center: sqrt((0.09 + 0.16) / 2).
    expect(dispersion([{ x: 0.3, y: 0 }, { x: 0, y: 0.4 }], { x: 0, y: 0 })).toBeCloseTo(Math.sqrt(0.125))
  })
})

describe('consensus', () => {
  it('uses the median of x and y and counts votes', () => {
    const [entry] = consensus([place('a', 'p', 0.1, 0.9), place('b', 'p', 0.5, 0.2), place('c', 'p', 0.6, 0.4)])
    expect(entry).toMatchObject({ personId: 'p', x: 0.5, y: 0.4, votes: 3 })
    const expected = Math.sqrt(((0.4 ** 2 + 0.5 ** 2) + 0.2 ** 2 + 0.1 ** 2) / 3)
    expect(entry!.dispersion).toBeCloseTo(expected)
  })

  it('leaves out people without votes', () => {
    expect(consensus([place('a', 'p1', 0.5, 0.5)]).map((e) => e.personId)).toEqual(['p1'])
    expect(consensus([])).toEqual([])
  })

  it('has zero dispersion with a single voter', () => {
    const [entry] = consensus([place('a', 'p', 0.2, 0.7)])
    expect(entry).toMatchObject({ x: 0.2, y: 0.7, votes: 1, dispersion: 0 })
  })
})

describe('controversial', () => {
  it('sorts by dispersion and ignores people with fewer than 2 votes', () => {
    const entries = consensus([
      place('a', 'calm', 0.5, 0.5),
      place('b', 'calm', 0.52, 0.5),
      place('a', 'wild', 0, 0),
      place('b', 'wild', 1, 1),
      place('a', 'single', 0, 1),
    ])
    expect(controversial(entries).map((e) => e.personId)).toEqual(['wild', 'calm'])
  })

  it('returns at most `limit` people', () => {
    const placements = Array.from({ length: 15 }, (_, i) => [
      place('a', `p${i}`, 0, 0),
      place('b', `p${i}`, i / 15, 0),
    ]).flat()
    expect(controversial(consensus(placements))).toHaveLength(10)
  })
})

describe('selfPerception', () => {
  const participants = [
    { id: 'a', personId: 'pa' },
    { id: 'b', personId: null },
    { id: 'c', personId: 'pc' },
  ]

  it('compares my placement of myself with the median of the others', () => {
    const placements = [place('a', 'pa', 0.5, 0.9), place('b', 'pa', 0.5, 0.5), place('c', 'pa', 0.5, 0.3)]
    const [a] = selfPerception(participants, placements)
    expect(a).toMatchObject({ participantId: 'a', self: { x: 0.5, y: 0.9 }, others: { x: 0.5, y: 0.4 } })
    expect(a!.distance).toBeCloseTo(0.5)
    expect(a!.othersVotes).toBe(2)
  })

  it('skips participants without a linked person', () => {
    expect(selfPerception(participants, []).map((s) => s.participantId)).toEqual(['a', 'c'])
  })

  it('returns null distance when I did not place myself or nobody else did (single voter)', () => {
    const onlyMe = selfPerception(participants, [place('a', 'pa', 0.1, 0.1)])
    expect(onlyMe[0]).toMatchObject({ self: { x: 0.1, y: 0.1 }, others: null, distance: null })
    const onlyOthers = selfPerception(participants, [place('b', 'pc', 0.1, 0.1)])
    expect(onlyOthers[1]).toMatchObject({ self: null, others: { x: 0.1, y: 0.1 }, distance: null })
  })
})

describe('ingroupBias', () => {
  // a is person "me", in group g1 with "friend"; "stranger" is in g2.
  const memberships = [
    { personId: 'me', groupId: 'g1' },
    { personId: 'friend', groupId: 'g1' },
    { personId: 'stranger', groupId: 'g2' },
  ]
  const participants = [
    { id: 'a', personId: 'me' },
    { id: 'b', personId: null },
  ]

  it('is positive when I rank my group higher than the others do', () => {
    const placements = [
      place('a', 'friend', 0.5, 0.9),
      place('b', 'friend', 0.5, 0.5),
      place('a', 'stranger', 0.5, 0.3),
      place('b', 'stranger', 0.5, 0.5),
      place('a', 'me', 0.5, 1),
      place('b', 'me', 0.5, 0),
    ]
    const [a] = ingroupBias(participants, placements, memberships)
    expect(a!.inGroupDelta).toBeCloseTo(0.4)
    expect(a!.outGroupDelta).toBeCloseTo(-0.2)
    expect(a!.bias).toBeCloseTo(0.6)
    // My own person does not count.
    expect(a!.inGroupCount + a!.outGroupCount).toBe(2)
  })

  it('skips participants without a linked person', () => {
    expect(ingroupBias(participants, [], memberships).map((b) => b.participantId)).toEqual(['a'])
  })

  it('is null with a single voter or when one side is empty', () => {
    const single = ingroupBias(participants, [place('a', 'friend', 0.5, 0.9)], memberships)
    expect(single[0]).toMatchObject({ bias: null, inGroupCount: 0, outGroupCount: 0 })
    const onlyFriends = ingroupBias(
      participants,
      [place('a', 'friend', 0.5, 0.9), place('b', 'friend', 0.5, 0.5)],
      memberships,
    )
    expect(onlyFriends[0]!.bias).toBeNull()
    expect(onlyFriends[0]!.inGroupDelta).toBeCloseTo(0.4)
  })

  it('treats everyone as out-group when my person has no groups', () => {
    const [result] = ingroupBias(
      [{ id: 'a', personId: 'loner' }, { id: 'b', personId: null }],
      [place('a', 'friend', 0.5, 0.9), place('b', 'friend', 0.5, 0.5)],
      memberships,
    )
    expect(result).toMatchObject({ inGroupCount: 0, outGroupCount: 1, bias: null })
  })
})

describe('voterAffinity', () => {
  const participants = [
    { id: 'a', personId: null },
    { id: 'b', personId: null },
    { id: 'c', personId: null },
  ]
  const people = ['p1', 'p2', 'p3', 'p4', 'p5']

  it('averages the distance over the people both placed', () => {
    const placements = [
      ...people.map((p) => place('a', p, 0.2, 0.2)),
      ...people.map((p) => place('b', p, 0.2, 0.5)),
      place('c', 'p1', 0, 0),
    ]
    const { participantIds, meanDistance } = voterAffinity(participants, placements)
    expect(participantIds).toEqual(['a', 'b', 'c'])
    expect(meanDistance[0]![1]).toBeCloseTo(0.3)
    expect(meanDistance[1]![0]).toBeCloseTo(0.3)
  })

  it('is null on the diagonal and with fewer than 5 people in common', () => {
    const placements = [
      ...people.slice(0, 4).map((p) => place('a', p, 0, 0)),
      ...people.slice(0, 4).map((p) => place('b', p, 1, 1)),
    ]
    const { meanDistance } = voterAffinity(participants, placements)
    expect(meanDistance[0]![0]).toBeNull()
    expect(meanDistance[0]![1]).toBeNull()
    expect(meanDistance[0]![2]).toBeNull()
  })

  it('maps distances to similarity in [0, 1]', () => {
    expect(similarityFromDistance(0)).toBe(1)
    expect(similarityFromDistance(MAX_DISTANCE)).toBeCloseTo(0)
  })
})

describe('groupStats', () => {
  it('reports size and mean consensus position of the members', () => {
    const entries = consensus([place('a', 'p1', 0.2, 0.4), place('a', 'p2', 0.6, 0.8)])
    const stats = groupStats(
      [{ id: 'g1' }, { id: 'g2' }],
      [
        { personId: 'p1', groupId: 'g1' },
        { personId: 'p2', groupId: 'g1' },
        { personId: 'unplaced', groupId: 'g1' },
      ],
      entries,
    )
    expect(stats[0]).toMatchObject({ groupId: 'g1', size: 3 })
    expect(stats[0]!.meanX).toBeCloseTo(0.4)
    expect(stats[0]!.meanY).toBeCloseTo(0.6)
  })

  it('handles empty groups and groups whose members have no votes', () => {
    const stats = groupStats([{ id: 'empty' }, { id: 'novotes' }], [{ personId: 'p', groupId: 'novotes' }], [])
    expect(stats).toEqual([
      { groupId: 'empty', size: 0, meanX: null, meanY: null },
      { groupId: 'novotes', size: 1, meanX: null, meanY: null },
    ])
  })
})
