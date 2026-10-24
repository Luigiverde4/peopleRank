import { createClient, type PostgrestError, type RealtimeChannel } from '@supabase/supabase-js'
import type { DataBackend, RoomConnection, RoomEventHandlers, RoomMembership } from './backend'
import type { Database } from './database.types'
import { newId } from './ids'
import {
  presenceEntries,
  toGroup,
  toMembership,
  toParticipant,
  toPerson,
  toPlacement,
  toRoom,
  toSharedPlacement,
  type PresencePayload,
} from './supabaseRows'
import { ROOM_TABLES, type DragMessage, type PresenceEntry } from './types'

const PHOTOS_BUCKET = 'photos'

type QueryResult = { data: unknown; error: PostgrestError | null }
/** The data type of the success branch of a Supabase response. */
type SuccessData<R> = R extends { error: null; data: infer D } ? D : never

/** Throws a readable error when a Supabase call fails; otherwise returns its data. */
function check<R extends QueryResult>(result: R): SuccessData<R> {
  if (result.error) throw new Error(result.error.message)
  return result.data as SuccessData<R>
}

export function createSupabaseBackend(url: string, publishableKey: string): DataBackend {
  const client = createClient<Database>(url, publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  })

  let sessionPromise: Promise<string> | null = null

  async function signIn(): Promise<string> {
    const { data, error: sessionError } = await client.auth.getSession()
    // A failed read (e.g. the auth lock held by another tab) must not be mistaken for
    // "no session": signing in again would create a second anonymous participant.
    if (sessionError) throw new Error(`No se pudo recuperar la sesión: ${sessionError.message}`)
    if (data.session) return data.session.user.id
    const { data: signInData, error } = await client.auth.signInAnonymously()
    if (error || !signInData.user) throw new Error(error?.message ?? 'No se pudo iniciar sesión')
    return signInData.user.id
  }

  async function userId(): Promise<string> {
    sessionPromise ??= signIn().catch((error: unknown) => {
      sessionPromise = null
      throw error
    })
    return sessionPromise
  }

  async function myParticipant(roomId: string) {
    const uid = await userId()
    const row = check(
      await client.from('participants').select('*').eq('room_id', roomId).eq('user_id', uid).maybeSingle(),
    )
    return row ? toParticipant(row) : null
  }

  async function removePhoto(photoPath: string | null): Promise<void> {
    if (!photoPath) return
    // Best effort: an orphan photo is harmless.
    await client.storage.from(PHOTOS_BUCKET).remove([photoPath])
  }

  return {
    kind: 'supabase',

    ensureSession: userId,

    async createRoom(name, displayName, mode) {
      await userId()
      return check(await client.rpc('create_room', { name, display_name: displayName, mode }))
    },

    async joinRoom(slug, displayName): Promise<RoomMembership> {
      await userId()
      const roomRow = check(await client.rpc('join_room', { slug, display_name: displayName }))
      const room = toRoom(roomRow)
      const me = await myParticipant(room.id)
      if (!me) throw new Error('No se pudo entrar en la sala')
      return { room, me }
    },

    async findMembership(slug) {
      await userId()
      // RLS only returns the room to its members.
      const roomRow = check(await client.from('rooms').select('*').eq('slug', slug).maybeSingle())
      if (!roomRow) return null
      const me = await myParticipant(roomRow.id)
      return me ? { room: toRoom(roomRow), me } : null
    },

    async fetchRoom(roomId) {
      return toRoom(check(await client.from('rooms').select('*').eq('id', roomId).single()))
    },

    async fetchParticipants(roomId) {
      const rows = check(await client.from('participants').select('*').eq('room_id', roomId).order('created_at'))
      return rows.map(toParticipant)
    },

    async fetchPeople(roomId) {
      const rows = check(
        await client.from('people').select('*').eq('room_id', roomId).order('created_at').order('name'),
      )
      return rows.map(toPerson)
    },

    async fetchGroups(roomId) {
      const rows = check(await client.from('groups').select('*').eq('room_id', roomId).order('created_at'))
      return rows.map(toGroup)
    },

    async fetchMemberships(roomId) {
      return check(await client.from('person_groups').select('*').eq('room_id', roomId)).map(toMembership)
    },

    async fetchPlacements(roomId) {
      return check(await client.from('placements').select('*').eq('room_id', roomId)).map(toPlacement)
    },

    async addPeople(roomId, names) {
      const rows = check(
        await client
          .from('people')
          .insert(names.map((name) => ({ room_id: roomId, name })))
          .select('*'),
      )
      return rows.map(toPerson)
    },

    async renamePerson(personId, name) {
      check(await client.from('people').update({ name }).eq('id', personId))
    },

    async deletePerson(personId) {
      const row = check(await client.from('people').select('photo_path').eq('id', personId).maybeSingle())
      check(await client.from('people').delete().eq('id', personId))
      await removePhoto(row?.photo_path ?? null)
    },

    async setPersonPhoto(personId, photoPath) {
      const row = check(await client.from('people').select('photo_path').eq('id', personId).maybeSingle())
      check(await client.from('people').update({ photo_path: photoPath }).eq('id', personId))
      if (row?.photo_path && row.photo_path !== photoPath) await removePhoto(row.photo_path)
    },

    async createGroup(roomId, name, color, parentId = null) {
      return toGroup(
        check(await client.from('groups').insert({ room_id: roomId, name, color, parent_id: parentId }).select('*').single()),
      )
    },

    async updateGroup(groupId, patch) {
      const row = {
        ...(patch.name === undefined ? {} : { name: patch.name }),
        ...(patch.color === undefined ? {} : { color: patch.color }),
        ...(patch.parentId === undefined ? {} : { parent_id: patch.parentId }),
      }
      check(await client.from('groups').update(row).eq('id', groupId))
    },

    async deleteGroup(groupId) {
      check(await client.from('groups').delete().eq('id', groupId))
    },

    async addMemberships(memberships) {
      if (memberships.length === 0) return
      const rows = memberships.map((m) => ({ person_id: m.personId, group_id: m.groupId, room_id: m.roomId }))
      check(
        await client.from('person_groups').upsert(rows, { onConflict: 'person_id,group_id', ignoreDuplicates: true }),
      )
    },

    async removeMemberships(memberships) {
      await Promise.all(
        memberships.map(async (m) =>
          check(await client.from('person_groups').delete().eq('person_id', m.personId).eq('group_id', m.groupId)),
        ),
      )
    },

    async savePlacement(placement) {
      check(
        await client.from('placements').upsert(
          {
            participant_id: placement.participantId,
            person_id: placement.personId,
            room_id: placement.roomId,
            x: placement.x,
            y: placement.y,
          },
          { onConflict: 'participant_id,person_id' },
        ),
      )
    },

    async deletePlacement(participantId, personId) {
      check(await client.from('placements').delete().eq('participant_id', participantId).eq('person_id', personId))
    },

    async fetchSharedPlacements(roomId) {
      return check(await client.from('shared_placements').select('*').eq('room_id', roomId)).map(toSharedPlacement)
    },

    async saveSharedPlacement(placement) {
      check(
        await client.from('shared_placements').upsert(
          {
            room_id: placement.roomId,
            person_id: placement.personId,
            x: placement.x,
            y: placement.y,
            updated_by: placement.updatedBy,
          },
          { onConflict: 'room_id,person_id' },
        ),
      )
    },

    async deleteSharedPlacement(roomId, personId) {
      check(await client.from('shared_placements').delete().eq('room_id', roomId).eq('person_id', personId))
    },

    async updateParticipant(participantId, patch) {
      check(
        await client
          .from('participants')
          .update({
            ...(patch.displayName === undefined ? {} : { display_name: patch.displayName }),
            ...(patch.personId === undefined ? {} : { person_id: patch.personId }),
          })
          .eq('id', participantId),
      )
    },

    async revealRoom(roomId) {
      const rows = check(await client.from('rooms').update({ revealed: true }).eq('id', roomId).select('id'))
      if (rows.length === 0) throw new Error('Solo quien creó la sala puede revelarla')
    },

    async uploadPhoto(roomId, photo) {
      const path = `${roomId}/${newId()}.webp`
      const { error } = await client.storage
        .from(PHOTOS_BUCKET)
        .upload(path, photo, { contentType: 'image/webp', upsert: false })
      if (error) throw new Error(error.message)
      return path
    },

    photoUrl(photoPath) {
      return client.storage.from(PHOTOS_BUCKET).getPublicUrl(photoPath).data.publicUrl
    },

    connectRoom(roomId: string, presence: PresenceEntry, handlers: RoomEventHandlers): RoomConnection {
      const channel: RealtimeChannel = client.channel(`room:${roomId}`, {
        config: { presence: { key: presence.participantId }, broadcast: { self: false } },
      })
      let subscribed = false

      for (const table of ROOM_TABLES) {
        const filter = table === 'rooms' ? `id=eq.${roomId}` : `room_id=eq.${roomId}`
        const notify = () => handlers.onTableChange(table)
        channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table, filter }, notify)
        channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table, filter }, notify)
        // DELETE events cannot be filtered by room_id (only the primary key is sent),
        // so any delete in the table triggers a refetch of this room's rows.
        channel.on('postgres_changes', { event: 'DELETE', schema: 'public', table }, notify)
      }

      channel
        .on('presence', { event: 'sync' }, () => {
          handlers.onPresence(presenceEntries(channel.presenceState<PresencePayload>()))
        })
        .on('broadcast', { event: 'drag' }, ({ payload }) => handlers.onDrag(payload as DragMessage))
        .on('system', {}, (payload: { extension?: string; status?: string }) => {
          // Postgres changes start flowing slightly after SUBSCRIBED: refetch to cover the gap.
          if (payload.extension === 'postgres_changes' && payload.status === 'ok') handlers.onReconnect()
        })
        .subscribe((status) => {
          subscribed = status === 'SUBSCRIBED'
          if (!subscribed) return
          const payload: PresencePayload = {
            participant_id: presence.participantId,
            display_name: presence.displayName,
          }
          void channel.track(payload)
          // First subscription or reconnection: anything may have changed meanwhile.
          handlers.onReconnect()
        })

      return {
        sendDrag(message: DragMessage) {
          // Only over the socket; before subscribing, send() would fall back to REST.
          if (subscribed) void channel.send({ type: 'broadcast', event: 'drag', payload: message })
        },
        disconnect() {
          void client.removeChannel(channel)
        },
      }
    },
  }
}
