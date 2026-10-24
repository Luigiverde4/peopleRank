/**
 * Pure aggregation metrics over the placements of a room. Coordinates are
 * normalized to [0, 1] with y = 1 at the top, so the largest possible
 * distance between two points is √2.
 */

export interface Point {
  x: number
  y: number
}

/** Minimal shapes so the metrics can be used (and tested) without the full app types. */
export interface PersonRef {
  id: string
  name: string
}
export interface GroupRef {
  id: string
}
export interface MembershipRef {
  personId: string
  groupId: string
}
export interface ParticipantRef {
  id: string
  personId: string | null
}
export interface PlacementRef {
  participantId: string
  personId: string
  x: number
  y: number
}

export const MAX_DISTANCE = Math.SQRT2

// ---------------------------------------------------------------------------
// Basic helpers
// ---------------------------------------------------------------------------

/** Median of a non-empty list (mean of the two central values for even lengths). */
export function median(values: readonly number[]): number {
  if (values.length === 0) throw new Error('median of an empty list')
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2
}

export function mean(values: readonly number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/** Component-wise median of a non-empty list of points. */
export function medianPoint(points: readonly Point[]): Point {
  return { x: median(points.map((p) => p.x)), y: median(points.map((p) => p.y)) }
}

/** Root mean square distance of the points to `center` (0 for a single point). */
export function dispersion(points: readonly Point[], center: Point): number {
  const squared = points.map((p) => distance(p, center) ** 2)
  return Math.sqrt(mean(squared) ?? 0)
}

/** Converts a mean distance into a similarity in [0, 1] (1 = identical boards). */
export function similarityFromDistance(meanDistance: number): number {
  return 1 - meanDistance / MAX_DISTANCE
}

function groupBy<T>(items: readonly T[], keyOf: (item: T) => string): Map<string, T[]> {
  const result = new Map<string, T[]>()
  for (const item of items) {
    const key = keyOf(item)
    const list = result.get(key)
    if (list) list.push(item)
    else result.set(key, [item])
  }
  return result
}

/** person id -> set of group ids. */
function groupsByPerson(memberships: readonly MembershipRef[]): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>()
  for (const { personId, groupId } of memberships) {
    const set = result.get(personId) ?? new Set<string>()
    set.add(groupId)
    result.set(personId, set)
  }
  return result
}

function sharesAny(a: ReadonlySet<string> | undefined, b: ReadonlySet<string> | undefined): boolean {
  if (!a || !b) return false
  for (const value of a) if (b.has(value)) return true
  return false
}

// ---------------------------------------------------------------------------
// 1. Consensus
// ---------------------------------------------------------------------------

export interface ConsensusEntry extends Point {
  personId: string
  votes: number
  dispersion: number
}

/** Per person with at least one vote: median position, number of votes and dispersion. */
export function consensus(placements: readonly PlacementRef[]): ConsensusEntry[] {
  return [...groupBy(placements, (p) => p.personId)].map(([personId, votes]) => {
    const center = medianPoint(votes)
    return { personId, ...center, votes: votes.length, dispersion: dispersion(votes, center) }
  })
}

// ---------------------------------------------------------------------------
// 2. Controversial
// ---------------------------------------------------------------------------

/** The `limit` people with the highest dispersion among those with at least 2 votes. */
export function controversial(entries: readonly ConsensusEntry[], limit = 10): ConsensusEntry[] {
  return entries
    .filter((entry) => entry.votes >= 2)
    .sort((a, b) => b.dispersion - a.dispersion)
    .slice(0, limit)
}

// ---------------------------------------------------------------------------
// 3. Self-perception
// ---------------------------------------------------------------------------

export interface SelfPerception {
  participantId: string
  personId: string
  /** Where the participant placed themself (null if they didn't). */
  self: Point | null
  /** Median of the other participants' placements of that person (null if nobody else did). */
  others: Point | null
  othersVotes: number
  /** Distance between both points, or null if one is missing. */
  distance: number | null
}

/** For each participant linked to a person: own placement vs. the others' median. */
export function selfPerception(
  participants: readonly ParticipantRef[],
  placements: readonly PlacementRef[],
): SelfPerception[] {
  return participants.flatMap((participant) => {
    const personId = participant.personId
    if (!personId) return []
    const aboutMe = placements.filter((p) => p.personId === personId)
    const mine = aboutMe.find((p) => p.participantId === participant.id)
    const theirs = aboutMe.filter((p) => p.participantId !== participant.id)
    const self = mine ? { x: mine.x, y: mine.y } : null
    const others = theirs.length > 0 ? medianPoint(theirs) : null
    return [
      {
        participantId: participant.id,
        personId,
        self,
        others,
        othersVotes: theirs.length,
        distance: self && others ? distance(self, others) : null,
      },
    ]
  })
}

// ---------------------------------------------------------------------------
// 4. In-group bias
// ---------------------------------------------------------------------------

export interface IngroupBias {
  participantId: string
  /** Mean (my y − others' median y) for people sharing a group with me. */
  inGroupDelta: number | null
  /** Same mean for people not sharing any group with me. */
  outGroupDelta: number | null
  inGroupCount: number
  outGroupCount: number
  /** inGroupDelta − outGroupDelta; positive = favours their own people. Null if a side is empty. */
  bias: number | null
}

