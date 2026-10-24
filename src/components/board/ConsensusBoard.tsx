import { useMemo } from 'react'
import { useT } from '../../i18n'
import { useRoomStore } from '../../store/roomStore'
import { useRoomMetrics } from '../useRoomMetrics'
import { ReadOnlyBoard, type BoardItem } from './ReadOnlyBoard'

/** Median position of each person; the halo radius is the dispersion and the badge the number of votes. */
export function ConsensusBoard() {
  const t = useT()
  const people = useRoomStore((s) => s.people)
  const { consensus } = useRoomMetrics()

  const items = useMemo<BoardItem[]>(() => {
    const byPerson = new Map(consensus.map((entry) => [entry.personId, entry]))
    return people.flatMap((person) => {
      const entry = byPerson.get(person.id)
      if (!entry) return []
      return [{ person, point: entry, haloRadius: entry.dispersion, badge: entry.votes }]
    })
  }, [people, consensus])

  const withoutVotes = people.length - items.length

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-2">
      <p className="text-xs text-slate-500">
        {t.board.consensusLegend}
        {withoutVotes > 0 && t.board.withoutVotes(withoutVotes)}
      </p>
      <ReadOnlyBoard items={items} emptyMessage={t.board.nobodyPlaced} />
    </div>
  )
}
