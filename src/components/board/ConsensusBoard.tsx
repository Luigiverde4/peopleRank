import { useMemo } from 'react'
import { useRoomStore } from '../../store/roomStore'
import { useRoomMetrics } from '../useRoomMetrics'
import { ReadOnlyBoard, type BoardItem } from './ReadOnlyBoard'

/** Median position of each person; the halo radius is the dispersion and the badge the number of votes. */
export function ConsensusBoard() {
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
    <div className="flex w-full flex-col gap-2">
      <p className="text-xs text-slate-500">
        Posición = mediana de los votos · halo = dispersión · número = votos
        {withoutVotes > 0 && ` · ${withoutVotes} sin votos`}
      </p>
      <ReadOnlyBoard items={items} emptyMessage="Todavía nadie ha colocado a nadie." />
    </div>
  )
}
