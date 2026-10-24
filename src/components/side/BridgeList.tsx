import { useMemo } from 'react'
import { useT } from '../../i18n'
import { bridgesByPair } from '../../lib/bridges'
import { useRoomStore } from '../../store/roomStore'
import { useUiStore } from '../../store/uiStore'
import { ConfirmButton } from '../ui/ConfirmButton'

/** Bridges grouped by pair of groups. Names highlight the person on the board; `editable` adds delete buttons. */
export function BridgeList({ editable = false }: { editable?: boolean }) {
  const t = useT()
  const bridges = useRoomStore((s) => s.bridges)
  const people = useRoomStore((s) => s.people)
  const groups = useRoomStore((s) => s.groups)
  const removeBridge = useRoomStore((s) => s.removeBridge)
  const setSearch = useUiStore((s) => s.setSearch)

  const pairs = useMemo(() => bridgesByPair(bridges), [bridges])
  const nameOf = new Map(people.map((p) => [p.id, p.name]))
  const groupById = new Map(groups.map((g) => [g.id, g]))

  if (pairs.length === 0) {
    return <p className="text-xs text-slate-400">{t.bridges.none}</p>
  }

  const personButton = (id: string) => (
    <button
      type="button"
      title={t.common.highlight}
      onClick={() => setSearch(nameOf.get(id) ?? '')}
      className="min-w-0 truncate hover:text-sky-700 hover:underline"
    >
      {nameOf.get(id) ?? '?'}
    </button>
  )

  const groupLabel = (id: string) => {
    const group = groupById.get(id)
    return (
      <span className="flex min-w-0 items-center gap-1">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: group?.color }} />
        <span className="truncate">{group?.name ?? '?'}</span>
      </span>
    )
  }

  return (
    <ul className="space-y-2">
      {pairs.map((pair) => (
        <li key={`${pair.groupAId}|${pair.groupBId}`} className="text-sm">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            {groupLabel(pair.groupAId)}
            <span aria-hidden>↔</span>
            {groupLabel(pair.groupBId)}
            <span className="ml-auto font-normal text-slate-400">
              {t.bridges.count(pair.bridges.length)}
            </span>
          </div>
          <ul className="mt-0.5">
            {pair.bridges.map((bridge) => (
              <li key={bridge.id} className="flex items-center gap-1.5 pl-4">
                {personButton(bridge.personAId)}
                <span aria-hidden className="text-slate-400">
                  —
                </span>
                {personButton(bridge.personBId)}
                {editable && (
                  <span className="ml-auto">
                    <ConfirmButton title={t.bridges.remove} onConfirm={() => void removeBridge(bridge.id)}>
                      ✕
                    </ConfirmButton>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  )
}
