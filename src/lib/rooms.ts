import type { Group, Membership, Placement } from '../data/types'
import { normalizeName } from './names'

/** person id -> ids of the groups the person belongs to, in group order. */
export function groupIdsByPerson(memberships: readonly Membership[], groups: readonly Group[]): Map<string, string[]> {
  const order = new Map(groups.map((group, index) => [group.id, index]))
  const result = new Map<string, string[]>()
  for (const membership of memberships) {
    if (!order.has(membership.groupId)) continue
    const list = result.get(membership.personId) ?? []
    list.push(membership.groupId)
    result.set(membership.personId, list)
  }
  for (const list of result.values()) list.sort((a, b) => order.get(a)! - order.get(b)!)
  return result
}

/** person id -> placement, for one participant. */
export function placementsOf(placements: readonly Placement[], participantId: string): Map<string, Placement> {
  return new Map(placements.filter((p) => p.participantId === participantId).map((p) => [p.personId, p]))
}

/** True when no filter is active or the person belongs to one of the selected groups. */
export function passesGroupFilter(personGroupIds: readonly string[], selectedGroupIds: readonly string[]): boolean {
  if (selectedGroupIds.length === 0) return true
  return personGroupIds.some((id) => selectedGroupIds.includes(id))
}

/** Items whose name contains the query (accent-insensitive); all of them for an empty query. */
export function filterByName<T extends { name: string }>(items: readonly T[], query: string): T[] {
  return normalizeName(query) === '' ? [...items] : items.filter((item) => matchesSearch(item.name, query))
}

/** True when the search is not empty and the name contains it (accent-insensitive). */
export function matchesSearch(name: string, search: string): boolean {
  const query = normalizeName(search)
  return query !== '' && normalizeName(name).includes(query)
}
