import type { ReactNode } from 'react'
import type { Participant } from '../../data/types'
import { useT } from '../../i18n'
import { similarityFromDistance } from '../../lib/metrics'
import { useRoomStore } from '../../store/roomStore'
import { useUiStore } from '../../store/uiStore'
import { BridgeList } from '../side/BridgeList'
import { useRoomMetrics } from '../useRoomMetrics'

/** Coordinates and distances shown on a 0–100 scale. */
function score(value: number | null): string {
  return value === null ? '—' : String(Math.round(value * 100))
}

function signedScore(value: number | null): string {
  if (value === null) return '—'
  const rounded = Math.round(value * 100)
  return rounded > 0 ? `+${rounded}` : String(rounded)
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <details open className="group border-b border-slate-100 py-2 last:border-b-0">
      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-700">
        <span className="mr-1 inline-block transition-transform group-open:rotate-90">›</span>
        {title}
      </summary>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      <div className="mt-2 text-sm">{children}</div>
    </details>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-xs text-slate-400">{children}</p>
}

export function StatsPanel() {
  const t = useT()
  const revealed = useRoomStore((s) => s.room?.revealed ?? false)
  const mode = useRoomStore((s) => s.room?.mode ?? 'vs')

  return (
    <aside className="rounded-lg border border-slate-200 bg-surface px-3 py-1 xl:max-h-[calc(100dvh-6rem)] xl:w-80 xl:shrink-0 xl:overflow-y-auto">
      <h2 className="py-2 text-base font-semibold">{t.stats.title}</h2>
      <GroupStatsSection />
      <Section title={t.stats.bridges} hint={t.stats.bridgesHint}>
        <BridgeList />
      </Section>
      {/* Comparing voters only makes sense with individual boards. */}
      {mode === 'general' ? null : revealed ? (
        <>
          <ControversialSection />
          <SelfPerceptionSection />
          <IngroupBiasSection />
          <AffinitySection />
        </>
      ) : (
        <p className="py-3 text-xs text-slate-500">{t.stats.lockedUntilReveal}</p>
      )}
    </aside>
  )
}

