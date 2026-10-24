import { describe, expect, it } from 'vitest'
import { createMemoryBackend } from './memoryBackend'

class FakeStorage implements Storage {
  private items = new Map<string, string>()
  get length() {
    return this.items.size
  }
  clear() {
    this.items.clear()
  }
  getItem(key: string) {
    return this.items.get(key) ?? null
  }
  key(index: number) {
    return [...this.items.keys()][index] ?? null
  }
  removeItem(key: string) {
    this.items.delete(key)
  }
  setItem(key: string, value: string) {
    this.items.set(key, value)
  }
}

async function setupRoom(storage: Storage) {
  const backend = createMemoryBackend(storage)
  await backend.ensureSession()
  const slug = await backend.createRoom('1º B', 'Yo')
  const membership = await backend.findMembership(slug)
  if (!membership) throw new Error('membership not created')
  return { backend, slug, ...membership }
}

describe('memory backend', () => {
  it('creates a room with its creator as participant', async () => {
    const { room, me } = await setupRoom(new FakeStorage())
    expect(room.revealed).toBe(false)
    expect(room.createdBy).toBe(me.userId)
    expect(me.displayName).toBe('Yo')
  })

  it('keeps everything after a reload', async () => {
    const storage = new FakeStorage()
    const { backend, room, me, slug } = await setupRoom(storage)
    const names = Array.from({ length: 60 }, (_, i) => `Persona ${i + 1}`)
    const people = await backend.addPeople(room.id, names)
    const group = await backend.createGroup(room.id, 'Fútbol', '#e11d48')
    await backend.addMemberships([{ personId: people[0]!.id, groupId: group.id, roomId: room.id }])
    for (const person of people) {
      await backend.savePlacement({ participantId: me.id, personId: person.id, roomId: room.id, x: 0.5, y: 0.5 })
    }

    const reloaded = createMemoryBackend(storage)
    const again = await reloaded.findMembership(slug)
    expect(again?.me.id).toBe(me.id)
    expect(await reloaded.fetchPeople(room.id)).toHaveLength(60)
    expect(await reloaded.fetchGroups(room.id)).toHaveLength(1)
    expect(await reloaded.fetchMemberships(room.id)).toHaveLength(1)
    expect(await reloaded.fetchPlacements(room.id)).toHaveLength(60)
  })

  it('upserts placements by participant and person', async () => {
    const { backend, room, me } = await setupRoom(new FakeStorage())
    const [person] = await backend.addPeople(room.id, ['Ana'])
    const key = { participantId: me.id, personId: person!.id, roomId: room.id }
    await backend.savePlacement({ ...key, x: 0.1, y: 0.2 })
    await backend.savePlacement({ ...key, x: 0.9, y: 0.8 })
    const placements = await backend.fetchPlacements(room.id)
    expect(placements).toHaveLength(1)
    expect(placements[0]).toMatchObject({ x: 0.9, y: 0.8 })
    await backend.deletePlacement(me.id, person!.id)
    expect(await backend.fetchPlacements(room.id)).toHaveLength(0)
  })

  it('cascades person and group deletion', async () => {
    const { backend, room, me } = await setupRoom(new FakeStorage())
    const [ana, bea] = await backend.addPeople(room.id, ['Ana', 'Bea'])
    const group = await backend.createGroup(room.id, 'G', '#000000')
    await backend.addMemberships([
      { personId: ana!.id, groupId: group.id, roomId: room.id },
      { personId: bea!.id, groupId: group.id, roomId: room.id },
    ])
    await backend.savePlacement({ participantId: me.id, personId: ana!.id, roomId: room.id, x: 0, y: 0 })
    await backend.updateParticipant(me.id, { personId: ana!.id })

    await backend.deletePerson(ana!.id)
    expect(await backend.fetchPlacements(room.id)).toHaveLength(0)
    expect(await backend.fetchMemberships(room.id)).toHaveLength(1)
    expect((await backend.fetchParticipants(room.id))[0]?.personId).toBeNull()

    await backend.deleteGroup(group.id)
    expect(await backend.fetchMemberships(room.id)).toHaveLength(0)
  })

  it('joining twice returns the same participant', async () => {
    const { backend, slug, me } = await setupRoom(new FakeStorage())
    const joined = await backend.joinRoom(slug, 'Otro nombre')
    expect(joined.me.id).toBe(me.id)
  })
})
