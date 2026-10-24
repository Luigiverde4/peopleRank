import { useMemo, useState } from 'react'
import { namePresets } from '../../data/presets'
import { useT } from '../../i18n'
import { groupIdsByPerson, matchesSearch } from '../../lib/rooms'
import { useRoomStore } from '../../store/roomStore'
import { useUiStore } from '../../store/uiStore'
import { Token } from '../Token'
import { ConfirmButton } from '../ui/ConfirmButton'
import { InlineEdit } from '../ui/InlineEdit'
import { useGroupTree } from '../useGroupTree'
import { useTokenStyles } from '../useTokenStyles'
import { GroupPicker } from './GroupPicker'
import { PhotoButton } from './PhotoButton'
import { PhotoImport } from './PhotoImport'

export function PeopleTab() {
  const t = useT()
  const people = useRoomStore((s) => s.people)
  const groups = useRoomStore((s) => s.groups)
  const { orderedGroups } = useGroupTree()
  const memberships = useRoomStore((s) => s.memberships)
  const search = useUiStore((s) => s.search)
  const { lookOf } = useTokenStyles()
  const { renamePerson, deletePerson, setPersonGroups } = useRoomStore.getState()

  const groupsOf = useMemo(() => groupIdsByPerson(memberships, groups), [memberships, groups])
  const visible = search.trim() === '' ? people : people.filter((p) => matchesSearch(p.name, search))

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <AddPeopleForm />
      <PhotoImport />
      <p className="text-xs text-slate-500">
        {t.people.total(people.length)}
        {visible.length !== people.length && t.people.matching(visible.length)}
      </p>
      <ul className="-mx-1 min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
        {visible.map((person) => (
          <li key={person.id} className="flex items-center gap-2 px-1 py-1.5">
            <Token name={person.name} {...lookOf(person)} dimmed={false} highlighted={false} size={26} />
            <InlineEdit
              value={person.name}
              label={t.people.nameLabel}
              className="flex-1 text-sm"
              onSave={(name) => void renamePerson(person.id, name)}
            />
            <PhotoButton personId={person.id} personName={person.name} hasPhoto={person.photoPath !== null} />
            <GroupPicker
              groups={orderedGroups}
              selectedIds={groupsOf.get(person.id) ?? []}
              onChange={(ids) => void setPersonGroups(person.id, ids)}
            />
            <ConfirmButton title={t.people.delete(person.name)} onConfirm={() => void deletePerson(person.id)}>
              ✕
            </ConfirmButton>
          </li>
        ))}
      </ul>
    </div>
  )
}

function AddPeopleForm() {
  const t = useT()
  const [text, setText] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const addPeopleFromText = useRoomStore((s) => s.addPeopleFromText)

  const addNames = async (names: string) => {
    const lines = names.split(/\r?\n/).filter((line) => line.trim() !== '').length
    const added = await addPeopleFromText(names)
    setMessage(t.people.added(added, lines - added))
  }

  const submit = async () => {
    await addNames(text)
    setText('')
  }

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <label className="text-sm font-medium text-slate-700" htmlFor="people-input">
        {t.people.addLabel}
      </label>
      <textarea
        id="people-input"
        rows={4}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={t.people.addPlaceholder}
        className="resize-y rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-sky-400"
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={text.trim() === ''}
          className="rounded-md bg-sky-600 px-3 py-1 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-40"
        >
          {t.people.add}
        </button>
        {message && <span className="text-xs text-slate-500">{message}</span>}
      </div>
      {namePresets.map((preset) => (
        <button
          key={preset.label}
          type="button"
          onClick={() => void addNames(preset.text)}
          className="self-start rounded-md border border-sky-300 px-2 py-0.5 text-xs text-sky-700 hover:bg-sky-50"
        >
          {t.people.loadPreset(preset.label, preset.count)}
        </button>
      ))}
    </form>
  )
}
