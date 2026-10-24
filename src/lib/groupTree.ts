/**
 * Groups form a tree of two levels: top-level groups and their subgroups. Memberships are stored
 * as given; belonging to a subgroup implies belonging to its parent.
 */

export interface GroupNode {
  id: string
  parentId: string | null
}

export interface MembershipLike {
  personId: string
  groupId: string
}

/** Top-level groups, each followed by its subgroups; the original order is kept inside each level. */
export function orderGroups<T extends GroupNode>(groups: readonly T[]): T[] {
  const ids = new Set(groups.map((g) => g.id))
  const isTop = (g: T) => g.parentId === null || !ids.has(g.parentId)
  return groups.filter(isTop).flatMap((top) => [top, ...groups.filter((g) => g.parentId === top.id)])
}

/** group id -> parent id, only for subgroups whose parent exists. */
function parentOf(groups: readonly GroupNode[]): Map<string, string> {
  const ids = new Set(groups.map((g) => g.id))
  return new Map(
    groups.filter((g) => g.parentId !== null && ids.has(g.parentId)).map((g) => [g.id, g.parentId!]),
  )
}

/** Memberships plus the implied ones in each parent group, without duplicates. */
export function expandMemberships<T extends MembershipLike>(memberships: readonly T[], groups: readonly GroupNode[]): T[] {
  const parents = parentOf(groups)
  const seen = new Set<string>()
  const result: T[] = []
  const add = (membership: T) => {
    const key = `${membership.personId}|${membership.groupId}`
    if (seen.has(key)) return
    seen.add(key)
    result.push(membership)
  }
  for (const membership of memberships) {
    add(membership)
    const parent = parents.get(membership.groupId)
    if (parent) add({ ...membership, groupId: parent })
  }
  return result
}

/** Groups to paint on a token: drops a parent when one of its subgroups is already there. */
export function displayGroupIds(groupIds: readonly string[], groups: readonly GroupNode[]): string[] {
  const parents = parentOf(groups)
  const covered = new Set(groupIds.map((id) => parents.get(id)).filter((id): id is string => id !== undefined))
  return groupIds.filter((id) => !covered.has(id))
}

/** A group can become a subgroup only if it has no subgroups of its own (two levels at most). */
export function canBeSubgroup(groupId: string, groups: readonly GroupNode[]): boolean {
  return !groups.some((g) => g.parentId === groupId)
}

function hexToRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.replace('#', ''), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`
}

/** Mixes two hex colors; t = 0 gives `a`, t = 1 gives `b`. */
export function mixHex(a: string, b: string, t: number): string {
  const ca = hexToRgb(a)
  const cb = hexToRgb(b)
  return rgbToHex([0, 1, 2].map((i) => ca[i]! + (cb[i]! - ca[i]!) * t) as [number, number, number])
}

/** Default color for the n-th subgroup: alternating lighter and darker shades of the parent color. */
export function subgroupColor(parentColor: string, index: number): string {
  const step = 0.25 + 0.15 * Math.floor(index / 2)
  return index % 2 === 0 ? mixHex(parentColor, '#ffffff', step) : mixHex(parentColor, '#000000', step)
}
