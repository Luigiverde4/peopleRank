import type { ThemePreference } from '../../lib/theme'
import { useThemeStore } from '../../store/themeStore'

const LABELS: Record<ThemePreference, { icon: string; text: string }> = {
  system: { icon: '◐', text: 'Sistema' },
  light: { icon: '☀', text: 'Claro' },
  dark: { icon: '☾', text: 'Oscuro' },
}

/** Cycles the theme: system → light → dark. */
export function ThemeToggle() {
  const preference = useThemeStore((s) => s.preference)
  const cyclePreference = useThemeStore((s) => s.cyclePreference)
  const { icon, text } = LABELS[preference]

  return (
    <button
      type="button"
      onClick={cyclePreference}
      title="Cambiar el tema (sistema, claro u oscuro)"
      className="flex items-center gap-1 rounded-md border border-slate-300 bg-surface px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-100"
    >
      <span aria-hidden>{icon}</span>
      Tema: {text}
    </button>
  )
}
