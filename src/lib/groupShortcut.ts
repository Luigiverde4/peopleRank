import { cleanName, normalizeName } from './names'

export interface GroupAssignment {
  groupName: string
  memberNames: string[]
}

/**
 * Parses lines like `Grupo: nombre1, nombre2, ...`. Lines without a colon
 * or with an empty group name are ignored. Member names are cleaned and
 * de-duplicated by normalized name.
 */
export function parseGroupShortcut(text: string): GroupAssignment[] {
  const assignments: GroupAssignment[] = []
  for (const line of text.split(/\r?\n/)) {
    const colon = line.indexOf(':')
    if (colon === -1) continue
    const groupName = cleanName(line.slice(0, colon))
    if (groupName === '') continue
    assignments.push({ groupName, memberNames: uniqueNames(line.slice(colon + 1).split(',')) })
  }
  return assignments
}

function uniqueNames(rawNames: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const raw of rawNames) {
    const name = cleanName(raw)
    const key = normalizeName(name)
    if (key === '' || seen.has(key)) continue
    seen.add(key)
    result.push(name)
  }
  return result
}
