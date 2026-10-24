import { useMemo } from 'react'
import { backend } from '../data'
import type { Person } from '../data/types'
import { displayGroupIds } from '../lib/groupTree'
import { groupIdsByPerson, matchesSearch, passesGroupFilter } from '../lib/rooms'
import { useUiStore } from '../store/uiStore'
import { useGroupTree } from './useGroupTree'

export interface TokenLook {
  ringColors: string[]
  photoUrl: string | null
  dimmed: boolean
  highlighted: boolean
}

/** Shared appearance rules for tokens: group ring, photo, group filter and search. */
export function useTokenStyles() {
  const { orderedGroups, effectiveMemberships } = useGroupTree()
  const groupFilter = useUiStore((s) => s.groupFilter)
  const search = useUiStore((s) => s.search)
  const showNames = useUiStore((s) => s.showNames)

  const groupsOf = useMemo(
    () => groupIdsByPerson(effectiveMemberships, orderedGroups),
    [effectiveMemberships, orderedGroups],
  )
  const colorOf = useMemo(() => new Map(orderedGroups.map((g) => [g.id, g.color])), [orderedGroups])

  return useMemo(() => {
    const lookOf = (person: Person): TokenLook => {
      const groupIds = groupsOf.get(person.id) ?? []
      const highlighted = matchesSearch(person.name, search)
      return {
        ringColors: displayGroupIds(groupIds, orderedGroups).map((id) => colorOf.get(id)!),
        photoUrl: person.photoPath ? backend.photoUrl(person.photoPath) : null,
        dimmed: !highlighted && !passesGroupFilter(groupIds, groupFilter),
        highlighted,
      }
    }
    return { lookOf, showNames }
  }, [groupsOf, colorOf, orderedGroups, search, groupFilter, showNames])
}
