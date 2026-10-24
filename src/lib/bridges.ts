/**
 * Bridges between groups, marked by hand: a person of group A connects with a person of group B.
 * Each bridge is stored with the group ids in a fixed order so A↔B and B↔A are the same pair.
 */

export interface BridgeLink {
  groupAId: string
  groupBId: string
  personAId: string
  personBId: string
}

/** Orders the pair by group id (swapping the people with their groups) so mirrored bridges match. */
export function normalizeBridge<T extends BridgeLink>(bridge: T): T {
  if (bridge.groupAId <= bridge.groupBId) return bridge
  return {
    ...bridge,
    groupAId: bridge.groupBId,
    groupBId: bridge.groupAId,
    personAId: bridge.personBId,
    personBId: bridge.personAId,
  }
}

export function sameBridge(a: BridgeLink, b: BridgeLink): boolean {
  const x = normalizeBridge(a)
  const y = normalizeBridge(b)
  return (
    x.groupAId === y.groupAId && x.groupBId === y.groupBId && x.personAId === y.personAId && x.personBId === y.personBId
  )
}

export interface BridgePair<T extends BridgeLink> {
  groupAId: string
  groupBId: string
  bridges: T[]
}

/** Bridges grouped by pair of groups, the pairs with more bridges first. */
export function bridgesByPair<T extends BridgeLink>(bridges: readonly T[]): BridgePair<T>[] {
  const pairs = new Map<string, BridgePair<T>>()
  for (const bridge of bridges) {
    const key = `${bridge.groupAId}|${bridge.groupBId}`
    const pair = pairs.get(key) ?? { groupAId: bridge.groupAId, groupBId: bridge.groupBId, bridges: [] }
    pair.bridges.push(bridge)
    pairs.set(key, pair)
  }
  return [...pairs.values()].sort((a, b) => b.bridges.length - a.bridges.length)
}
