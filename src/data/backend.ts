import type {
  DragMessage,
  GameMode,
  SharedPlacement,
  Group,
  Membership,
  Participant,
  Person,
  Placement,
  PresenceEntry,
  Room,
  RoomTable,
} from './types'

export interface RoomMembership {
  room: Room
  me: Participant
}

export interface RoomEventHandlers {
  /** A table changed for this room; the client should refetch it. */
  onTableChange(table: RoomTable): void
  onPresence(entries: PresenceEntry[]): void
  onDrag(message: DragMessage): void
  /** The channel (re)connected; the client should refetch everything. */
  onReconnect(): void
}

export interface RoomConnection {
  sendDrag(message: DragMessage): void
  disconnect(): void
}

export interface GroupPatch {
  name?: string
  color?: string
}

export interface ParticipantPatch {
  displayName?: string
  personId?: string | null
}

/**
 * Every data access of the app goes through this interface. There is an
 * in-memory implementation (offline demo) and a Supabase one.
 */
export interface DataBackend {
  readonly kind: 'memory' | 'supabase'

  /** Signs in (anonymously if needed) and returns the user id. */
  ensureSession(): Promise<string>

  createRoom(name: string, displayName: string, mode: GameMode): Promise<string>
  joinRoom(slug: string, displayName: string): Promise<RoomMembership>
  /** Returns the room and my participant if I already joined it. */
  findMembership(slug: string): Promise<RoomMembership | null>

  fetchRoom(roomId: string): Promise<Room>
  fetchParticipants(roomId: string): Promise<Participant[]>
  fetchPeople(roomId: string): Promise<Person[]>
  fetchGroups(roomId: string): Promise<Group[]>
  fetchMemberships(roomId: string): Promise<Membership[]>
  /** Own placements always; the others' only when the room is revealed. */
  fetchPlacements(roomId: string): Promise<Placement[]>

  addPeople(roomId: string, names: string[]): Promise<Person[]>
  renamePerson(personId: string, name: string): Promise<void>
  deletePerson(personId: string): Promise<void>
  setPersonPhoto(personId: string, photoPath: string | null): Promise<void>

  createGroup(roomId: string, name: string, color: string): Promise<Group>
  updateGroup(groupId: string, patch: GroupPatch): Promise<void>
  deleteGroup(groupId: string): Promise<void>

  addMemberships(memberships: Membership[]): Promise<void>
  removeMemberships(memberships: Membership[]): Promise<void>

  savePlacement(placement: Omit<Placement, 'updatedAt'>): Promise<void>
  deletePlacement(participantId: string, personId: string): Promise<void>

  /** Shared board of a 'general' room: every member reads and moves it. */
  fetchSharedPlacements(roomId: string): Promise<SharedPlacement[]>
  saveSharedPlacement(placement: Omit<SharedPlacement, 'updatedAt'>): Promise<void>
  deleteSharedPlacement(roomId: string, personId: string): Promise<void>

  updateParticipant(participantId: string, patch: ParticipantPatch): Promise<void>
  revealRoom(roomId: string): Promise<void>

  /** Stores a WebP photo and returns its storage path. */
  uploadPhoto(roomId: string, photo: Blob): Promise<string>
  /** Public URL (or data URL) to display a stored photo. */
  photoUrl(photoPath: string): string

  connectRoom(roomId: string, presence: PresenceEntry, handlers: RoomEventHandlers): RoomConnection
}
