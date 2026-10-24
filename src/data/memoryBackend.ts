import { AppError } from '../lib/appError'
import type { DataBackend, RoomConnection, RoomEventHandlers, RoomMembership } from './backend'
import { newId, newSlug } from './ids'
import {
  ROOM_TABLES,
  type Bridge,
  type Group,
  type Membership,
  type Participant,
  type Person,
  type Placement,
  type PresenceEntry,
  type Room,
  type SharedPlacement,
} from './types'

/**
 * Offline backend: a single local user whose data lives in localStorage.
 * There is no other participant, so "blind mode" is trivially satisfied.
 */

export const MEMORY_STORAGE_KEY = 'peopleRank:memory:v1'

interface MemoryDb {
  userId: string
  rooms: Room[]
  participants: Participant[]
  people: Person[]
  groups: Group[]
  memberships: Membership[]
  placements: Placement[]
  sharedPlacements: SharedPlacement[]
  bridges: Bridge[]
  /** Photo path -> data URL. */
  photos: Record<string, string>
}

function emptyDb(): MemoryDb {
  return {
    userId: newId(),
    rooms: [],
    participants: [],
    people: [],
    groups: [],
    memberships: [],
    placements: [],
    sharedPlacements: [],
    bridges: [],
    photos: {},
  }
}

function now(): string {
  return new Date().toISOString()
}

function byCreatedAt<T extends { createdAt: string }>(a: T, b: T): number {
  return a.createdAt.localeCompare(b.createdAt)
}

function sameMembership(a: Membership, b: Membership): boolean {
  return a.personId === b.personId && a.groupId === b.groupId
}

