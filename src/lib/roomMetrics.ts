import type { GameMode } from '../data/types'
import { expandMemberships, orderGroups, type GroupNode } from './groupTree'
import {
  consensus,
  controversial,
  groupStats,
  ingroupBias,
  selfPerception,
  voterAffinity,
  type ParticipantRef,
  type PersonRef,
  type PlacementRef,
} from './metrics'

const SHARED_BOARD_VOTER = 'shared-board'

export interface RoomMetricsInput {
  mode: GameMode
  people: readonly PersonRef[]
  groups: readonly GroupNode[]
  memberships: readonly { personId: string; groupId: string }[]
  participants: readonly ParticipantRef[]
  placements: readonly PlacementRef[]
  sharedPlacements: readonly { personId: string; x: number; y: number }[]
}

/** Every room metric from the room data; used by the stats panel and the HTML report. */
export function computeRoomMetrics(input: RoomMetricsInput) {
  const orderedGroups = orderGroups(input.groups)
  // Subgroup membership counts for the parent group too.
  const memberships = expandMemberships(input.memberships, input.groups)
  // In 'general' rooms the shared board acts as a single voter, so group stats use its positions.
  const boardPlacements =
    input.mode === 'general'
      ? input.sharedPlacements.map((p) => ({ participantId: SHARED_BOARD_VOTER, personId: p.personId, x: p.x, y: p.y }))
      : input.placements
  // Ignore placements of people that no longer exist (deleted while a refetch was pending).
  const personIds = new Set(input.people.map((p) => p.id))
  const validPlacements = boardPlacements.filter((p) => personIds.has(p.personId))
  const consensusEntries = consensus(validPlacements)
  return {
    consensus: consensusEntries,
    controversial: controversial(consensusEntries),
    selfPerception: selfPerception(input.participants, validPlacements),
    ingroupBias: ingroupBias(input.participants, validPlacements, memberships),
    voterAffinity: voterAffinity(input.participants, validPlacements),
    groupStats: groupStats(orderedGroups, memberships, consensusEntries),
  }
}

export type RoomMetrics = ReturnType<typeof computeRoomMetrics>
