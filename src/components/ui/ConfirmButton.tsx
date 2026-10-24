import { useEffect, useState, type ReactNode } from 'react'

const CONFIRM_TIMEOUT_MS = 3000

interface ConfirmButtonProps {
  onConfirm(): void
  children: ReactNode
  confirmLabel?: string
  title?: string
}

/** Two-step button for destructive actions, without blocking browser dialogs. */
export function ConfirmButton({ onConfirm, children, confirmLabel = '¿Seguro?', title }: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!armed) return
    const timer = setTimeout(() => setArmed(false), CONFIRM_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [armed])

  return (
    <button
      type="button"
      title={title}
      className={`shrink-0 rounded px-1.5 text-xs ${
        armed ? 'bg-rose-600 text-white' : 'text-slate-400 hover:bg-rose-50 hover:text-rose-600'
      }`}
      onClick={() => {
        if (armed) onConfirm()
        setArmed(!armed)
      }}
    >
      {armed ? confirmLabel : children}
    </button>
  )
}
