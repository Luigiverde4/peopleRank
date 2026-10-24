import { useMemo, useState } from 'react'
import type { Group } from '../../data/types'
import { filterByName } from '../../lib/rooms'
import { useRoomStore } from '../../store/roomStore'

/** Searchable checklist of the room's people; ticking adds them to the group, unticking removes them. */
export function GroupMembersPicker({ group }: { group: Group }) {
  const people = useRoomStore((s) => s.people)
  const memberships = useRoomStore((s) => s.memberships)
  const setMembership = useRoomStore((s) => s.setMembership)
  const [query, setQuery] = useState('')
  const [onlyMembers, setOnlyMembers] = useState(false)

  const memberIds = useMemo(
    () => new Set(memberships.filter((m) => m.groupId === group.id).map((m) => m.personId)),
    [memberships, group.id],
  )
  const matching = filterByName(people, query)
  const visible = onlyMembers ? matching.filter((p) => memberIds.has(p.id)) : matching
  const inputId = `members-search-${group.id}`

  if (people.length === 0) {
    return <p className="text-xs text-slate-500">Añade primero personas en la pestaña «Personas».</p>
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 p-2">
      <div className="flex items-center gap-2">
        <input
          id={inputId}
          type="search"
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar persona…"
          aria-label={`Buscar personas para ${group.name}`}
          className="min-w-0 flex-1 rounded-md border border-slate-300 bg-surface px-2 py-1 text-sm outline-none focus:border-sky-400"
        />
        <label className="flex shrink-0 items-center gap-1 text-xs text-slate-600">
          <input type="checkbox" checked={onlyMembers} onChange={(event) => setOnlyMembers(event.target.checked)} />
          Solo miembros
        </label>
      </div>
      <ul className="max-h-56 overflow-y-auto" aria-label={`Miembros de ${group.name}`}>
        {visible.length === 0 && <li className="px-2 py-1 text-xs text-slate-400">Nadie coincide.</li>}
        {visible.map((person) => (
          <li key={person.id}>
            <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-surface">
              <input
                type="checkbox"
                checked={memberIds.has(person.id)}
                onChange={(event) => void setMembership(person.id, group.id, event.target.checked)}
                style={{ accentColor: group.color }}
              />
              <span className="truncate">{person.name}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}