export function createMemoryBackend(storage: Storage | null = globalThis.localStorage ?? null): DataBackend {
  let db = loadDb()

  function loadDb(): MemoryDb {
    try {
      const raw = storage?.getItem(MEMORY_STORAGE_KEY)
      if (!raw) return emptyDb()
      const stored = { ...emptyDb(), ...(JSON.parse(raw) as Partial<MemoryDb>) }
      stored.groups = stored.groups.map((g) => ({ ...g, parentId: g.parentId ?? null }))
      return stored
    } catch {
      return emptyDb()
    }
  }

  function save(): void {
    try {
      storage?.setItem(MEMORY_STORAGE_KEY, JSON.stringify(db))
    } catch (error) {
      console.error('Could not save to localStorage', error)
    }
  }

  /** Reloads (another tab may have written), applies the change and saves. */
  function mutate<T>(change: (current: MemoryDb) => T): T {
    db = loadDb()
    const result = change(db)
    save()
    return result
  }

  function findRoom(roomId: string): Room {
    const room = db.rooms.find((candidate) => candidate.id === roomId)
    if (!room) throw new AppError('roomNotFound')
    return room
  }

  function membershipFor(room: Room): RoomMembership | null {
    const me = db.participants.find((p) => p.roomId === room.id && p.userId === db.userId)
    return me ? { room, me } : null
  }

  function addParticipant(roomId: string, displayName: string): Participant {
    const participant: Participant = {
      id: newId(),
      roomId,
      userId: db.userId,
      displayName,
      personId: null,
      createdAt: now(),
    }
    db.participants.push(participant)
    return participant
  }

  const backend: DataBackend = {
    kind: 'memory',

    async ensureSession() {
      save()
      return db.userId
    },

    async createRoom(name, displayName, mode) {
      const room: Room = {
        id: newId(),
        slug: newSlug(),
        name,
        createdBy: db.userId,
        revealed: false,
        mode,
        createdAt: now(),
      }
      mutate((current) => {
        current.rooms.push(room)
        addParticipant(room.id, displayName)
      })
      return room.slug
    },

    async joinRoom(slug, displayName) {
      db = loadDb()
      const room = db.rooms.find((candidate) => candidate.slug === slug)
      if (!room) throw new AppError('roomNotFound')
      const existing = membershipFor(room)
      if (existing) return existing
      const me = mutate(() => addParticipant(room.id, displayName))
      return { room, me }
    },

    async findMembership(slug) {
      db = loadDb()
      const room = db.rooms.find((candidate) => candidate.slug === slug)
      return room ? membershipFor(room) : null
    },

    async fetchRoom(roomId) {
      db = loadDb()
      return { ...findRoom(roomId) }
    },

    async fetchParticipants(roomId) {
      db = loadDb()
      return db.participants.filter((p) => p.roomId === roomId).sort(byCreatedAt)
    },

    async fetchPeople(roomId) {
      db = loadDb()
      return db.people.filter((p) => p.roomId === roomId).sort(byCreatedAt)
    },

    async fetchGroups(roomId) {
      db = loadDb()
      return db.groups.filter((g) => g.roomId === roomId).sort(byCreatedAt)
    },

    async fetchMemberships(roomId) {
      db = loadDb()
      return db.memberships.filter((m) => m.roomId === roomId)
    },

    async fetchPlacements(roomId) {
      db = loadDb()
      return db.placements.filter((p) => p.roomId === roomId)
    },

    async addPeople(roomId, names) {
      const createdAt = now()
      const people = names.map<Person>((name) => ({ id: newId(), roomId, name, photoPath: null, createdAt }))
      mutate((current) => current.people.push(...people))
      return people
    },

    async renamePerson(personId, name) {
      mutate((current) => {
        const person = current.people.find((p) => p.id === personId)
        if (person) person.name = name
      })
    },

    async deletePerson(personId) {
      mutate((current) => {
        const photoPath = current.people.find((p) => p.id === personId)?.photoPath
        if (photoPath) delete current.photos[photoPath]
        current.people = current.people.filter((p) => p.id !== personId)
        current.memberships = current.memberships.filter((m) => m.personId !== personId)
        current.placements = current.placements.filter((p) => p.personId !== personId)
        current.sharedPlacements = current.sharedPlacements.filter((p) => p.personId !== personId)
        current.bridges = current.bridges.filter((b) => b.personAId !== personId && b.personBId !== personId)
        for (const participant of current.participants) {
          if (participant.personId === personId) participant.personId = null
        }
      })
    },

    async setPersonPhoto(personId, photoPath) {
      mutate((current) => {
        const person = current.people.find((p) => p.id === personId)
        if (!person) return
        if (person.photoPath && person.photoPath !== photoPath) delete current.photos[person.photoPath]
        person.photoPath = photoPath
      })
    },

    async createGroup(roomId, name, color, parentId = null) {
      const group: Group = { id: newId(), roomId, name, color, parentId, createdAt: now() }
      mutate((current) => {
        assertValidParent(current.groups, group.id, parentId)
        current.groups.push(group)
      })
      return group
    },

    async updateGroup(groupId, patch) {
      mutate((current) => {
        const group = current.groups.find((g) => g.id === groupId)
        if (!group) return
        if (patch.parentId !== undefined) assertValidParent(current.groups, groupId, patch.parentId)
        Object.assign(group, patch)
      })
    },

    async deleteGroup(groupId) {
      mutate((current) => {
        // Like the database: subgroups of a deleted group become top-level groups.
        for (const group of current.groups) if (group.parentId === groupId) group.parentId = null
        current.groups = current.groups.filter((g) => g.id !== groupId)
        current.bridges = current.bridges.filter((b) => b.groupAId !== groupId && b.groupBId !== groupId)
        current.memberships = current.memberships.filter((m) => m.groupId !== groupId)
      })
    },

    async fetchBridges(roomId) {
      db = loadDb()
      return db.bridges.filter((b) => b.roomId === roomId)
    },

    async createBridge(bridge) {
      mutate((current) => {
        const duplicate = current.bridges.some(
          (b) =>
            b.groupAId === bridge.groupAId &&
            b.groupBId === bridge.groupBId &&
            b.personAId === bridge.personAId &&
            b.personBId === bridge.personBId,
        )
        if (duplicate) throw new AppError('bridgeExists')
        current.bridges.push({ ...bridge, id: newId(), createdAt: now() })
      })
    },

    async deleteBridge(bridgeId) {
      mutate((current) => {
        current.bridges = current.bridges.filter((b) => b.id !== bridgeId)
      })
    },

    async addMemberships(memberships) {
      mutate((current) => {
        for (const membership of memberships) {
          if (!current.memberships.some((m) => sameMembership(m, membership))) {
            current.memberships.push(membership)
          }
        }
      })
    },

    async removeMemberships(memberships) {
      mutate((current) => {
        current.memberships = current.memberships.filter(
          (m) => !memberships.some((removed) => sameMembership(m, removed)),
        )
      })
    },

    async savePlacement(placement) {
      mutate((current) => {
        current.placements = current.placements.filter(
          (p) => !(p.participantId === placement.participantId && p.personId === placement.personId),
        )
        current.placements.push({ ...placement, updatedAt: now() })
      })
    },

    async deletePlacement(participantId, personId) {
      mutate((current) => {
        current.placements = current.placements.filter(
          (p) => !(p.participantId === participantId && p.personId === personId),
        )
      })
    },

    async fetchSharedPlacements(roomId) {
      db = loadDb()
      return db.sharedPlacements.filter((p) => p.roomId === roomId)
    },

    async saveSharedPlacement(placement) {
      mutate((current) => {
        const room = current.rooms.find((r) => r.id === placement.roomId)
        if (room?.mode !== 'general') throw new AppError('noSharedBoard')
        current.sharedPlacements = current.sharedPlacements.filter(
          (p) => !(p.roomId === placement.roomId && p.personId === placement.personId),
        )
        current.sharedPlacements.push({ ...placement, updatedAt: now() })
      })
    },

    async deleteSharedPlacement(roomId, personId) {
      mutate((current) => {
        current.sharedPlacements = current.sharedPlacements.filter(
          (p) => !(p.roomId === roomId && p.personId === personId),
        )
      })
    },

    async updateParticipant(participantId, patch) {
      mutate((current) => {
        const participant = current.participants.find((p) => p.id === participantId)
        if (participant) Object.assign(participant, patch)
      })
    },

    async revealRoom(roomId) {
      mutate((current) => {
        const room = current.rooms.find((r) => r.id === roomId)
        if (room) room.revealed = true
      })
    },

    async uploadPhoto(roomId, photo) {
      const path = `${roomId}/${newId()}.webp`
      const dataUrl = await blobToDataUrl(photo)
      mutate((current) => {
        current.photos[path] = dataUrl
      })
      return path
    },

    photoUrl(photoPath) {
      return db.photos[photoPath] ?? ''
    },

    connectRoom(_roomId: string, presence: PresenceEntry, handlers: RoomEventHandlers): RoomConnection {
      handlers.onPresence([presence])
      // Other tabs of the same browser write to the same storage key.
      const onStorage = (event: StorageEvent) => {
        if (event.key !== MEMORY_STORAGE_KEY) return
        db = loadDb()
        ROOM_TABLES.forEach((table) => handlers.onTableChange(table))
      }
      globalThis.addEventListener?.('storage', onStorage)
      return {
        sendDrag: () => {},
        disconnect: () => globalThis.removeEventListener?.('storage', onStorage),
      }
    },
  }

  return backend
}

/** Same two-level rule the database enforces with a trigger. */
function assertValidParent(groups: Group[], groupId: string, parentId: string | null): void {
  if (parentId === null) return
  const parent = groups.find((g) => g.id === parentId)
  if (!parent || parentId === groupId) throw new AppError('invalidParent')
  if (parent.parentId !== null) throw new AppError('subgroupCannotNest')
  if (groups.some((g) => g.parentId === groupId)) throw new AppError('parentCannotNest')
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}
