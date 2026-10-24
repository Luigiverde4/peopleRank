import { create } from 'zustand'
import {
  THEME_STORAGE_KEY,
  nextPreference,
  parsePreference,
  resolveTheme,
  type ResolvedTheme,
  type ThemePreference,
} from '../lib/theme'

interface ThemeStore {
  preference: ThemePreference
  resolved: ResolvedTheme
  cyclePreference(): void
}

const systemDark = globalThis.matchMedia?.('(prefers-color-scheme: dark)')

function readPreference(): ThemePreference {
  try {
    return parsePreference(localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    return 'system'
  }
}

function savePreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // Storage unavailable: the choice lasts until the page is reloaded.
  }
}

function applyTheme(theme: ResolvedTheme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

const initialPreference = readPreference()

/** Light/dark theme: a saved preference (system, light or dark) applied as the `dark` class on <html>. */
export const useThemeStore = create<ThemeStore>()((set, get) => ({
  preference: initialPreference,
  resolved: resolveTheme(initialPreference, systemDark?.matches ?? false),
  cyclePreference() {
    const preference = nextPreference(get().preference)
    const resolved = resolveTheme(preference, systemDark?.matches ?? false)
    savePreference(preference)
    applyTheme(resolved)
    set({ preference, resolved })
  },
}))

// Keep following the system theme while the preference is "system".
systemDark?.addEventListener('change', (event) => {
  const { preference } = useThemeStore.getState()
  const resolved = resolveTheme(preference, event.matches)
  applyTheme(resolved)
  useThemeStore.setState({ resolved })
})

applyTheme(useThemeStore.getState().resolved)
