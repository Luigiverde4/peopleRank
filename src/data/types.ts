/**
 * Fixed per room. 'vs': each participant has their own board, blind until revealed, then compared.
 * 'general': one shared board that every member moves during the call.
 */
export type GameMode = 'vs' | 'general'

export interface Room {
  id: string
  slug: string
  name: string
  createdBy: string
  revealed: boolean
  mode: GameMode
  createdAt: string
}

export interface Participant {
  id: string
  roomId: string
  userId: string
  displayName: string
  /** The person of the list this participant is, used for self-perception. */
  personId: string | null
  createdAt: string
}

export interface Person {
  id: string
  roomId: string
  name: string
  photoPath: string | null
  createdAt: string
}

export interface Group {
  id: string
  roomId: string
  name: string
  color: string
  createdAt: string
}

export interface Membership {
  personId: string
  groupId: string
  roomId: string
}

/** A participant's placement of a person, normalized to [0, 1] with y = 1 at the top. */
export interface Placement {
  participantId: string
  personId: string
  roomId: string
  x: number
  y: number
  updatedAt: string
}

/** A person's position on the shared board of a 'general' room. */
export interface SharedPlacement {
  roomId: string
  personId: string
  x: number
  y: number
  /** Participant who moved it last. */
  updatedBy: string | null
  updatedAt: string
}

/** Tables that can change while a room is open. */
export type RoomTable =
  | 'rooms'
  | 'participants'
  | 'people'
  | 'groups'
  | 'person_groups'
  | 'placements'
  | 'shared_placements'

export const ROOM_TABLES: RoomTable[] = [
  'rooms',
  'participants',
  'people',
  'groups',
  'person_groups',
  'placements',
  'shared_placements',
]

export interface PresenceEntry {
  participantId: string
  displayName: string
}

/** Provisional position sent while a participant drags a token. */
export interface DragMessage {
  participantId: string
  personId: string
  x: number
  y: number
}
