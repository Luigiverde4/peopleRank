import { useMemo, useState } from 'react'
import type { Group } from '../../data/types'
import { nextGroupColor } from '../../lib/colors'
import { useRoomStore } from '../../store/roomStore'
import { ConfirmButton } from '../ui/ConfirmButton'
import { InlineEdit } from '../ui/InlineEdit'
import { GroupMembersPicker } from './GroupMembersPicker'

export function GroupsTab() {
  const groups = useRoomStore((s) => s.groups)
  const memberships = useRoomStore((s) => s.memberships)
  // The group whose member picker is open; a new group opens it straight away.
  const [openGroupId, setOpenGroupId] = useState<string | null>(null)

  const sizeOf = useMemo(() => {
    const sizes = new Map<string, number>()
    memberships.forEach((m) => sizes.set(m.groupId, (sizes.get(m.groupId) ?? 0) + 1))
    return sizes
  }, [memberships])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
      <CreateGroupForm onCreated={setOpenGroupId} />
      <ul className="divide-y divide-slate-100">
        {groups.length === 0 && <li className="py-2 text-sm text-slate-400">Todavía no hay grupos.</li>}
        {groups.map((group) => (
          <GroupRow
            key={group.id}
            group={group}
            size={sizeOf.get(group.id) ?? 0}
            open={openGroupId === group.id}
            onToggle={() => setOpenGroupId(openGroupId === group.id ? null : group.id)}
          />
        ))}
      </ul>
      <GroupShortcutForm />
    </div>
  )
}

interface GroupRowProps {
  group: Group
  size: number
  open: boolean
  onToggle(): void
}

function GroupRow({ group, size, open, onToggle }: GroupRowProps) {
  const { updateGroup, deleteGroup } = useRoomStore.getState()

  return (
    <li className="flex flex-col gap-2 py-1.5">
      <div className="flex items-center gap-2">
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
        <button
          type="button"
          aria-expanded={open}
          onClick={onToggle}
          className={`shrink-0 rounded-md border px-2 py-0.5 text-xs ${
            open ? 'border-sky-400 bg-sky-50 text-sky-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
          }`}
        >
          {size} {size === 1 ? 'miembro' : 'miembros'} {open ? '▴' : '▾'}
        </button>
        <ConfirmButton title={`Borrar el grupo ${group.name}`} onConfirm={() => void deleteGroup(group.id)}>
          ✕
        </ConfirmButton>
      </div>
      {open && <GroupMembersPicker group={group} />}
    </li>
  )
}

function CreateGroupForm({ onCreated }: { onCreated(groupId: string): void }) {
  const groups = useRoomStore((s) => s.groups)
  const createGroup = useRoomStore((s) => s.createGroup)
  const [name, setName] = useState('')
  const [pickedColor, setPickedColor] = useState<string | null>(null)
  const color = pickedColor ?? nextGroupColor(groups.map((g) => g.color))

  const submit = async () => {
    const groupId = await createGroup(name, color)
    setName('')
    setPickedColor(null)
    if (groupId) onCreated(groupId)
  }

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
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

/** Advanced, collapsed by default: create and fill groups from pasted text. */
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
    <details className="border-t border-slate-100 pt-3">
      <summary className="cursor-pointer text-sm font-medium text-slate-600">Avanzado: pegar grupos como texto</summary>
      <form
        className="mt-2 flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <p className="text-xs text-slate-500">
          Una línea por grupo: <code className="rounded bg-slate-100 px-1">Grupo: nombre1, nombre2</code>. Crea los
          grupos y las personas que falten.
        </p>
        <textarea
          id="group-shortcut"
          rows={3}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={'Fútbol: Ana, Bea, Carlos\nTeatro: Dani, Eva'}
          aria-label="Grupos como texto"
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
    </details>
  )
}