/**
 * For each participant linked to a person: how much higher (in y) they place
 * people of their own groups compared with the others' median, minus the same
 * for everyone else. Only people placed by the participant and by at least
 * one other participant count; the participant's own person is excluded.
 */
export function ingroupBias(
  participants: readonly ParticipantRef[],
  placements: readonly PlacementRef[],
  memberships: readonly MembershipRef[],
): IngroupBias[] {
  const groupsOf = groupsByPerson(memberships)
  const byPerson = groupBy(placements, (p) => p.personId)

  return participants.flatMap((participant) => {
    const myPersonId = participant.personId
    if (!myPersonId) return []
    const myGroups = groupsOf.get(myPersonId)
    const inGroup: number[] = []
    const outGroup: number[] = []

    for (const [personId, votes] of byPerson) {
      if (personId === myPersonId) continue
      const mine = votes.find((p) => p.participantId === participant.id)
      const theirs = votes.filter((p) => p.participantId !== participant.id)
      if (!mine || theirs.length === 0) continue
      const delta = mine.y - median(theirs.map((p) => p.y))
      if (sharesAny(myGroups, groupsOf.get(personId))) inGroup.push(delta)
      else outGroup.push(delta)
    }

    const inGroupDelta = mean(inGroup)
    const outGroupDelta = mean(outGroup)
    return [
      {
        participantId: participant.id,
        inGroupDelta,
        outGroupDelta,
        inGroupCount: inGroup.length,
        outGroupCount: outGroup.length,
        bias: inGroupDelta !== null && outGroupDelta !== null ? inGroupDelta - outGroupDelta : null,
      },
    ]
  })
}

// ---------------------------------------------------------------------------
// 5. Voter affinity
// ---------------------------------------------------------------------------

export const MIN_SHARED_FOR_AFFINITY = 5

export interface VoterAffinity {
  participantIds: string[]
  /**
   * meanDistance[i][j]: mean distance between the placements of participants
   * i and j over the people both placed; null on the diagonal or with fewer
   * than `minShared` people in common.
   */
  meanDistance: (number | null)[][]
}

export function voterAffinity(
  participants: readonly ParticipantRef[],
  placements: readonly PlacementRef[],
  minShared = MIN_SHARED_FOR_AFFINITY,
): VoterAffinity {
  const boards = new Map(
    participants.map((participant) => [
      participant.id,
      new Map(placements.filter((p) => p.participantId === participant.id).map((p) => [p.personId, p])),
    ]),
  )

  const pairDistance = (a: string, b: string): number | null => {
    if (a === b) return null
    const boardA = boards.get(a)!
    const boardB = boards.get(b)!
    const distances: number[] = []
    for (const [personId, placementA] of boardA) {
      const placementB = boardB.get(personId)
      if (placementB) distances.push(distance(placementA, placementB))
    }
    return distances.length >= minShared ? mean(distances) : null
  }

  const ids = participants.map((p) => p.id)
  return { participantIds: ids, meanDistance: ids.map((a) => ids.map((b) => pairDistance(a, b))) }
}

// ---------------------------------------------------------------------------
// 6. Group stats
// ---------------------------------------------------------------------------

export interface GroupStats {
  groupId: string
  size: number
  /** Mean consensus position of the members with votes (null if none has votes). */
  meanX: number | null
  meanY: number | null
}

export function groupStats(
  groups: readonly GroupRef[],
  memberships: readonly MembershipRef[],
  entries: readonly ConsensusEntry[],
): GroupStats[] {
  const consensusOf = new Map(entries.map((entry) => [entry.personId, entry]))
  const membersOf = groupBy(memberships, (m) => m.groupId)
  return groups.map((group) => {
    const members = membersOf.get(group.id) ?? []
    const placed = members.flatMap((m) => {
      const entry = consensusOf.get(m.personId)
      return entry ? [entry] : []
    })
    return {
      groupId: group.id,
      size: members.length,
      meanX: mean(placed.map((entry) => entry.x)),
      meanY: mean(placed.map((entry) => entry.y)),
    }
  })
}

// ---------------------------------------------------------------------------
// 7. Bridges
// ---------------------------------------------------------------------------

export interface Bridge {
  personId: string
  groupCount: number
  /** Number of distinct people sharing at least one group with this person. */
  degree: number
}

/** People in 2+ groups, by their degree in the person–person graph projected from groups. */
export function bridges(people: readonly PersonRef[], memberships: readonly MembershipRef[]): Bridge[] {
  const groupsOf = groupsByPerson(memberships)
  const membersOf = groupBy(memberships, (m) => m.groupId)
  const nameOf = new Map(people.map((p) => [p.id, p.name]))

  return people
    .filter((person) => (groupsOf.get(person.id)?.size ?? 0) >= 2)
    .map((person) => {
      const neighbours = new Set<string>()
      for (const groupId of groupsOf.get(person.id)!) {
        for (const member of membersOf.get(groupId) ?? []) {
          if (member.personId !== person.id) neighbours.add(member.personId)
        }
      }
      return { personId: person.id, groupCount: groupsOf.get(person.id)!.size, degree: neighbours.size }
    })
    .sort(
      (a, b) =>
        b.degree - a.degree || (nameOf.get(a.personId) ?? '').localeCompare(nameOf.get(b.personId) ?? ''),
    )
}
