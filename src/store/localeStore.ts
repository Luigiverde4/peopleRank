import { create } from 'zustand'
import { LOCALE_STORAGE_KEY, detectLocale, parseLocale, type Locale } from '../lib/locale'

interface LocaleStore {
  locale: Locale
  setLocale(locale: Locale): void
}

function readLocale(): Locale {
  try {
    const saved = parseLocale(localStorage.getItem(LOCALE_STORAGE_KEY))
    if (saved) return saved
  } catch {
    // Storage unavailable: fall back to the browser language.
  }
  return detectLocale(globalThis.navigator?.languages ?? [])
}

function saveLocale(locale: Locale): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    // Storage unavailable: the choice lasts until the page is reloaded.
  }
}

function applyLocale(locale: Locale): void {
  // No document when the store is imported from tests.
  if (globalThis.document) document.documentElement.lang = locale
}

/** UI language: the saved choice, or the browser language the first time. */
export const useLocaleStore = create<LocaleStore>()((set) => ({
  locale: readLocale(),
  setLocale(locale) {
    saveLocale(locale)
    applyLocale(locale)
    set({ locale })
  },
}))

applyLocale(useLocaleStore.getState().locale)
