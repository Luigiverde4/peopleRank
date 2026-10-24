import type { GroupRef, MembershipRef, PersonRef } from './metrics'

export interface GraphLink {
  source: string
  target: string
  /** Groups both people share, in group order. */
  groupIds: string[]
}

/**
 * Person–person graph projected from groups: one link per pair of people
 * sharing at least one group. People without groups stay as isolated nodes.
 */
export function groupGraph(
  people: readonly PersonRef[],
  groups: readonly GroupRef[],
  memberships: readonly MembershipRef[],
): { nodeIds: string[]; links: GraphLink[] } {
  const personIds = new Set(people.map((p) => p.id))
  const links = new Map<string, GraphLink>()

  for (const group of groups) {
    const members = [
      ...new Set(memberships.filter((m) => m.groupId === group.id && personIds.has(m.personId)).map((m) => m.personId)),
    ].sort()
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const key = `${members[i]}|${members[j]}`
        const link = links.get(key) ?? { source: members[i]!, target: members[j]!, groupIds: [] }
        link.groupIds.push(group.id)
        links.set(key, link)
      }
    }
  }

  return { nodeIds: people.map((p) => p.id), links: [...links.values()] }
}
