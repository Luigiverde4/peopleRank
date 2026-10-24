import { create } from 'zustand'
import { backend } from '../data'
import type { RoomConnection } from '../data/backend'
import type {
  Bridge,
  DragMessage,
  Group,
  Membership,
  Participant,
  Person,
  Placement,
  PresenceEntry,
  Room,
  RoomTable,
  SharedPlacement,
} from '../data/types'
import { ROOM_TABLES } from '../data/types'
import { AppError } from '../lib/appError'
import { normalizeBridge, sameBridge, type BridgeLink } from '../lib/bridges'
import { nextGroupColor } from '../lib/colors'
import type { BoardPoint } from '../lib/geometry'
import { parseGroupShortcut } from '../lib/groupShortcut'
import { subgroupColor } from '../lib/groupTree'
import { cleanName, normalizeName, parseNameList } from '../lib/names'
import { resizeToWebp } from '../lib/photo'
import { matchPhotos, photoNameFromPath } from '../lib/photoMatch'
import { throttle } from '../lib/throttle'

const REFETCH_DEBOUNCE_MS = 200
const PHOTO_IMPORT_BATCH = 4

/** A photo to import: its file name (to match a person) and a way to read it. */
export interface PhotoSource {
  name: string
  load(): Promise<Blob>
}
const DRAG_BROADCAST_INTERVAL_MS = 1000 / 15

export interface RoomState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  /** Last failure, shown as a banner (translated by the UI). */
  error: Error | null
  room: Room | null
  me: Participant | null
  participants: Participant[]
  people: Person[]
  groups: Group[]
  memberships: Membership[]
  placements: Placement[]
  /** Shared board of a 'general' room. */
  sharedPlacements: SharedPlacement[]
  bridges: Bridge[]
  online: PresenceEntry[]
  /** Provisional positions from other participants' drags, keyed by `${participantId}:${personId}`. */
  liveDrags: Record<string, DragMessage>
}

export interface RoomActions {
  open(room: Room, me: Participant): Promise<void>
  close(): void
  refetch(table: RoomTable): Promise<void>

  addPeopleFromText(text: string): Promise<number>
  renamePerson(personId: string, name: string): Promise<void>
  deletePerson(personId: string): Promise<void>
  setPersonGroups(personId: string, groupIds: string[]): Promise<void>
  setMembership(personId: string, groupId: string, member: boolean): Promise<void>
  /** Resizes the image to a 256×256 WebP, uploads it and links it; null removes the photo. */
  setPersonPhoto(personId: string, image: Blob | null): Promise<void>
  /**
   * Gives each person the photo whose file is named like them (e.g. a class photo folder).
   * Reports progress as photos are uploaded; returns how many were assigned and the unmatched names.
   */
  importPhotos(
    images: PhotoSource[],
    onProgress?: (done: number, total: number) => void,
  ): Promise<{ assigned: number; unmatched: string[]; failed: string[] }>

  /** Returns the new group id (null if the name is empty or the insert failed). */
  createGroup(name: string, color?: string, parentId?: string | null): Promise<string | null>
  updateGroup(groupId: string, patch: { name?: string; color?: string; parentId?: string | null }): Promise<void>
  deleteGroup(groupId: string): Promise<void>
  applyGroupShortcut(text: string): Promise<{ groups: number; people: number }>

  /** Marks a person of group A and a person of group B as a bridge between both groups. */
  addBridge(bridge: BridgeLink): Promise<void>
  removeBridge(bridgeId: string): Promise<void>

  /** Drag, place and unplace act on my board in 'vs' rooms and on the shared board in 'general' rooms. */
  dragPerson(personId: string, point: BoardPoint | null): void
  placePerson(personId: string, point: BoardPoint): Promise<void>
  unplacePerson(personId: string): Promise<void>

  setMyPerson(personId: string | null): Promise<void>
  reveal(): Promise<void>
}

export type RoomStore = RoomState & RoomActions

const initialState: RoomState = {
  status: 'idle',
  error: null,
  room: null,
  me: null,
  participants: [],
  people: [],
  groups: [],
  memberships: [],
  placements: [],
  sharedPlacements: [],
  bridges: [],
  online: [],
  liveDrags: {},
}

let connection: RoomConnection | null = null
const refetchTimers = new Map<RoomTable, ReturnType<typeof setTimeout>>()

function dragKey(participantId: string, personId: string): string {
  return `${participantId}:${personId}`
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}

