import type { Tables } from './database.types'
import type { Group, Membership, Participant, Person, Placement, PresenceEntry, Room } from './types'

/** Mappers between Postgres rows (snake_case) and app types (camelCase). */

export function toRoom(row: Tables<'rooms'>): Room {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    createdBy: row.created_by,
    revealed: row.revealed,
    createdAt: row.created_at,
  }
}

export function toParticipant(row: Tables<'participants'>): Participant {
  return {
    id: row.id,
    roomId: row.room_id,
    userId: row.user_id,
    displayName: row.display_name,
    personId: row.person_id,
    createdAt: row.created_at,
  }
}

export function toPerson(row: Tables<'people'>): Person {
  return {
    id: row.id,
    roomId: row.room_id,
    name: row.name,
    photoPath: row.photo_path,
    createdAt: row.created_at,
  }
}

export function toGroup(row: Tables<'groups'>): Group {
  return { id: row.id, roomId: row.room_id, name: row.name, color: row.color, createdAt: row.created_at }
}

export function toMembership(row: Tables<'person_groups'>): Membership {
  return { personId: row.person_id, groupId: row.group_id, roomId: row.room_id }
}

export function toPlacement(row: Tables<'placements'>): Placement {
  return {
    participantId: row.participant_id,
    personId: row.person_id,
    roomId: row.room_id,
    x: row.x,
    y: row.y,
    updatedAt: row.updated_at,
  }
}

/** Shape of the Presence payload tracked on the room channel. */
export interface PresencePayload {
  participant_id: string
  display_name: string
}

/**
 * Flattens Supabase's presence state (key -> list of metas) into one entry
 * per participant, even if they have the room open in several tabs.
 */
export function presenceEntries(state: Record<string, Partial<PresencePayload>[]>): PresenceEntry[] {
  const byParticipant = new Map<string, PresenceEntry>()
  for (const metas of Object.values(state)) {
    for (const meta of metas) {
      if (!meta.participant_id) continue
      byParticipant.set(meta.participant_id, {
        participantId: meta.participant_id,
        displayName: meta.display_name ?? '',
      })
    }
  }
  return [...byParticipant.values()].sort((a, b) => a.displayName.localeCompare(b.displayName))
}
