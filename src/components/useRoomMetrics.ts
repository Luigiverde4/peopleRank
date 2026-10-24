import { useMemo } from 'react'
import {
  consensus,
  controversial,
  groupStats,
  ingroupBias,
  selfPerception,
  voterAffinity,
} from '../lib/metrics'
import { useRoomStore } from '../store/roomStore'
import { useGroupTree } from './useGroupTree'

const SHARED_BOARD_VOTER = 'shared-board'

/** All room metrics, recomputed only when the underlying data changes. */
export function useRoomMetrics() {
  const people = useRoomStore((s) => s.people)
  const { orderedGroups, effectiveMemberships } = useGroupTree()
  const participants = useRoomStore((s) => s.participants)
  const placements = useRoomStore((s) => s.placements)
  const sharedPlacements = useRoomStore((s) => s.sharedPlacements)
  const mode = useRoomStore((s) => s.room?.mode ?? 'vs')

  return useMemo(() => {
    // In 'general' rooms the shared board acts as a single voter, so group stats use its positions.
    const boardPlacements =
      mode === 'general'
        ? sharedPlacements.map((p) => ({ participantId: SHARED_BOARD_VOTER, personId: p.personId, x: p.x, y: p.y }))
        : placements
    // Ignore placements of people that no longer exist (deleted while a refetch was pending).
    const personIds = new Set(people.map((p) => p.id))
    const validPlacements = boardPlacements.filter((p) => personIds.has(p.personId))
    const consensusEntries = consensus(validPlacements)
    return {
      consensus: consensusEntries,
      controversial: controversial(consensusEntries),
      selfPerception: selfPerception(participants, validPlacements),
      ingroupBias: ingroupBias(participants, validPlacements, effectiveMemberships),
      voterAffinity: voterAffinity(participants, validPlacements),
      groupStats: groupStats(orderedGroups, effectiveMemberships, consensusEntries),
    }
  }, [people, orderedGroups, effectiveMemberships, participants, placements, sharedPlacements, mode])
}
