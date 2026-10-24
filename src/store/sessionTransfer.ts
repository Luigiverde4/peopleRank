import { backend } from '../data'
import type { Membership } from '../data/types'
import { normalizeBridge } from '../lib/bridges'
import { orderGroups } from '../lib/groupTree'
import { buildSessionFile, type SessionFile } from '../lib/session'
import { useRoomStore } from './roomStore'

/** Writes are sent in small batches so a big room imports quickly without flooding the API. */
const BATCH_SIZE = 25

async function inBatches<T>(items: readonly T[], run: (item: T) => Promise<void>): Promise<void> {
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    await Promise.all(items.slice(i, i + BATCH_SIZE).map(run))
  }
}

/** Snapshot of the open room, with everything the current participant can see. */
export function currentSessionFile(): SessionFile {
  const { room, me, people, groups, memberships, bridges, participants, placements, sharedPlacements } =
    useRoomStore.getState()
  if (!room) throw new Error('No hay ninguna sala abierta')
  return buildSessionFile(
    {
      room: { name: room.name, mode: room.mode, revealed: room.revealed },
      exportedBy: me?.id ?? null,
      people: people.map(({ id, name }) => ({ id, name })),
      groups: groups.map(({ id, name, color, parentId }) => ({ id, name, color, parentId })),
      memberships: memberships.map(({ personId, groupId }) => ({ personId, groupId })),
      bridges: bridges.map(({ groupAId, groupBId, personAId, personBId }) => ({
        groupAId,
        groupBId,
        personAId,
        personBId,
      })),
      participants: participants.map(({ id, displayName, personId }) => ({ id, displayName, personId })),
      placements: placements.map(({ participantId, personId, x, y }) => ({ participantId, personId, x, y })),
      sharedPlacements: sharedPlacements.map(({ personId, x, y }) => ({ personId, x, y })),
    },
    new Date(),
  )
}

/**
 * Creates a new room (same mode) from a session file and returns its slug. People, groups,
 * subgroups, memberships and bridges are restored; so is the shared board ('general') or the
 * exporter's own board ('vs'), which becomes the importer's. Other participants' boards cannot be
 * moved: their anonymous identities belong to the old room.
 */
export async function importSession(file: SessionFile, displayName: string): Promise<string> {
  const slug = await backend.createRoom(file.room.name, displayName, file.room.mode)
  const membership = await backend.findMembership(slug)
  if (!membership) throw new Error('No se pudo crear la sala')
  const { room, me } = membership

  const created = await backend.addPeople(
    room.id,
    file.people.map((p) => p.name),
  )
  // Matched by name (not by position) so the mapping does not depend on the insert's return order.
  const newIdsByName = new Map<string, string[]>()
  for (const person of created) newIdsByName.set(person.name, [...(newIdsByName.get(person.name) ?? []), person.id])
  const personId = new Map<string, string>()
  for (const person of file.people) {
    const newId = newIdsByName.get(person.name)?.shift()
    if (newId) personId.set(person.id, newId)
  }

  const exporter = file.participants.find((p) => p.id === file.exportedBy)
  const myPerson = exporter?.personId ? personId.get(exporter.personId) : undefined
  if (myPerson) await backend.updateParticipant(me.id, { personId: myPerson })

  // Parents before subgroups, so the new parent ids exist.
  const groupId = new Map<string, string>()
  for (const group of orderGroups(file.groups)) {
    const parent = group.parentId ? (groupId.get(group.parentId) ?? null) : null
    const newGroup = await backend.createGroup(room.id, group.name, group.color, parent)
    groupId.set(group.id, newGroup.id)
  }

  const memberships: Membership[] = file.memberships.flatMap((m) => {
    const person = personId.get(m.personId)
    const group = groupId.get(m.groupId)
    return person && group ? [{ personId: person, groupId: group, roomId: room.id }] : []
  })
  await backend.addMemberships(memberships)

  await inBatches(file.bridges, async (bridge) => {
    const ids = {
      groupAId: groupId.get(bridge.groupAId),
      groupBId: groupId.get(bridge.groupBId),
      personAId: personId.get(bridge.personAId),
      personBId: personId.get(bridge.personBId),
    }
    if (!ids.groupAId || !ids.groupBId || !ids.personAId || !ids.personBId) return
    const normalized = normalizeBridge({
      groupAId: ids.groupAId,
      groupBId: ids.groupBId,
      personAId: ids.personAId,
      personBId: ids.personBId,
    })
    await backend.createBridge({ ...normalized, roomId: room.id })
  })

  if (file.room.mode === 'general') {
    await inBatches(file.sharedPlacements, async (placement) => {
      const person = personId.get(placement.personId)
      if (!person) return
      await backend.saveSharedPlacement({
        roomId: room.id,
        personId: person,
        x: placement.x,
        y: placement.y,
        updatedBy: me.id,
      })
    })
  } else {
    const mine = file.placements.filter((p) => p.participantId === file.exportedBy)
    await inBatches(mine, async (placement) => {
      const person = personId.get(placement.personId)
      if (!person) return
      await backend.savePlacement({
        participantId: me.id,
        personId: person,
        roomId: room.id,
        x: placement.x,
        y: placement.y,
      })
    })
  }

  return slug
}
