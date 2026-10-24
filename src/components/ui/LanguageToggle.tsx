import { useT } from '../../i18n'
import { LOCALES } from '../../lib/locale'
import { useLocaleStore } from '../../store/localeStore'

/** Two-segment ES / EN switch. */
export function LanguageToggle() {
  const t = useT()
  const locale = useLocaleStore((s) => s.locale)
  const setLocale = useLocaleStore((s) => s.setLocale)

  return (
    <div
      role="group"
      aria-label={t.language.label}
      className="flex divide-x divide-slate-300 overflow-hidden rounded-md border border-slate-300 text-xs"
    >
      {LOCALES.map((option) => (
        <button
          key={option}
          type="button"
          lang={option}
          aria-pressed={locale === option}
          title={t.language.names[option]}
          onClick={() => setLocale(option)}
          className={`px-2 py-0.5 font-medium uppercase ${
            locale === option ? 'bg-slate-800 text-slate-50' : 'bg-surface text-slate-600 hover:bg-slate-100'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  )
}
