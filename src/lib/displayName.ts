const DISPLAY_NAME_KEY = 'peopleRank:displayName'

/** Last name used to create or join a room, to prefill the forms. */
export function loadDisplayName(): string {
  try {
    return localStorage.getItem(DISPLAY_NAME_KEY) ?? ''
  } catch {
    return ''
  }
}

export function saveDisplayName(name: string): void {
  try {
    localStorage.setItem(DISPLAY_NAME_KEY, name.trim())
  } catch {
    // Storage unavailable (private mode): prefilling is only a convenience.
  }
}
