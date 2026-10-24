import { useState } from 'react'
import { useT } from '../../i18n'

interface InlineEditProps {
  value: string
  onSave(value: string): void
  label: string
  className?: string
}

/** Text that turns into an input on click; saves on Enter or blur, cancels on Escape. */
export function InlineEdit({ value, onSave, label, className = '' }: InlineEditProps) {
  const t = useT()
  const [draft, setDraft] = useState<string | null>(null)

  if (draft === null) {
    return (
      <button
        type="button"
        title={t.common.rename(value)}
        className={`min-w-0 truncate rounded px-1 text-left hover:bg-slate-100 ${className}`}
        onClick={() => setDraft(value)}
      >
        {value}
      </button>
    )
  }

  const commit = () => {
    if (draft.trim() !== '' && draft !== value) onSave(draft)
    setDraft(null)
  }

  return (
    <input
      autoFocus
      aria-label={label}
      className={`min-w-0 rounded border border-sky-400 px-1 outline-none ${className}`}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') commit()
        if (event.key === 'Escape') setDraft(null)
      }}
    />
  )
}
