import { useMemo } from 'react'
import { backend } from '../data'
import type { Person } from '../data/types'
import { groupIdsByPerson, matchesSearch, passesGroupFilter } from '../lib/rooms'
import { useRoomStore } from '../store/roomStore'
import { useUiStore } from '../store/uiStore'

export interface TokenLook {
  ringColors: string[]
  photoUrl: string | null
  dimmed: boolean
  highlighted: boolean
}

/** Shared appearance rules for tokens: group ring, photo, group filter and search. */
export function useTokenStyles() {
  const groups = useRoomStore((s) => s.groups)
  const memberships = useRoomStore((s) => s.memberships)
  const groupFilter = useUiStore((s) => s.groupFilter)
  const search = useUiStore((s) => s.search)
  const showNames = useUiStore((s) => s.showNames)

  const groupsOf = useMemo(() => groupIdsByPerson(memberships, groups), [memberships, groups])
  const colorOf = useMemo(() => new Map(groups.map((g) => [g.id, g.color])), [groups])

  return useMemo(() => {
    const lookOf = (person: Person): TokenLook => {
      const groupIds = groupsOf.get(person.id) ?? []
      const highlighted = matchesSearch(person.name, search)
      return {
        ringColors: groupIds.map((id) => colorOf.get(id)!),
        photoUrl: person.photoPath ? backend.photoUrl(person.photoPath) : null,
        dimmed: !highlighted && !passesGroupFilter(groupIds, groupFilter),
        highlighted,
      }
    }
    return { lookOf, showNames }
  }, [groupsOf, colorOf, search, groupFilter, showNames])
}
