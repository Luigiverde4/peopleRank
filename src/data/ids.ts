import { customAlphabet } from 'nanoid'

const SLUG_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'
export const SLUG_LENGTH = 14

export const newSlug = customAlphabet(SLUG_ALPHABET, SLUG_LENGTH)

/** RFC 4122 v4 id. Falls back to getRandomValues outside secure contexts (e.g. LAN over http). */
export function newId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6]! & 0x0f) | 0x40
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/** Extracts a room slug from a pasted link (`.../r/<slug>`) or a bare slug. */
export function parseSlug(input: string): string | null {
  const text = input.trim()
  const fromLink = text.match(/\/r\/([A-Za-z0-9_-]+)/)
  const slug = fromLink ? fromLink[1]! : text
  return /^[A-Za-z0-9_-]{12,}$/.test(slug) ? slug : null
}