function GroupStatsSection() {
  const t = useT()
  const groups = useRoomStore((s) => s.groups)
  const { groupStats } = useRoomMetrics()
  const groupById = new Map(groups.map((g) => [g.id, g]))

  return (
    <Section title={t.stats.groups} hint={t.stats.groupsHint}>
      {groupStats.length === 0 ? (
        <Empty>{t.common.noGroupsYet}</Empty>
      ) : (
        <table className="w-full text-xs">
          <thead className="text-slate-500">
            <tr>
              <th className="text-left font-normal">{t.stats.group}</th>
              <th className="text-right font-normal">{t.stats.size}</th>
              <th className="text-right font-normal" title={t.stats.courseHint}>
                {t.stats.course}
              </th>
              <th className="text-right font-normal" title={t.stats.inGroupHint}>
                {t.stats.inGroup}
              </th>
            </tr>
          </thead>
          <tbody>
            {groupStats.map((stat) => {
              const group = groupById.get(stat.groupId)
              return (
                <tr key={stat.groupId}>
                  <td className={`flex items-center gap-1.5 py-0.5 ${group?.parentId ? 'pl-3' : ''}`}>
                    {group?.parentId && (
                      <span aria-hidden className="text-slate-400">
                        ↳
                      </span>
                    )}
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: group?.color }} />
                    <span className="truncate">{group?.name}</span>
                  </td>
                  <td className="text-right">{stat.size}</td>
                  <td className="text-right">{score(stat.meanY)}</td>
                  <td className="text-right">{score(stat.meanX)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </Section>
  )
}

function PersonButton({ name }: { name: string }) {
  const t = useT()
  const setSearch = useUiStore((s) => s.setSearch)
  return (
    <button
      type="button"
      title={t.common.highlight}
      onClick={() => setSearch(name)}
      className="min-w-0 truncate text-left hover:text-sky-700 hover:underline"
    >
      {name}
    </button>
  )
}

function ControversialSection() {
  const t = useT()
  const people = useRoomStore((s) => s.people)
  const { controversial } = useRoomMetrics()
  const nameOf = new Map(people.map((p) => [p.id, p.name]))

  return (
    <Section title={t.stats.controversial} hint={t.stats.controversialHint}>
      {controversial.length === 0 ? (
        <Empty>{t.stats.controversialEmpty}</Empty>
      ) : (
        <ol className="space-y-0.5">
          {controversial.map((entry) => (
            <li key={entry.personId} className="flex items-center justify-between gap-2">
              <PersonButton name={nameOf.get(entry.personId) ?? '?'} />
              <span className="shrink-0 text-xs text-slate-500">
                {t.stats.dispersion(score(entry.dispersion), entry.votes)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Section>
  )
}

function participantLabel(participant: Participant | undefined): string {
  return participant?.displayName ?? '?'
}

function SelfPerceptionSection() {
  const t = useT()
  const participants = useRoomStore((s) => s.participants)
  const { selfPerception } = useRoomMetrics()
  const byId = new Map(participants.map((p) => [p.id, p]))

  return (
    <Section title={t.stats.selfPerception} hint={t.stats.selfPerceptionHint}>
      {selfPerception.length === 0 ? (
        <Empty>{t.stats.selfPerceptionEmpty}</Empty>
      ) : (
        <ul className="space-y-1">
          {selfPerception.map((entry) => {
            const gap = entry.self && entry.others ? entry.self.y - entry.others.y : null
            return (
              <li key={entry.participantId}>
                <div className="flex justify-between gap-2">
                  <span className="truncate font-medium">{participantLabel(byId.get(entry.participantId))}</span>
                  <span className="shrink-0 text-xs text-slate-500">{t.stats.distance(score(entry.distance))}</span>
                </div>
                <p className="text-xs text-slate-500">
                  {t.stats.seesSelf(score(entry.self?.y ?? null))} · {t.stats.seenAs(score(entry.others?.y ?? null))}
                  {entry.othersVotes > 0 && t.stats.votes(entry.othersVotes)}
                  {gap !== null && Math.abs(gap) >= 0.05 && (
                    <span className={gap > 0 ? 'text-amber-700' : 'text-sky-700'}>{t.stats.seesSelfAs(gap > 0)}</span>
                  )}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </Section>
  )
}

function IngroupBiasSection() {
  const t = useT()
  const participants = useRoomStore((s) => s.participants)
  const { ingroupBias } = useRoomMetrics()
  const byId = new Map(participants.map((p) => [p.id, p]))

  return (
    <Section title={t.stats.ingroupBias} hint={t.stats.ingroupBiasHint}>
      {ingroupBias.length === 0 ? (
        <Empty>{t.stats.nobodyLinked}</Empty>
      ) : (
        <ul className="space-y-0.5">
          {ingroupBias.map((entry) => (
            <li key={entry.participantId} className="flex items-center justify-between gap-2">
              <span className="truncate">{participantLabel(byId.get(entry.participantId))}</span>
              <span className="shrink-0 text-xs text-slate-500">
                <span
                  className={`font-semibold ${
                    entry.bias === null ? '' : entry.bias > 0 ? 'text-amber-700' : 'text-sky-700'
                  }`}
                >
                  {signedScore(entry.bias)}
                </span>{' '}
                {t.stats.biasCounts(entry.inGroupCount, entry.outGroupCount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

function AffinitySection() {
  const t = useT()
  const participants = useRoomStore((s) => s.participants)
  const { voterAffinity } = useRoomMetrics()
  const byId = new Map(participants.map((p) => [p.id, p]))
  const ids = voterAffinity.participantIds

  return (
    <Section title={t.stats.affinity} hint={t.stats.affinityHint}>
      {ids.length < 2 ? (
        <Empty>{t.stats.affinityEmpty}</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="text-xs">
            <thead>
              <tr>
                <th />
                {ids.map((id) => (
                  <th key={id} className="max-w-12 truncate px-1 font-normal text-slate-500">
                    {participantLabel(byId.get(id)).slice(0, 6)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ids.map((rowId, i) => (
                <tr key={rowId}>
                  <th className="max-w-20 truncate pr-1 text-left font-normal text-slate-500">
                    {participantLabel(byId.get(rowId))}
                  </th>
                  {ids.map((colId, j) => {
                    const value = voterAffinity.meanDistance[i]?.[j] ?? null
                    const similarity = value === null ? null : similarityFromDistance(value)
                    return (
                      <td
                        key={colId}
                        className="h-7 w-10 text-center"
                        style={{
                          background: similarity === null ? undefined : `rgb(124 58 237 / ${similarity * 0.6})`,
                          color: similarity !== null && similarity > 0.7 ? 'white' : undefined,
                        }}
                      >
                        {score(similarity)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  )
}
