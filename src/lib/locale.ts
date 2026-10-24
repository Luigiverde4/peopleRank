export type Locale = 'es' | 'en'

export const LOCALES: Locale[] = ['es', 'en']

export const LOCALE_STORAGE_KEY = 'peopleRank:locale'

/** The app was written in Spanish, so it is the fallback for any other browser language. */
export const DEFAULT_LOCALE: Locale = 'es'

export function parseLocale(value: string | null): Locale | null {
  return LOCALES.includes(value as Locale) ? (value as Locale) : null
}

/** First supported language in the browser's preference list ("en-GB" counts as "en"). */
export function detectLocale(browserLanguages: readonly string[]): Locale {
  for (const language of browserLanguages) {
    const locale = parseLocale(language.toLowerCase().split('-')[0] ?? null)
    if (locale) return locale
  }
  return DEFAULT_LOCALE
}
