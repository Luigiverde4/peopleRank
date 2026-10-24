import { useState } from 'react'
import type { Group } from '../../data/types'

interface GroupPickerProps {
  groups: Group[]
  selectedIds: string[]
  onChange(groupIds: string[]): void
}

/** Multi-select of groups shown as a small dropdown with checkboxes. */
export function GroupPicker({ groups, selectedIds, onChange }: GroupPickerProps) {
  // The checklist renders only while open, so a long people list does not carry one per row.
  const [open, setOpen] = useState(false)
  if (groups.length === 0) return null

  const toggle = (groupId: string) =>
    onChange(selectedIds.includes(groupId) ? selectedIds.filter((id) => id !== groupId) : [...selectedIds, groupId])

  return (
    <details className="relative shrink-0" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className="cursor-pointer list-none rounded px-1.5 text-xs text-slate-500 hover:bg-slate-100">
        {selectedIds.length === 0 ? '+ grupo' : `${selectedIds.length} grupo${selectedIds.length > 1 ? 's' : ''}`}
      </summary>
      {open && (
        <div className="absolute right-0 z-40 mt-1 max-h-64 w-48 overflow-y-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg">
          {groups.map((group) => (
            <label
              key={group.id}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50"
            >
              <input type="checkbox" checked={selectedIds.includes(group.id)} onChange={() => toggle(group.id)} />
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: group.color }} />
              <span className="truncate">{group.name}</span>
            </label>
          ))}
        </div>
      )}
    </details>
  )
}