export const useRoomStore = create<RoomStore>()((set, get) => {
  const requireRoom = (): { room: Room; me: Participant } => {
    const { room, me } = get()
    if (!room || !me) throw new AppError('noOpenRoom')
    return { room, me }
  }

  const scheduleRefetch = (table: RoomTable) => {
    clearTimeout(refetchTimers.get(table))
    refetchTimers.set(
      table,
      setTimeout(() => {
        refetchTimers.delete(table)
        void get().refetch(table)
      }, REFETCH_DEBOUNCE_MS),
    )
  }

  const refetchAll = async () => {
    await Promise.all(ROOM_TABLES.map((table) => get().refetch(table)))
  }

  const broadcastDrag = throttle((message: DragMessage) => connection?.sendDrag(message), DRAG_BROADCAST_INTERVAL_MS)

  const placeOnSharedBoard = async (room: Room, me: Participant, personId: string, point: BoardPoint) => {
    const placement: SharedPlacement = {
      roomId: room.id,
      personId,
      x: point.x,
      y: point.y,
      updatedBy: me.id,
      updatedAt: new Date().toISOString(),
    }
    set((state) => ({
      sharedPlacements: [...state.sharedPlacements.filter((p) => p.personId !== personId), placement],
    }))
    try {
      await backend.saveSharedPlacement(placement)
    } catch (error) {
      set({ error: toError(error) })
      await get().refetch('shared_placements')
    }
  }

  const unplaceFromSharedBoard = async (room: Room, personId: string) => {
    set((state) => ({ sharedPlacements: state.sharedPlacements.filter((p) => p.personId !== personId) }))
    try {
      await backend.deleteSharedPlacement(room.id, personId)
    } catch (error) {
      set({ error: toError(error) })
      await get().refetch('shared_placements')
    }
  }

  /** Runs a mutation and refetches the tables it touches, keeping the error visible. */
  const mutate = async (tables: RoomTable[], run: () => Promise<void>) => {
    try {
      await run()
    } catch (error) {
      set({ error: toError(error) })
    }
    await Promise.all(tables.map((table) => get().refetch(table)))
  }

  return {
    ...initialState,

    async open(room, me) {
      get().close()
      set({ ...initialState, status: 'loading', room, me })
      connection = backend.connectRoom(
        room.id,
        { participantId: me.id, displayName: me.displayName },
        {
          onTableChange: scheduleRefetch,
          onPresence: (online) => set({ online }),
          onDrag: (message) => {
            if (message.participantId === get().me?.id) return
            set((state) => ({
              liveDrags: { ...state.liveDrags, [dragKey(message.participantId, message.personId)]: message },
            }))
          },
          onReconnect: () => void refetchAll(),
        },
      )
      try {
        await refetchAll()
        set({ status: 'ready' })
      } catch (error) {
        set({ status: 'error', error: toError(error) })
      }
    },

    close() {
      connection?.disconnect()
      connection = null
      broadcastDrag.cancel()
      refetchTimers.forEach((timer) => clearTimeout(timer))
      refetchTimers.clear()
      set(initialState)
    },

    async refetch(table) {
      const roomId = get().room?.id
      const mode = get().room?.mode
      if (!roomId) return
      switch (table) {
        case 'rooms': {
          const room = await backend.fetchRoom(roomId)
          const wasRevealed = get().room?.revealed ?? false
          set({ room })
          if (room.revealed && !wasRevealed) await get().refetch('placements')
          break
        }
        case 'participants': {
          const participants = await backend.fetchParticipants(roomId)
          const myId = get().me?.id
          set({ participants, me: participants.find((p) => p.id === myId) ?? get().me })
          break
        }
        case 'people':
          set({ people: await backend.fetchPeople(roomId) })
          break
        case 'groups':
          set({ groups: await backend.fetchGroups(roomId) })
          break
        case 'person_groups':
          set({ memberships: await backend.fetchMemberships(roomId) })
          break
        case 'placements': {
          if (mode !== 'vs') break
          const placements = await backend.fetchPlacements(roomId)
          // Settled placements replace provisional drags; active drags resend within ~66 ms.
          set({ placements, liveDrags: {} })
          break
        }
        case 'bridges':
          set({ bridges: await backend.fetchBridges(roomId) })
          break
        case 'shared_placements': {
          if (mode !== 'general') break
          set({ sharedPlacements: await backend.fetchSharedPlacements(roomId), liveDrags: {} })
          break
        }
      }
    },

    async addPeopleFromText(text) {
      const { room } = requireRoom()
      const names = parseNameList(
        text,
        get().people.map((person) => person.name),
      )
      if (names.length === 0) return 0
      await mutate(['people'], async () => {
        await backend.addPeople(room.id, names)
      })
      return names.length
    },

    async renamePerson(personId, name) {
      const cleaned = cleanName(name)
      if (cleaned === '') return
      await mutate(['people'], () => backend.renamePerson(personId, cleaned))
    },

    async deletePerson(personId) {
      set((state) => ({
        people: state.people.filter((p) => p.id !== personId),
        placements: state.placements.filter((p) => p.personId !== personId),
        sharedPlacements: state.sharedPlacements.filter((p) => p.personId !== personId),
      }))
      await mutate(['people', 'person_groups', 'placements', 'shared_placements', 'bridges', 'participants'], () =>
        backend.deletePerson(personId),
      )
    },

    async setPersonGroups(personId, groupIds) {
      const { room } = requireRoom()
      const current = get()
        .memberships.filter((m) => m.personId === personId)
        .map((m) => m.groupId)
      const toAdd = groupIds.filter((id) => !current.includes(id))
      const toRemove = current.filter((id) => !groupIds.includes(id))
      const asMembership = (groupId: string): Membership => ({ personId, groupId, roomId: room.id })
      set((state) => ({
        memberships: [...state.memberships.filter((m) => m.personId !== personId), ...groupIds.map(asMembership)],
      }))
      await mutate(['person_groups'], async () => {
        if (toAdd.length > 0) await backend.addMemberships(toAdd.map(asMembership))
        if (toRemove.length > 0) await backend.removeMemberships(toRemove.map(asMembership))
      })
    },

    async importPhotos(images, onProgress) {
      const { room } = requireRoom()
      const { matched, unmatched } = matchPhotos(images, (image) => image.name, get().people)
      const failed: string[] = []
      let done = 0
      onProgress?.(0, matched.length)
      // A few at a time: resizing runs on the main thread and each upload is a request.
      for (let i = 0; i < matched.length; i += PHOTO_IMPORT_BATCH) {
        await Promise.all(
          matched.slice(i, i + PHOTO_IMPORT_BATCH).map(async ({ file, personId }) => {
            try {
              const path = await backend.uploadPhoto(room.id, await resizeToWebp(await file.load()))
              await backend.setPersonPhoto(personId, path)
            } catch {
              failed.push(photoNameFromPath(file.name))
            }
            done += 1
            onProgress?.(done, matched.length)
          }),
        )
      }
      await get().refetch('people')
      return {
        assigned: matched.length - failed.length,
        unmatched: unmatched.map((image) => photoNameFromPath(image.name)),
        failed,
      }
    },

    async setMembership(personId, groupId, member) {
      const { room } = requireRoom()
      const membership: Membership = { personId, groupId, roomId: room.id }
      const isOther = (m: Membership) => !(m.personId === personId && m.groupId === groupId)
      set((state) => ({
        memberships: member ? [...state.memberships.filter(isOther), membership] : state.memberships.filter(isOther),
      }))
      await mutate(['person_groups'], () =>
        member ? backend.addMemberships([membership]) : backend.removeMemberships([membership]),
      )
    },

    async setPersonPhoto(personId, image) {
      const { room } = requireRoom()
      await mutate(['people'], async () => {
        const path = image ? await backend.uploadPhoto(room.id, await resizeToWebp(image)) : null
        await backend.setPersonPhoto(personId, path)
      })
    },

    async createGroup(name, color, parentId = null) {
      const { room } = requireRoom()
      const cleaned = cleanName(name)
      if (cleaned === '') return null
      const groupColor = color ?? defaultGroupColor(get().groups, parentId)
      let createdId: string | null = null
      await mutate(['groups'], async () => {
        createdId = (await backend.createGroup(room.id, cleaned, groupColor, parentId)).id
      })
      return createdId
    },

    async updateGroup(groupId, patch) {
      const name = patch.name === undefined ? undefined : cleanName(patch.name)
      if (name === '') return
      const cleanPatch = { ...patch, ...(name === undefined ? {} : { name }) }
      set((state) => ({ groups: state.groups.map((g) => (g.id === groupId ? { ...g, ...cleanPatch } : g)) }))
      await mutate(['groups'], () => backend.updateGroup(groupId, cleanPatch))
    },

    async deleteGroup(groupId) {
      set((state) => ({
        groups: state.groups.filter((g) => g.id !== groupId),
        memberships: state.memberships.filter((m) => m.groupId !== groupId),
      }))
      await mutate(['groups', 'person_groups', 'bridges'], () => backend.deleteGroup(groupId))
    },

    async applyGroupShortcut(text) {
      const { room } = requireRoom()
      const assignments = parseGroupShortcut(text)
      const counts = { groups: 0, people: 0 }
      if (assignments.length === 0) return counts

      await mutate(['groups', 'people', 'person_groups'], async () => {
        const groupsByName = new Map(get().groups.map((g) => [normalizeName(g.name), g]))
        const peopleByName = new Map(get().people.map((p) => [normalizeName(p.name), p]))
        const usedColors = get().groups.map((g) => g.color)
        const memberships: Membership[] = []

        for (const { groupName, memberNames } of assignments) {
          let group = groupsByName.get(normalizeName(groupName))
          if (!group) {
            const color = nextGroupColor(usedColors)
            usedColors.push(color)
            group = await backend.createGroup(room.id, groupName, color)
            groupsByName.set(normalizeName(groupName), group)
            counts.groups += 1
          }
          const missing = memberNames.filter((name) => !peopleByName.has(normalizeName(name)))
          if (missing.length > 0) {
            const created = await backend.addPeople(room.id, missing)
            created.forEach((person) => peopleByName.set(normalizeName(person.name), person))
            counts.people += created.length
          }
          for (const name of memberNames) {
            const person = peopleByName.get(normalizeName(name))!
            memberships.push({ personId: person.id, groupId: group.id, roomId: room.id })
          }
        }
        await backend.addMemberships(memberships)
      })
      return counts
    },

    async addBridge(link) {
      const { room } = requireRoom()
      const bridge = normalizeBridge(link)
      if (get().bridges.some((existing) => sameBridge(existing, bridge))) {
        set({ error: new AppError('bridgeExists') })
        return
      }
      await mutate(['bridges'], () => backend.createBridge({ ...bridge, roomId: room.id }))
    },

    async removeBridge(bridgeId) {
      set((state) => ({ bridges: state.bridges.filter((b) => b.id !== bridgeId) }))
      await mutate(['bridges'], () => backend.deleteBridge(bridgeId))
    },

    dragPerson(personId, point) {
      const { room, me } = get()
      // In 'vs' rooms nothing is sent while blind; the shared board is always public.
      const visibleToOthers = room?.mode === 'general' || room?.revealed
      if (!visibleToOthers || !me || !point) return
      broadcastDrag({ participantId: me.id, personId, x: point.x, y: point.y })
    },

    async placePerson(personId, point) {
      const { room, me } = requireRoom()
      broadcastDrag.cancel()
      if (room.mode === 'general') return placeOnSharedBoard(room, me, personId, point)
      const placement: Placement = {
        participantId: me.id,
        personId,
        roomId: room.id,
        x: point.x,
        y: point.y,
        updatedAt: new Date().toISOString(),
      }
      set((state) => ({
        placements: [
          ...state.placements.filter((p) => !(p.participantId === me.id && p.personId === personId)),
          placement,
        ],
      }))
      try {
        await backend.savePlacement(placement)
      } catch (error) {
        set({ error: toError(error) })
        await get().refetch('placements')
      }
    },

    async unplacePerson(personId) {
      const { room, me } = requireRoom()
      broadcastDrag.cancel()
      if (room.mode === 'general') return unplaceFromSharedBoard(room, personId)
      set((state) => ({
        placements: state.placements.filter((p) => !(p.participantId === me.id && p.personId === personId)),
      }))
      try {
        await backend.deletePlacement(me.id, personId)
      } catch (error) {
        set({ error: toError(error) })
        await get().refetch('placements')
      }
    },

    async setMyPerson(personId) {
      const { me } = requireRoom()
      set({ me: { ...me, personId } })
      await mutate(['participants'], () => backend.updateParticipant(me.id, { personId }))
    },

    async reveal() {
      const { room } = requireRoom()
      await mutate(['rooms'], () => backend.revealRoom(room.id))
    },
  }
})

/** Next palette color for a top-level group; a shade of the parent's color for a subgroup. */
export function defaultGroupColor(groups: readonly Group[], parentId: string | null): string {
  const parent = parentId ? groups.find((g) => g.id === parentId) : undefined
  if (!parent) return nextGroupColor(groups.filter((g) => g.parentId === null).map((g) => g.color))
  return subgroupColor(parent.color, groups.filter((g) => g.parentId === parent.id).length)
}

export function dismissError(): void {
  useRoomStore.setState({ error: null })
}
