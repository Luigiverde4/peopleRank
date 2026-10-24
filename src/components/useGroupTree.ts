import { useMemo } from 'react'
import { expandMemberships, orderGroups } from '../lib/groupTree'
import { useRoomStore } from '../store/roomStore'

/**
 * Groups in tree order (each subgroup after its parent) and memberships including the ones implied
 * by subgroups. Shared by every view that shows or filters by groups.
 */
export function useGroupTree() {
  const groups = useRoomStore((s) => s.groups)
  const memberships = useRoomStore((s) => s.memberships)

  return useMemo(
    () => ({
      orderedGroups: orderGroups(groups),
      effectiveMemberships: expandMemberships(memberships, groups),
    }),
    [groups, memberships],
  )
}
