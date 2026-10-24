import { create } from 'zustand'
import { backend } from '../data'
import type { RoomConnection } from '../data/backend'
import type {
  DragMessage,
  Group,
  Membership,
  Participant,
  Person,
  Placement,
  PresenceEntry,
  Room,
  RoomTable,
} from '../data/types'
import { nextGroupColor } from '../lib/colors'
import type { BoardPoint } from '../lib/geometry'
import { parseGroupShortcut } from '../lib/groupShortcut'
import { cleanName, normalizeName, parseNameList } from '../lib/names'
import { resizeToWebp } from '../lib/photo'
import { throttle } from '../lib/throttle'

const REFETCH_DEBOUNCE_MS = 200
const DRAG_BROADCAST_INTERVAL_MS = 1000 / 15

export interface RoomState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null
  room: Room | null
  me: Participant | null
  participants: Participant[]
  people: Person[]
  groups: Group[]
  memberships: Membership[]
  placements: Placement[]
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
  /** Resizes the image to a 256×256 WebP, uploads it and links it; null removes the photo. */
  setPersonPhoto(personId: string, image: Blob | null): Promise<void>

  createGroup(name: string, color?: string): Promise<void>
  updateGroup(groupId: string, patch: { name?: string; color?: string }): Promise<void>
  deleteGroup(groupId: string): Promise<void>
  applyGroupShortcut(text: string): Promise<{ groups: number; people: number }>

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
  online: [],
  liveDrags: {},
}

let connection: RoomConnection | null = null
const refetchTimers = new Map<RoomTable, ReturnType<typeof setTimeout>>()

function dragKey(participantId: string, personId: string): string {
  return `${participantId}:${personId}`
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export const useRoomStore = create<RoomStore>()((set, get) => {
  const requireRoom = (): { room: Room; me: Participant } => {
    const { room, me } = get()
    if (!room || !me) throw new Error('No hay ninguna sala abierta')
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
    const tables: RoomTable[] = ['rooms', 'participants', 'people', 'groups', 'person_groups', 'placements']
    await Promise.all(tables.map((table) => get().refetch(table)))
  }

  const broadcastDrag = throttle((message: DragMessage) => connection?.sendDrag(message), DRAG_BROADCAST_INTERVAL_MS)

  /** Runs a mutation and refetches the tables it touches, keeping the error visible. */
  const mutate = async (tables: RoomTable[], run: () => Promise<void>) => {
    try {
      await run()
    } catch (error) {
      set({ error: errorMessage(error) })
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
        set({ status: 'error', error: errorMessage(error) })
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
          const placements = await backend.fetchPlacements(roomId)
          // Settled placements replace provisional drags; active drags resend within ~66 ms.
          set({ placements, liveDrags: {} })
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
      }))
      await mutate(['people', 'person_groups', 'placements', 'participants'], () => backend.deletePerson(personId))
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
        memberships: [
          ...state.memberships.filter((m) => m.personId !== personId),
          ...groupIds.map(asMembership),
        ],
      }))
      await mutate(['person_groups'], async () => {
        if (toAdd.length > 0) await backend.addMemberships(toAdd.map(asMembership))
        if (toRemove.length > 0) await backend.removeMemberships(toRemove.map(asMembership))
      })
    },

    async setPersonPhoto(personId, image) {
      const { room } = requireRoom()
      await mutate(['people'], async () => {
        const path = image ? await backend.uploadPhoto(room.id, await resizeToWebp(image)) : null
        await backend.setPersonPhoto(personId, path)
      })
    },

    async createGroup(name, color) {
      const { room } = requireRoom()
      const cleaned = cleanName(name)
      if (cleaned === '') return
      const groupColor = color ?? nextGroupColor(get().groups.map((g) => g.color))
      await mutate(['groups'], async () => {
        await backend.createGroup(room.id, cleaned, groupColor)
      })
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
      await mutate(['groups', 'person_groups'], () => backend.deleteGroup(groupId))
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

    dragPerson(personId, point) {
      const { room, me } = get()
      if (!room?.revealed || !me || !point) return
      broadcastDrag({ participantId: me.id, personId, x: point.x, y: point.y })
    },

    async placePerson(personId, point) {
      const { room, me } = requireRoom()
      broadcastDrag.cancel()
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
        set({ error: errorMessage(error) })
        await get().refetch('placements')
      }
    },

    async unplacePerson(personId) {
      const { me } = requireRoom()
      broadcastDrag.cancel()
      set((state) => ({
        placements: state.placements.filter((p) => !(p.participantId === me.id && p.personId === personId)),
      }))
      try {
        await backend.deletePlacement(me.id, personId)
      } catch (error) {
        set({ error: errorMessage(error) })
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

export function dismissError(): void {
  useRoomStore.setState({ error: null })
}
