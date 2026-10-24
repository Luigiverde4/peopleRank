import { useMemo, useState } from 'react'
import { groupIdsByPerson, matchesSearch } from '../../lib/rooms'
import { useRoomStore } from '../../store/roomStore'
import { useUiStore } from '../../store/uiStore'
import { Token } from '../Token'
import { ConfirmButton } from '../ui/ConfirmButton'
import { InlineEdit } from '../ui/InlineEdit'
import { useTokenStyles } from '../useTokenStyles'
import { GroupPicker } from './GroupPicker'

export function PeopleTab() {
  const people = useRoomStore((s) => s.people)
  const groups = useRoomStore((s) => s.groups)
  const memberships = useRoomStore((s) => s.memberships)
  const search = useUiStore((s) => s.search)
  const { lookOf } = useTokenStyles()
  const { renamePerson, deletePerson, setPersonGroups } = useRoomStore.getState()

  const groupsOf = useMemo(() => groupIdsByPerson(memberships, groups), [memberships, groups])
  const visible = search.trim() === '' ? people : people.filter((p) => matchesSearch(p.name, search))

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <AddPeopleForm />
      <p className="text-xs text-slate-500">
        {people.length} personas{visible.length !== people.length && ` · ${visible.length} coinciden con la búsqueda`}
      </p>
      <ul className="-mx-1 min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
        {visible.map((person) => (
          <li key={person.id} className="flex items-center gap-2 px-1 py-1.5">
            <Token name={person.name} {...lookOf(person)} dimmed={false} highlighted={false} size={26} />
            <InlineEdit
              value={person.name}
              label="Nombre de la persona"
              className="flex-1 text-sm"
              onSave={(name) => void renamePerson(person.id, name)}
            />
            <GroupPicker
              groups={groups}
              selectedIds={groupsOf.get(person.id) ?? []}
              onChange={(ids) => void setPersonGroups(person.id, ids)}
            />
            <ConfirmButton title={`Borrar a ${person.name}`} onConfirm={() => void deletePerson(person.id)}>
              ✕
            </ConfirmButton>
          </li>
        ))}
      </ul>
    </div>
  )
}

function AddPeopleForm() {
  const [text, setText] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const addPeopleFromText = useRoomStore((s) => s.addPeopleFromText)

  const submit = async () => {
    const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '').length
    const added = await addPeopleFromText(text)
    const skipped = lines - added
    setMessage(
      `Añadidas ${added} persona${added === 1 ? '' : 's'}` +
        (skipped > 0 ? ` · ${skipped} repetida${skipped === 1 ? '' : 's'} ignorada${skipped === 1 ? '' : 's'}` : ''),
    )
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
        Añadir personas (una por línea)
      </label>
      <textarea
        id="people-input"
        rows={4}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={'Ana García\nBeatriz López\n...'}
        className="resize-y rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-sky-400"
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={text.trim() === ''}
          className="rounded-md bg-sky-600 px-3 py-1 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-40"
        >
          Añadir
        </button>
        {message && <span className="text-xs text-slate-500">{message}</span>}
      </div>
    </form>
  )
}
