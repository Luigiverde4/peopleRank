import { useMemo, useState } from 'react'
import type { Group } from '../../data/types'
import { useT } from '../../i18n'
import { filterByName } from '../../lib/rooms'
import { useRoomStore } from '../../store/roomStore'
import { useGroupTree } from '../useGroupTree'

/** Searchable checklist of the room's people; ticking adds them to the group, unticking removes them. */
export function GroupMembersPicker({ group }: { group: Group }) {
  const t = useT()
  const people = useRoomStore((s) => s.people)
  const memberships = useRoomStore((s) => s.memberships)
  const setMembership = useRoomStore((s) => s.setMembership)
  const [query, setQuery] = useState('')
  const [onlyMembers, setOnlyMembers] = useState(false)

  const { effectiveMemberships } = useGroupTree()

  const memberIds = useMemo(
    () => new Set(memberships.filter((m) => m.groupId === group.id).map((m) => m.personId)),
    [memberships, group.id],
  )
  // People who belong to this group only through one of its subgroups.
  const viaSubgroupIds = useMemo(
    () =>
      new Set(
        effectiveMemberships.filter((m) => m.groupId === group.id && !memberIds.has(m.personId)).map((m) => m.personId),
      ),
    [effectiveMemberships, group.id, memberIds],
  )
  const isMember = (personId: string) => memberIds.has(personId) || viaSubgroupIds.has(personId)
  const matching = filterByName(people, query)
  const visible = onlyMembers ? matching.filter((p) => isMember(p.id)) : matching
  const inputId = `members-search-${group.id}`

  if (people.length === 0) {
    return <p className="text-xs text-slate-500">{t.groups.addPeopleFirst}</p>
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
          placeholder={t.groups.searchPerson}
          aria-label={t.groups.searchFor(group.name)}
          className="min-w-0 flex-1 rounded-md border border-slate-300 bg-surface px-2 py-1 text-sm outline-none focus:border-sky-400"
        />
        <label className="flex shrink-0 items-center gap-1 text-xs text-slate-600">
          <input type="checkbox" checked={onlyMembers} onChange={(event) => setOnlyMembers(event.target.checked)} />
          {t.groups.onlyMembers}
        </label>
      </div>
      <ul className="max-h-56 overflow-y-auto" aria-label={t.groups.membersOf(group.name)}>
        {visible.length === 0 && <li className="px-2 py-1 text-xs text-slate-400">{t.groups.noMatches}</li>}
        {visible.map((person) => (
          <li key={person.id}>
            <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-surface">
              <input
                type="checkbox"
                checked={isMember(person.id)}
                disabled={viaSubgroupIds.has(person.id)}
                onChange={(event) => void setMembership(person.id, group.id, event.target.checked)}
                style={{ accentColor: group.color }}
              />
              <span className="truncate">{person.name}</span>
              {viaSubgroupIds.has(person.id) && (
                <span className="shrink-0 text-xs text-slate-400" title={t.groups.viaSubgroupHint}>
                  {t.groups.viaSubgroup}
                </span>
              )}
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}
