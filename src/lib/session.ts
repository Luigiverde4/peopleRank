import type { GameMode } from '../data/types'
import { AppError } from './appError'

/**
 * Portable snapshot of a room, to save a session and continue it later in a new room.
 * Ids are the original ones and only serve to link the rows inside the file.
 */
export const SESSION_FORMAT = 'peopleRank-session'
export const SESSION_VERSION = 1

export interface SessionFile {
  format: typeof SESSION_FORMAT
  version: typeof SESSION_VERSION
  exportedAt: string
  room: { name: string; mode: GameMode; revealed: boolean }
  /** Participant who exported the file; their placements are restored as the importer's own. */
  exportedBy: string | null
  people: { id: string; name: string }[]
  groups: { id: string; name: string; color: string; parentId: string | null }[]
  memberships: { personId: string; groupId: string }[]
  bridges: { groupAId: string; groupBId: string; personAId: string; personBId: string }[]
  participants: { id: string; displayName: string; personId: string | null }[]
  /** Individual boards ('vs'): only the ones the exporter could see. */
  placements: { participantId: string; personId: string; x: number; y: number }[]
  /** Shared board ('general'). */
  sharedPlacements: { personId: string; x: number; y: number }[]
}

export type SessionContent = Omit<SessionFile, 'format' | 'version' | 'exportedAt'>

export function buildSessionFile(content: SessionContent, exportedAt: Date): SessionFile {
  return { format: SESSION_FORMAT, version: SESSION_VERSION, exportedAt: exportedAt.toISOString(), ...content }
}

// ---------------------------------------------------------------------------
// Parsing: the file comes from outside, so every field is checked and broken rows are dropped.
// ---------------------------------------------------------------------------

type Json = Record<string, unknown>

const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value)
const isString = (value: unknown): value is string => typeof value === 'string' && value.length > 0
const isCoordinate = (value: unknown): value is number => typeof value === 'number' && value >= 0 && value <= 1
const isHexColor = (value: unknown): value is string => typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)

function rows(value: unknown): Json[] {
  return Array.isArray(value) ? value.filter(isObject) : []
}

/** Reads a session file; throws an AppError when it is not one. A missing room name is left empty. */
export function parseSessionFile(text: string): SessionFile {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new AppError('invalidJson')
  }
  if (!isObject(data) || data.format !== SESSION_FORMAT) throw new AppError('notASession')
  if (data.version !== SESSION_VERSION) throw new AppError('unsupportedSessionVersion')
  const room = isObject(data.room) ? data.room : {}
  const mode: GameMode = room.mode === 'general' ? 'general' : 'vs'

  const people = rows(data.people)
    .filter((p) => isString(p.id) && isString(p.name))
    .map((p) => ({ id: p.id as string, name: (p.name as string).slice(0, 100) }))
  const personIds = new Set(people.map((p) => p.id))

  const rawGroups = rows(data.groups).filter((g) => isString(g.id) && isString(g.name) && isHexColor(g.color))
  const groupIds = new Set(rawGroups.map((g) => g.id as string))
  const groups = rawGroups.map((g) => ({
    id: g.id as string,
    name: (g.name as string).slice(0, 60),
    color: g.color as string,
    parentId: isString(g.parentId) && groupIds.has(g.parentId) && g.parentId !== g.id ? g.parentId : null,
  }))

  const participants = rows(data.participants)
    .filter((p) => isString(p.id) && isString(p.displayName))
    .map((p) => ({
      id: p.id as string,
      displayName: p.displayName as string,
      personId: isString(p.personId) && personIds.has(p.personId) ? p.personId : null,
    }))
  const participantIds = new Set(participants.map((p) => p.id))

  return {
    format: SESSION_FORMAT,
    version: SESSION_VERSION,
    exportedAt: isString(data.exportedAt) ? data.exportedAt : new Date(0).toISOString(),
    room: {
      name: isString(room.name) ? room.name.slice(0, 100) : '',
      mode,
      revealed: room.revealed === true,
    },
    exportedBy: isString(data.exportedBy) && participantIds.has(data.exportedBy) ? data.exportedBy : null,
    people,
    groups,
    memberships: rows(data.memberships)
      .filter(
        (m) => isString(m.personId) && personIds.has(m.personId) && isString(m.groupId) && groupIds.has(m.groupId),
      )
      .map((m) => ({ personId: m.personId as string, groupId: m.groupId as string })),
    bridges: rows(data.bridges)
      .filter(
        (b) =>
          isString(b.groupAId) &&
          groupIds.has(b.groupAId) &&
          isString(b.groupBId) &&
          groupIds.has(b.groupBId) &&
          b.groupAId !== b.groupBId &&
          isString(b.personAId) &&
          personIds.has(b.personAId) &&
          isString(b.personBId) &&
          personIds.has(b.personBId) &&
          b.personAId !== b.personBId,
      )
      .map((b) => ({
        groupAId: b.groupAId as string,
        groupBId: b.groupBId as string,
        personAId: b.personAId as string,
        personBId: b.personBId as string,
      })),
    participants,
    placements: rows(data.placements)
      .filter(
        (p) =>
          isString(p.participantId) &&
          participantIds.has(p.participantId) &&
          isString(p.personId) &&
          personIds.has(p.personId) &&
          isCoordinate(p.x) &&
          isCoordinate(p.y),
      )
      .map((p) => ({
        participantId: p.participantId as string,
        personId: p.personId as string,
        x: p.x as number,
        y: p.y as number,
      })),
    sharedPlacements: rows(data.sharedPlacements)
      .filter((p) => isString(p.personId) && personIds.has(p.personId) && isCoordinate(p.x) && isCoordinate(p.y))
      .map((p) => ({ personId: p.personId as string, x: p.x as number, y: p.y as number })),
  }
}
