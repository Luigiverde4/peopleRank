import { describe, expect, it } from 'vitest'
import {
  canBeSubgroup,
  displayGroupIds,
  expandMemberships,
  mixHex,
  orderGroups,
  subgroupColor,
} from './groupTree'

// Friends group A, with a closer trio of girls as subgroup A1; B is another top-level group.
const groups = [
  { id: 'A1', parentId: 'A' },
  { id: 'B', parentId: null },
  { id: 'A', parentId: null },
]

describe('orderGroups', () => {
  it('puts each subgroup right after its parent', () => {
    expect(orderGroups(groups).map((g) => g.id)).toEqual(['B', 'A', 'A1'])
  })

  it('treats a subgroup whose parent is gone as top-level', () => {
    expect(orderGroups([{ id: 'X', parentId: 'gone' }]).map((g) => g.id)).toEqual(['X'])
  })
})

describe('expandMemberships', () => {
  it('adds the implied membership in the parent group once', () => {
    const memberships = [
      { personId: 'girl', groupId: 'A1' },
      { personId: 'girl', groupId: 'A' },
      { personId: 'boy', groupId: 'A' },
    ]
    expect(expandMemberships(memberships, groups)).toEqual([
      { personId: 'girl', groupId: 'A1' },
      { personId: 'girl', groupId: 'A' },
      { personId: 'boy', groupId: 'A' },
    ])
    expect(expandMemberships([{ personId: 'girl', groupId: 'A1' }], groups)).toEqual([
      { personId: 'girl', groupId: 'A1' },
      { personId: 'girl', groupId: 'A' },
    ])
  })
})

describe('displayGroupIds', () => {
  it('shows the subgroup instead of its parent', () => {
    expect(displayGroupIds(['A1', 'A', 'B'], groups)).toEqual(['A1', 'B'])
    expect(displayGroupIds(['A'], groups)).toEqual(['A'])
  })
})

describe('canBeSubgroup', () => {
  it('refuses groups that already have subgroups', () => {
    expect(canBeSubgroup('A', groups)).toBe(false)
    expect(canBeSubgroup('B', groups)).toBe(true)
  })
})

describe('colors', () => {
  it('mixes hex colors', () => {
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080')
    expect(mixHex('#e11d48', '#e11d48', 0.7)).toBe('#e11d48')
  })

  it('alternates lighter and darker shades for subgroups', () => {
    expect(subgroupColor('#000000', 0)).toBe(mixHex('#000000', '#ffffff', 0.25))
    expect(subgroupColor('#ffffff', 1)).toBe(mixHex('#ffffff', '#000000', 0.25))
    expect(subgroupColor('#000000', 2)).toBe(mixHex('#000000', '#ffffff', 0.4))
  })
})
