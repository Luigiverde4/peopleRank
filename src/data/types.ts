export interface Room {
  id: string
  slug: string
  name: string
  createdBy: string
  revealed: boolean
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

/** Everything the room screen needs, loaded in one go. */
export interface RoomSnapshot {
  room: Room
  participants: Participant[]
  people: Person[]
  groups: Group[]
  memberships: Membership[]
  placements: Placement[]
}

/** Tables that can change while a room is open. */
export type RoomTable = 'rooms' | 'participants' | 'people' | 'groups' | 'person_groups' | 'placements'

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
