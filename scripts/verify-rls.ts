/**
 * Verifies the RLS policies and realtime behaviour against a local Supabase
 * (`npm run db:start`) with three anonymous users: A (creator), B (joins)
 * and C (outsider).
 *
 * Usage: npm run verify:rls
 * Reads VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY from the
 * environment or from .env.local.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'

type Client = SupabaseClient

function readEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {}
  const entries = readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/))
    .filter((match): match is RegExpMatchArray => match !== null)
    .map((match) => [match[1]!, match[2]!] as const)
  return Object.fromEntries(entries)
}

const fileEnv = readEnvFile('.env.local')
const url = process.env.VITE_SUPABASE_URL ?? fileEnv.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? fileEnv.VITE_SUPABASE_PUBLISHABLE_KEY

let failures = 0

function expect(condition: boolean, description: string): void {
  console.log(`${condition ? '✔' : '✘'} ${description}`)
  if (!condition) failures += 1
}

async function anonymousClient(): Promise<{ client: Client; userId: string }> {
  const client = createClient(url, key!, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await client.auth.signInAnonymously()
  if (error || !data.user) throw new Error(`Anonymous sign-in failed: ${error?.message}`)
  return { client, userId: data.user.id }
}

async function myParticipantId(client: Client, roomId: string, userId: string): Promise<string> {
  const { data, error } = await client
    .from('participants')
    .select('id')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .single()
  if (error) throw new Error(error.message)
  return data.id as string
}

async function count(client: Client, table: string, roomId: string): Promise<number> {
  const { data, error } = await client.from(table).select('*').eq('room_id', roomId)
  if (error) throw new Error(`${table}: ${error.message}`)
  return data.length
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Subscribes `client` to the room channel and records what it receives. */
async function listen(client: Client, roomId: string) {
  const events: { table: string; event: string; participantId?: string }[] = []
  const drags: unknown[] = []
  const channel = client.channel(`room:${roomId}`, { config: { broadcast: { self: false } } })
  for (const table of ['people', 'placements']) {
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table, filter: `room_id=eq.${roomId}` },
      (payload) => {
        const participantId = (payload.new as { participant_id?: string }).participant_id
        events.push({ table, event: 'INSERT', participantId })
      },
    )
  }
  channel.on('broadcast', { event: 'drag' }, ({ payload }) => drags.push(payload))
  // Postgres changes are only delivered after this system message, which arrives after SUBSCRIBED.
  const postgresReady = new Promise<void>((resolve) =>
    channel.on('system', {}, (payload: { extension?: string; status?: string }) => {
      if (payload.extension === 'postgres_changes' && payload.status === 'ok') resolve()
    }),
  )
  await new Promise<void>((resolve, reject) => {
    channel.subscribe((status, error) => {
      if (status === 'SUBSCRIBED') resolve()
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') reject(error ?? new Error(status))
    })
  })
  await postgresReady
  return { channel, events, drags }
}

