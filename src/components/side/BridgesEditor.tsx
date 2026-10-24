import { useMemo, useState } from 'react'
import { useT } from '../../i18n'
import { useRoomStore } from '../../store/roomStore'
import { useGroupTree } from '../useGroupTree'
import { BridgeList } from './BridgeList'

const selectClass = 'min-w-0 flex-1 rounded-md border border-slate-300 bg-surface px-1 py-1 text-sm'

/** Pick group A and group B, then one person of each, to mark them as a bridge between both groups. */
export function BridgesEditor() {
  const t = useT()
  const people = useRoomStore((s) => s.people)
  const addBridge = useRoomStore((s) => s.addBridge)
  const { orderedGroups, effectiveMemberships } = useGroupTree()
  const [groupAId, setGroupAId] = useState('')
  const [groupBId, setGroupBId] = useState('')
  const [personAId, setPersonAId] = useState('')
  const [personBId, setPersonBId] = useState('')

  // Members include the people of the group's subgroups.
  const membersOf = useMemo(() => {
    const byGroup = new Map<string, Set<string>>()
    for (const m of effectiveMemberships) {
      const set = byGroup.get(m.groupId) ?? new Set<string>()
      set.add(m.personId)
      byGroup.set(m.groupId, set)
    }
    return (groupId: string) => people.filter((p) => byGroup.get(groupId)?.has(p.id))
  }, [effectiveMemberships, people])

  if (orderedGroups.length < 2) {
    return <p className="text-xs text-slate-500">{t.bridges.needTwoGroups}</p>
  }

  const groupOptions = (exclude: string) =>
    orderedGroups
      .filter((g) => g.id !== exclude)
      .map((g) => (
        <option key={g.id} value={g.id}>
          {g.parentId ? `↳ ${g.name}` : g.name}
        </option>
      ))

  const membersA = groupAId ? membersOf(groupAId) : []
  const membersB = groupBId ? membersOf(groupBId).filter((p) => p.id !== personAId) : []
  const ready = groupAId && groupBId && personAId && personBId

  const submit = async () => {
    if (!ready) return
    await addBridge({ groupAId, groupBId, personAId, personBId })
    setPersonAId('')
    setPersonBId('')
  }

  return (
    <div className="flex flex-col gap-3">
      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <div className="flex items-center gap-2">
          <select
            aria-label={t.bridges.groupA}
            value={groupAId}
            onChange={(event) => {
              setGroupAId(event.target.value)
              setPersonAId('')
            }}
            className={selectClass}
          >
            <option value="">{t.bridges.pickGroupA}</option>
            {groupOptions(groupBId)}
          </select>
          <span aria-hidden className="text-slate-400">
            ↔
          </span>
          <select
            aria-label={t.bridges.groupB}
            value={groupBId}
            onChange={(event) => {
              setGroupBId(event.target.value)
              setPersonBId('')
            }}
            className={selectClass}
          >
            <option value="">{t.bridges.pickGroupB}</option>
            {groupOptions(groupAId)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <select
            aria-label={t.bridges.personOfA}
            value={personAId}
            disabled={!groupAId}
            onChange={(event) => setPersonAId(event.target.value)}
            className={selectClass}
          >
            <option value="">{groupAId ? t.bridges.pickPersonA : t.bridges.chooseGroupA}</option>
            {membersA.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <span aria-hidden className="text-slate-400">
            —
          </span>
          <select
            aria-label={t.bridges.personOfB}
            value={personBId}
            disabled={!groupBId}
            onChange={(event) => setPersonBId(event.target.value)}
            className={selectClass}
          >
            <option value="">{groupBId ? t.bridges.pickPersonB : t.bridges.chooseGroupB}</option>
            {membersB.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={!ready}
          className="self-start rounded-md bg-sky-600 px-3 py-1 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-40"
        >
          {t.bridges.add}
        </button>
      </form>
      <BridgeList editable />
    </div>
  )
}
