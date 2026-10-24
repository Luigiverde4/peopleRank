import { useMemo, useState } from 'react'
import type { Group } from '../../data/types'
import { canBeSubgroup } from '../../lib/groupTree'
import { defaultGroupColor, useRoomStore } from '../../store/roomStore'
import { ConfirmButton } from '../ui/ConfirmButton'
import { InlineEdit } from '../ui/InlineEdit'
import { useGroupTree } from '../useGroupTree'
import { BridgesEditor } from './BridgesEditor'
import { GroupMembersPicker } from './GroupMembersPicker'

export function GroupsTab() {
  const { orderedGroups, effectiveMemberships } = useGroupTree()
  // The group whose member picker is open; a new group opens it straight away.
  const [openGroupId, setOpenGroupId] = useState<string | null>(null)

  // Sizes count people in subgroups as members of the parent group too.
  const sizeOf = useMemo(() => {
    const sizes = new Map<string, number>()
    effectiveMemberships.forEach((m) => sizes.set(m.groupId, (sizes.get(m.groupId) ?? 0) + 1))
    return sizes
  }, [effectiveMemberships])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
      <CreateGroupForm onCreated={setOpenGroupId} />
      <ul className="divide-y divide-slate-100">
        {orderedGroups.length === 0 && <li className="py-2 text-sm text-slate-400">Todavía no hay grupos.</li>}
        {orderedGroups.map((group) => (
          <GroupRow
            key={group.id}
            group={group}
            size={sizeOf.get(group.id) ?? 0}
            open={openGroupId === group.id}
            onToggle={() => setOpenGroupId(openGroupId === group.id ? null : group.id)}
          />
        ))}
      </ul>
      <details open className="border-t border-slate-100 pt-3">
        <summary className="cursor-pointer text-sm font-medium text-slate-700">Puentes entre grupos</summary>
        <p className="mb-2 mt-1 text-xs text-slate-500">
          Una persona de un grupo que conecta con otra de otro grupo. Elige los dos grupos y una persona de cada uno.
        </p>
        <BridgesEditor />
      </details>
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
  const isSubgroup = group.parentId !== null
  const deleteTitle = isSubgroup
    ? `Borrar el subgrupo ${group.name}`
    : `Borrar el grupo ${group.name} (sus subgrupos pasan a ser grupos principales)`

  return (
    <li className={`flex flex-col gap-2 py-1.5 ${isSubgroup ? 'pl-5' : ''}`}>
      <div className="flex items-center gap-2">
        {isSubgroup && (
          <span aria-hidden className="-ml-4 text-xs text-slate-400">
            ↳
          </span>
        )}
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
        <ConfirmButton title={deleteTitle} onConfirm={() => void deleteGroup(group.id)}>
          ✕
        </ConfirmButton>
      </div>
      {open && (
        <div className="flex flex-col gap-2">
          <ParentSelect group={group} />
          <GroupMembersPicker group={group} />
        </div>
      )}
    </li>
  )
}

/** Moves a group inside another one (or back to the top level), respecting the two-level limit. */
function ParentSelect({ group }: { group: Group }) {
  const groups = useRoomStore((s) => s.groups)
  const updateGroup = useRoomStore((s) => s.updateGroup)

  if (!canBeSubgroup(group.id, groups)) {
    return <p className="text-xs text-slate-500">Tiene subgrupos, así que no puede estar dentro de otro grupo.</p>
  }
  const candidates = groups.filter((g) => g.parentId === null && g.id !== group.id)
  if (candidates.length === 0) return null

  return (
    <label className="flex items-center gap-2 text-xs text-slate-600">
      Dentro de
      <select
        value={group.parentId ?? ''}
        onChange={(event) => void updateGroup(group.id, { parentId: event.target.value || null })}
        className="min-w-0 rounded-md border border-slate-300 bg-surface px-1 py-0.5 text-xs"
      >
        <option value="">— Ninguno (grupo principal) —</option>
        {candidates.map((candidate) => (
          <option key={candidate.id} value={candidate.id}>
            {candidate.name}
          </option>
        ))}
      </select>
    </label>
  )
}

function CreateGroupForm({ onCreated }: { onCreated(groupId: string): void }) {
  const groups = useRoomStore((s) => s.groups)
  const createGroup = useRoomStore((s) => s.createGroup)
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState('')
  const [pickedColor, setPickedColor] = useState<string | null>(null)
  const color = pickedColor ?? defaultGroupColor(groups, parentId || null)
  const topLevel = groups.filter((g) => g.parentId === null)

  const submit = async () => {
    const groupId = await createGroup(name, color, parentId || null)
    setName('')
    setPickedColor(null)
    if (groupId) onCreated(groupId)
  }

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <div className="flex items-center gap-2">
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
          placeholder={parentId ? 'Nuevo subgrupo' : 'Nuevo grupo'}
          aria-label="Nombre del nuevo grupo"
          className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-sky-400"
        />
        <button
          type="submit"
          disabled={name.trim() === ''}
          className="rounded-md bg-sky-600 px-3 py-1 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-40"
        >
          Crear
        </button>
      </div>
      {topLevel.length > 0 && (
        <label className="flex items-center gap-2 text-xs text-slate-600">
          Dentro de
          <select
            aria-label="Grupo que contiene al nuevo"
            value={parentId}
            onChange={(event) => {
              setParentId(event.target.value)
              setPickedColor(null)
            }}
            className="min-w-0 rounded-md border border-slate-300 bg-surface px-1 py-0.5 text-xs"
          >
            <option value="">— Ninguno (grupo principal) —</option>
            {topLevel.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </label>
      )}
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
            className="rounded-md bg-sky-600 px-3 py-1 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-40"
          >
            Aplicar
          </button>
          {message && <span className="text-xs text-slate-500">{message}</span>}
        </div>
      </form>
    </details>
  )
}
