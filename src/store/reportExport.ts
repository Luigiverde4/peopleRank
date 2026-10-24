import { backend } from '../data'
import type { Person } from '../data/types'
import { bridgesByPair } from '../lib/bridges'
import { displayGroupIds, expandMemberships, orderGroups } from '../lib/groupTree'
import { similarityFromDistance } from '../lib/metrics'
import { renderReportHtml, type ReportBoard, type ReportData, type ReportTable, type ReportToken } from '../lib/report'
import { computeRoomMetrics } from '../lib/roomMetrics'
import { groupIdsByPerson } from '../lib/rooms'
import { useRoomStore } from './roomStore'

const score = (value: number | null) => (value === null ? '—' : String(Math.round(value * 100)))
const signed = (value: number | null) => {
  if (value === null) return '—'
  const rounded = Math.round(value * 100)
  return rounded > 0 ? `+${rounded}` : String(rounded)
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/** Photos are embedded as data URLs so the saved report works offline. */
async function photoDataUrls(people: readonly Person[]): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  await Promise.all(
    people
      .filter((p) => p.photoPath)
      .map(async (person) => {
        try {
          const url = backend.photoUrl(person.photoPath!)
          result.set(person.id, url.startsWith('data:') ? url : await blobToDataUrl(await (await fetch(url)).blob()))
        } catch {
          // A missing photo just falls back to initials.
        }
      }),
  )
  return result
}

/** Builds the standalone HTML report of the open room (boards, legend and stats tables). */
export async function buildRoomReport(): Promise<string> {
  const state = useRoomStore.getState()
  const { room } = state
  if (!room) throw new Error('No hay ninguna sala abierta')
  const { people, groups, memberships, participants, placements, sharedPlacements, bridges } = state
  const metrics = computeRoomMetrics({
    mode: room.mode,
    people,
    groups,
    memberships,
    participants,
    placements,
    sharedPlacements,
  })

  const orderedGroups = orderGroups(groups)
  const groupsOf = groupIdsByPerson(expandMemberships(memberships, groups), orderedGroups)
  const colorOf = new Map(groups.map((g) => [g.id, g.color]))
  const photos = await photoDataUrls(people)
  const personById = new Map(people.map((p) => [p.id, p]))
  const nameOf = (id: string) => personById.get(id)?.name ?? '?'
  const groupName = (id: string) => groups.find((g) => g.id === id)?.name ?? '?'

  const token = (personId: string, x: number, y: number, extra: Partial<ReportToken> = {}): ReportToken => ({
    name: nameOf(personId),
    colors: displayGroupIds(groupsOf.get(personId) ?? [], orderedGroups).map((id) => colorOf.get(id)!),
    x,
    y,
    photo: photos.get(personId),
    ...extra,
  })

  const boards: ReportBoard[] = []
  if (room.mode === 'general') {
    boards.push({ title: 'Tablero común', tokens: sharedPlacements.map((p) => token(p.personId, p.x, p.y)) })
  } else {
    if (room.revealed) {
      boards.push({
        title: 'Consenso',
        subtitle: 'posición = mediana de los votos · halo = dispersión · número = votos',
        tokens: metrics.consensus.map((c) => token(c.personId, c.x, c.y, { halo: c.dispersion, votes: c.votes })),
      })
    }
    for (const participant of participants) {
      const own = placements.filter((p) => p.participantId === participant.id)
      if (own.length === 0) continue
      boards.push({
        title: `Tablero de ${participant.displayName}`,
        tokens: own.map((p) => token(p.personId, p.x, p.y)),
      })
    }
  }

  const tables: ReportTable[] = [
    {
      title: 'Grupos',
      hint: 'Tamaño y posición media de sus miembros (0–100); los subgrupos cuentan también en su grupo.',
      headers: ['Grupo', 'Nº', 'Curso', 'En su grupo'],
      rows: metrics.groupStats.map((stat) => {
        const group = groups.find((g) => g.id === stat.groupId)
        return [
          `${group?.parentId ? '↳ ' : ''}${group?.name ?? '?'}`,
          String(stat.size),
          score(stat.meanY),
          score(stat.meanX),
        ]
      }),
    },
    {
      title: 'Puentes',
      hint: 'Personas que conectan dos grupos.',
      headers: ['Grupos', 'Puente'],
      rows: bridgesByPair(bridges).flatMap((pair) =>
        pair.bridges.map((b) => [
          `${groupName(pair.groupAId)} ↔ ${groupName(pair.groupBId)}`,
          `${nameOf(b.personAId)} — ${nameOf(b.personBId)}`,
        ]),
      ),
    },
  ]

  if (room.mode === 'vs' && room.revealed) {
    const participantName = (id: string) => participants.find((p) => p.id === id)?.displayName ?? '?'
    tables.push(
      {
        title: 'Más controvertidas',
        hint: 'Mayor dispersión entre votos (mínimo 2 votos).',
        headers: ['Persona', 'Dispersión', 'Votos'],
        rows: metrics.controversial.map((c) => [nameOf(c.personId), score(c.dispersion), String(c.votes)]),
      },
      {
        title: 'Autopercepción',
        hint: 'Dónde se colocó cada uno frente a la mediana de los demás (popularidad en el curso).',
        headers: ['Participante', 'Se ve', 'Le ven', 'Distancia'],
        rows: metrics.selfPerception.map((s) => [
          participantName(s.participantId),
          score(s.self?.y ?? null),
          score(s.others?.y ?? null),
          score(s.distance),
        ]),
      },
      {
        title: 'Sesgo de grupo',
        hint: 'Positivo = coloca más arriba a la gente de sus grupos que los demás.',
        headers: ['Participante', 'Sesgo', 'De su grupo', 'Resto'],
        rows: metrics.ingroupBias.map((b) => [
          participantName(b.participantId),
          signed(b.bias),
          String(b.inGroupCount),
          String(b.outGroupCount),
        ]),
      },
      {
        title: 'Afinidad entre votantes',
        hint: 'Parecido entre tableros (100 = idénticos), sobre al menos 5 personas en común.',
        headers: ['', ...metrics.voterAffinity.participantIds.map(participantName)],
        rows: metrics.voterAffinity.participantIds.map((id, i) => [
          participantName(id),
          ...metrics.voterAffinity.meanDistance[i]!.map((d) => (d === null ? '—' : score(similarityFromDistance(d)))),
        ]),
      },
    )
  }

  const data: ReportData = {
    title: room.name,
    subtitle: room.mode === 'general' ? 'Modo General' : room.revealed ? 'Modo VS · revelado' : 'Modo VS · a ciegas',
    generatedAt: new Date(),
    legend: orderedGroups.map((g) => ({ name: g.name, color: g.color, subgroup: g.parentId !== null })),
    boards,
    tables,
  }
  return renderReportHtml(data)
}