async function main(): Promise<void> {
  if (!key) throw new Error('Missing VITE_SUPABASE_PUBLISHABLE_KEY (see .env.example)')
  console.log(`Supabase: ${url}\n`)

  const a = await anonymousClient()
  const b = await anonymousClient()
  const c = await anonymousClient()

  // Room creation and joining.
  const { data: slug, error: createError } = await a.client.rpc('create_room', {
    name: 'RLS test',
    display_name: 'A',
  })
  expect(!createError && typeof slug === 'string' && slug.length >= 12, 'A creates a room through create_room')

  const { data: directInsert } = await a.client
    .from('rooms')
    .insert({ slug: 'x'.repeat(14), name: 'x', created_by: a.userId })
    .select()
  expect(!directInsert || directInsert.length === 0, 'rooms cannot be inserted directly')

  const { data: hiddenRooms } = await b.client.from('rooms').select('*')
  expect((hiddenRooms ?? []).length === 0, 'B cannot list rooms before joining')

  const { data: joined, error: joinError } = await b.client.rpc('join_room', { slug, display_name: 'B' })
  expect(!joinError && joined?.slug === slug, 'B joins with join_room')
  const roomId = joined.id as string
  const { data: joinedAgain } = await b.client.rpc('join_room', { slug, display_name: 'B again' })
  expect(joinedAgain?.id === roomId, 'joining twice returns the same room')
  expect((await count(b.client, 'participants', roomId)) === 2, 'joining twice does not duplicate the participant')

  const participantA = await myParticipantId(a.client, roomId, a.userId)
  const participantB = await myParticipantId(b.client, roomId, b.userId)

  // Realtime listener for B.
  const listenerB = await listen(b.client, roomId)

  // Shared data: people.
  const { data: person, error: personError } = await a.client
    .from('people')
    .insert({ room_id: roomId, name: 'Persona de prueba' })
    .select()
    .single()
  expect(!personError, 'A adds a person')
  expect((await count(b.client, 'people', roomId)) === 1, 'B sees the person added by A')
  expect((await count(c.client, 'people', roomId)) === 0, 'outsider C does not see the people')
  const { error: outsiderInsert } = await c.client.from('people').insert({ room_id: roomId, name: 'Intruso' })
  expect(outsiderInsert !== null, 'outsider C cannot add people')

  // Blind mode.
  const placement = (participantId: string, x: number) => ({
    participant_id: participantId,
    person_id: person.id,
    room_id: roomId,
    x,
    y: 0.5,
  })
  const { error: placeA } = await a.client.from('placements').upsert(placement(participantA, 0.2))
  const { error: placeB } = await b.client.from('placements').upsert(placement(participantB, 0.8))
  expect(!placeA && !placeB, 'A and B place the person on their own boards')
  expect((await count(a.client, 'placements', roomId)) === 1, 'before revealing, A only sees their placement')
  expect((await count(b.client, 'placements', roomId)) === 1, 'before revealing, B only sees their placement')

  const { error: forgedInsert } = await b.client.from('placements').upsert(placement(participantA, 0.99))
  expect(forgedInsert !== null, "B cannot write a placement on A's board")
  const { data: forgedUpdate } = await b.client
    .from('placements')
    .update({ x: 0.01 })
    .eq('participant_id', participantA)
    .select()
  expect((forgedUpdate ?? []).length === 0, "B cannot update A's placement")
  await b.client.from('placements').delete().eq('participant_id', participantA)
  const { data: stillThere } = await a.client.from('placements').select('x').eq('participant_id', participantA)
  expect(
    stillThere?.length === 1 && Math.abs((stillThere[0]!.x as number) - 0.2) < 1e-6,
    "B cannot delete A's placement",
  )

  const { data: forgedParticipant } = await b.client
    .from('participants')
    .update({ display_name: 'hacked' })
    .eq('id', participantA)
    .select()
  expect((forgedParticipant ?? []).length === 0, "B cannot edit A's participant row")

  const { data: earlyReveal } = await b.client.from('rooms').update({ revealed: true }).eq('id', roomId).select()
  expect((earlyReveal ?? []).length === 0, 'B (not the creator) cannot reveal')
  const { error: renameError } = await a.client.from('rooms').update({ name: 'otro' }).eq('id', roomId)
  expect(renameError !== null, 'room columns other than revealed cannot be updated')

  // Storage.
  const photo = new Blob([new Uint8Array([82, 73, 70, 70])], { type: 'image/webp' })
  const { error: uploadB } = await b.client.storage.from('photos').upload(`${roomId}/rls-test.webp`, photo)
  expect(!uploadB, 'members can upload photos to their room folder')
  const { error: uploadC } = await c.client.storage.from('photos').upload(`${roomId}/intruder.webp`, photo)
  expect(uploadC !== null, 'outsiders cannot upload photos to the room folder')

  // Realtime (give the server a moment to deliver).
  await wait(1500)
  expect(
    listenerB.events.some((e) => e.table === 'people'),
    'B receives a realtime event when A adds a person',
  )
  expect(
    listenerB.events.some((e) => e.table === 'placements' && e.participantId === participantB),
    'B receives realtime events for its own placements',
  )
  expect(
    !listenerB.events.some((e) => e.table === 'placements' && e.participantId === participantA),
    "B receives no realtime event for A's placement before revealing",
  )
  const channelA = a.client.channel(`room:${roomId}`)
  await new Promise<void>((resolve) => channelA.subscribe((status) => status === 'SUBSCRIBED' && resolve()))
  await channelA.send({ type: 'broadcast', event: 'drag', payload: { participant_id: participantA, x: 0.5, y: 0.5 } })

  // Reveal.
  const { data: reveal } = await a.client.from('rooms').update({ revealed: true }).eq('id', roomId).select()
  expect(reveal?.length === 1, 'the creator reveals the room')
  expect((await count(a.client, 'placements', roomId)) === 2, 'after revealing, A sees both placements')
  expect((await count(b.client, 'placements', roomId)) === 2, 'after revealing, B sees both placements')
  expect((await count(c.client, 'placements', roomId)) === 0, 'after revealing, outsider C still sees nothing')

  await a.client.from('placements').update({ x: 0.3 }).eq('participant_id', participantA)
  await wait(1500)
  expect(listenerB.drags.length > 0, 'B receives drag broadcasts from A')
  console.log(`  (B realtime events: ${JSON.stringify(listenerB.events)})`)

  // Game mode 'general': one shared board that every member moves.
  const sharedRow = (room: string, participantId: string, x: number) => ({
    room_id: room,
    person_id: person.id,
    x,
    y: 0.5,
    updated_by: participantId,
  })
  const { error: vsShared } = await a.client.from('shared_placements').upsert(sharedRow(roomId, participantA, 0.5))
  expect(vsShared !== null, "a 'vs' room has no shared board")

  const { data: generalSlug } = await a.client.rpc('create_room', {
    name: 'RLS general',
    display_name: 'A',
    mode: 'general',
  })
  const { data: generalRoom } = await b.client.rpc('join_room', { slug: generalSlug, display_name: 'B' })
  expect(generalRoom?.mode === 'general', "create_room stores the 'general' mode")
  const generalId = generalRoom.id as string
  const generalA = await myParticipantId(a.client, generalId, a.userId)
  const generalB = await myParticipantId(b.client, generalId, b.userId)
  const { data: generalPerson } = await a.client
    .from('people')
    .insert({ room_id: generalId, name: 'Persona común' })
    .select()
    .single()
  const sharedFor = (participantId: string, x: number) => ({
    ...sharedRow(generalId, participantId, x),
    person_id: generalPerson.id,
  })

  const { error: sharedByA } = await a.client.from('shared_placements').upsert(sharedFor(generalA, 0.2))
  expect(!sharedByA, 'A places a person on the shared board')
  const { data: seenByB } = await b.client.from('shared_placements').select('x').eq('room_id', generalId)
  expect(seenByB?.length === 1, 'B sees the shared position at once (no blind mode)')
  const { error: movedByB } = await b.client.from('shared_placements').upsert(sharedFor(generalB, 0.9))
  expect(!movedByB, 'B moves the same person on the shared board')
  const { error: spoofed } = await b.client.from('shared_placements').upsert(sharedFor(generalA, 0.1))
  expect(spoofed !== null, 'B cannot sign a move as A')
  expect((await count(c.client, 'shared_placements', generalId)) === 0, 'outsider C does not see the shared board')
  const { error: outsiderShared } = await c.client.from('shared_placements').upsert({
    ...sharedFor(generalA, 0.4),
    updated_by: null,
  })
  expect(outsiderShared !== null, 'outsider C cannot move the shared board')

  // Bridges marked by hand between two groups.
  const { data: twoGroups } = await a.client
    .from('groups')
    .insert([
      { room_id: generalId, name: 'Grupo A', color: '#e11d48' },
      { room_id: generalId, name: 'Grupo B', color: '#2563eb' },
    ])
    .select('id')
  const { data: otherPerson } = await a.client
    .from('people')
    .insert({ room_id: generalId, name: 'Persona puente' })
    .select()
    .single()
  const bridgeRow = {
    room_id: generalId,
    group_a_id: twoGroups![0]!.id,
    group_b_id: twoGroups![1]!.id,
    person_a_id: generalPerson.id,
    person_b_id: otherPerson.id,
  }
  const { error: bridgeByB } = await b.client.from('bridges').insert(bridgeRow)
  expect(!bridgeByB, 'a member marks a bridge between two groups')
  expect((await count(a.client, 'bridges', generalId)) === 1, 'other members see the bridge')
  const { error: duplicateBridge } = await a.client.from('bridges').insert(bridgeRow)
  expect(duplicateBridge !== null, 'the same bridge cannot be added twice')
  expect((await count(c.client, 'bridges', generalId)) === 0, 'outsider C does not see the bridges')
  const { error: outsiderBridge } = await c.client
    .from('bridges')
    .insert({ ...bridgeRow, person_a_id: otherPerson.id, person_b_id: generalPerson.id })
  expect(outsiderBridge !== null, 'outsider C cannot add bridges')

  await a.client.removeAllChannels()
  await b.client.removeAllChannels()

  console.log(failures === 0 ? '\nAll RLS checks passed.' : `\n${failures} check(s) failed.`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
