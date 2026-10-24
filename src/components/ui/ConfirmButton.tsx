import { useEffect, useState, type ReactNode } from 'react'
import { useT } from '../../i18n'

const CONFIRM_TIMEOUT_MS = 3000

interface ConfirmButtonProps {
  onConfirm(): void
  children: ReactNode
  confirmLabel?: string
  title?: string
  /** `subtle` for inline delete icons, `primary` for prominent actions. */
  variant?: 'subtle' | 'primary'
}

const IDLE_CLASSES = {
  subtle: 'px-1.5 text-xs text-slate-400 hover:bg-rose-50 hover:text-rose-600',
  primary: 'px-3 py-1 text-sm font-medium bg-violet-600 text-white hover:bg-violet-500',
}

const ARMED_CLASSES = {
  subtle: 'px-1.5 text-xs bg-rose-600 text-white',
  primary: 'px-3 py-1 text-sm font-medium bg-rose-600 text-white',
}

/** Two-step button for irreversible actions, without blocking browser dialogs. */
export function ConfirmButton({
  onConfirm,
  children,
  confirmLabel,
  title,
  variant = 'subtle',
}: ConfirmButtonProps) {
  const t = useT()
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
      className={`shrink-0 rounded ${armed ? ARMED_CLASSES[variant] : IDLE_CLASSES[variant]}`}
      onClick={() => {
        if (armed) onConfirm()
        setArmed(!armed)
      }}
    >
      {armed ? (confirmLabel ?? t.common.confirm) : children}
    </button>
  )
}
