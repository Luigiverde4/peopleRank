import { useMemo } from 'react'
import {
  bridges,
  consensus,
  controversial,
  groupStats,
  ingroupBias,
  selfPerception,
  voterAffinity,
} from '../lib/metrics'
import { useRoomStore } from '../store/roomStore'

/** All room metrics, recomputed only when the underlying data changes. */
export function useRoomMetrics() {
  const people = useRoomStore((s) => s.people)
  const groups = useRoomStore((s) => s.groups)
  const memberships = useRoomStore((s) => s.memberships)
  const participants = useRoomStore((s) => s.participants)
  const placements = useRoomStore((s) => s.placements)

  return useMemo(() => {
    // Ignore placements of people that no longer exist (deleted while a refetch was pending).
    const personIds = new Set(people.map((p) => p.id))
    const validPlacements = placements.filter((p) => personIds.has(p.personId))
    const consensusEntries = consensus(validPlacements)
    return {
      consensus: consensusEntries,
      controversial: controversial(consensusEntries),
      selfPerception: selfPerception(participants, validPlacements),
      ingroupBias: ingroupBias(participants, validPlacements, memberships),
      voterAffinity: voterAffinity(participants, validPlacements),
      groupStats: groupStats(groups, memberships, consensusEntries),
      bridges: bridges(people, memberships),
    }
  }, [people, groups, memberships, participants, placements])
}
