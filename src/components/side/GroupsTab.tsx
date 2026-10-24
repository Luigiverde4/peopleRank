import { useMemo, useState } from 'react'
import { nextGroupColor } from '../../lib/colors'
import { useRoomStore } from '../../store/roomStore'
import { ConfirmButton } from '../ui/ConfirmButton'
import { InlineEdit } from '../ui/InlineEdit'

export function GroupsTab() {
  const groups = useRoomStore((s) => s.groups)
  const memberships = useRoomStore((s) => s.memberships)
  const { updateGroup, deleteGroup } = useRoomStore.getState()

  const sizeOf = useMemo(() => {
    const sizes = new Map<string, number>()
    memberships.forEach((m) => sizes.set(m.groupId, (sizes.get(m.groupId) ?? 0) + 1))
    return sizes
  }, [memberships])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
      <CreateGroupForm />
      <ul className="divide-y divide-slate-100">
        {groups.length === 0 && <li className="py-2 text-sm text-slate-400">Todavía no hay grupos.</li>}
        {groups.map((group) => (
          <li key={group.id} className="flex items-center gap-2 py-1.5">
            <input
              type="color"
              aria-label={`Color de ${group.name}`}
              value={group.color}
              onChange={(event) => void updateGroup(group.id, { color: event.target.value })}
              className="h-6 w-6 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
            />
            <InlineEdit
              value={group.name}
              label="Nombre del grupo"
              className="flex-1 text-sm"
              onSave={(name) => void updateGroup(group.id, { name })}
            />
            <span className="text-xs text-slate-400">{sizeOf.get(group.id) ?? 0}</span>
            <ConfirmButton title={`Borrar el grupo ${group.name}`} onConfirm={() => void deleteGroup(group.id)}>
              ✕
            </ConfirmButton>
          </li>
        ))}
      </ul>
      <GroupShortcutForm />
    </div>
  )
}

function CreateGroupForm() {
  const groups = useRoomStore((s) => s.groups)
  const createGroup = useRoomStore((s) => s.createGroup)
  const [name, setName] = useState('')
  const [pickedColor, setPickedColor] = useState<string | null>(null)
  const color = pickedColor ?? nextGroupColor(groups.map((g) => g.color))

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        void createGroup(name, color)
        setName('')
        setPickedColor(null)
      }}
    >
      <input
        type="color"
        aria-label="Color del nuevo grupo"
        value={color}
        onChange={(event) => setPickedColor(event.target.value)}
        className="h-7 w-7 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
      />
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Nuevo grupo"
        aria-label="Nombre del nuevo grupo"
        className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-sky-400"
      />
      <button
        type="submit"
        disabled={name.trim() === ''}
        className="rounded-md bg-sky-600 px-3 py-1 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-40"
      >
        Crear
      </button>
    </form>
  )
}

function GroupShortcutForm() {
  const [text, setText] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const applyGroupShortcut = useRoomStore((s) => s.applyGroupShortcut)

  const submit = async () => {
    const result = await applyGroupShortcut(text)
    setMessage(`${result.groups} grupos nuevos · ${result.people} personas nuevas`)
    setText('')
  }

  return (
    <form
      className="flex flex-col gap-2 border-t border-slate-100 pt-3"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <label className="text-sm font-medium text-slate-700" htmlFor="group-shortcut">
        Crear y asignar en bloque
      </label>
      <p className="text-xs text-slate-500">
        Una línea por grupo: <code className="rounded bg-slate-100 px-1">Grupo: nombre1, nombre2</code>. Crea los grupos
        y las personas que falten.
      </p>
      <textarea
        id="group-shortcut"
        rows={3}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={'Fútbol: Ana, Bea, Carlos\nTeatro: Dani, Eva'}
        className="resize-y rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-sky-400"
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={text.trim() === ''}
          className="rounded-md bg-sky-600 px-3 py-1 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-40"
        >
          Aplicar
        </button>
        {message && <span className="text-xs text-slate-500">{message}</span>}
      </div>
    </form>
  )
}
