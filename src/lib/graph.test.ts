import { describe, expect, it } from 'vitest'
import { groupGraph } from './graph'

const people = ['a', 'b', 'c', 'd'].map((id) => ({ id, name: id }))

describe('groupGraph', () => {
  it('links every pair inside a group, once per pair', () => {
    const memberships = [
      { personId: 'a', groupId: 'g1' },
      { personId: 'b', groupId: 'g1' },
      { personId: 'c', groupId: 'g1' },
      { personId: 'a', groupId: 'g2' },
      { personId: 'b', groupId: 'g2' },
    ]
    const { nodeIds, links } = groupGraph(people, [{ id: 'g1' }, { id: 'g2' }], memberships)
    expect(nodeIds).toEqual(['a', 'b', 'c', 'd'])
    expect(links).toEqual([
      { source: 'a', target: 'b', groupIds: ['g1', 'g2'] },
      { source: 'a', target: 'c', groupIds: ['g1'] },
      { source: 'b', target: 'c', groupIds: ['g1'] },
    ])
  })

  it('ignores memberships of unknown people or groups and empty groups', () => {
    const memberships = [
      { personId: 'a', groupId: 'g1' },
      { personId: 'ghost', groupId: 'g1' },
      { personId: 'b', groupId: 'unknown' },
    ]
    expect(groupGraph(people, [{ id: 'g1' }, { id: 'empty' }], memberships).links).toEqual([])
  })
})
