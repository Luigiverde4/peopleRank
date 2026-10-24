import { useT } from '../../i18n'
import type { ThemePreference } from '../../lib/theme'
import { useThemeStore } from '../../store/themeStore'

const ICONS: Record<ThemePreference, string> = {
  system: '◐',
  light: '☀',
  dark: '☾',
}

/** Cycles the theme: system → light → dark. */
export function ThemeToggle() {
  const t = useT()
  const preference = useThemeStore((s) => s.preference)
  const cyclePreference = useThemeStore((s) => s.cyclePreference)

  return (
    <button
      type="button"
      onClick={cyclePreference}
      title={t.theme.title}
      className="flex items-center gap-1 rounded-md border border-slate-300 bg-surface px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-100"
    >
      <span aria-hidden>{ICONS[preference]}</span>
      {t.theme.label(t.theme[preference])}
    </button>
  )
}
