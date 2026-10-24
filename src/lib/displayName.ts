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

/** Name used when a room is created without one, e.g. "Votación del 24/10". */
export function defaultRoomName(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `Votación del ${day}/${month}`
}
