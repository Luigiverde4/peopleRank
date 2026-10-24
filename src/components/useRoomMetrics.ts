import { useMemo } from 'react'
import { computeRoomMetrics } from '../lib/roomMetrics'
import { useRoomStore } from '../store/roomStore'

/** All room metrics, recomputed only when the underlying data changes. */
export function useRoomMetrics() {
  const people = useRoomStore((s) => s.people)
  const groups = useRoomStore((s) => s.groups)
  const memberships = useRoomStore((s) => s.memberships)
  const participants = useRoomStore((s) => s.participants)
  const placements = useRoomStore((s) => s.placements)
  const sharedPlacements = useRoomStore((s) => s.sharedPlacements)
  const mode = useRoomStore((s) => s.room?.mode ?? 'vs')

  return useMemo(
    () => computeRoomMetrics({ mode, people, groups, memberships, participants, placements, sharedPlacements }),
    [mode, people, groups, memberships, participants, placements, sharedPlacements],
  )
}
