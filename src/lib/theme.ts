export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

/** Also read by the inline script in index.html, which applies the theme before the first paint. */
export const THEME_STORAGE_KEY = 'peopleRank:theme'

const PREFERENCES: ThemePreference[] = ['system', 'light', 'dark']

export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): ResolvedTheme {
  if (preference === 'system') return systemPrefersDark ? 'dark' : 'light'
  return preference
}

/** Order of the toggle: system → light → dark → system. */
export function nextPreference(preference: ThemePreference): ThemePreference {
  return PREFERENCES[(PREFERENCES.indexOf(preference) + 1) % PREFERENCES.length]!
}

export function parsePreference(value: string | null): ThemePreference {
  return PREFERENCES.includes(value as ThemePreference) ? (value as ThemePreference) : 'system'
}
