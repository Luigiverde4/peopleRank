/** Collapses whitespace and trims a name typed or pasted by the user. */
export function cleanName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

/** Key used to compare names: case-, accent- and whitespace-insensitive. */
export function normalizeName(name: string): string {
  return cleanName(name)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

/**
 * Parses a pasted list (one name per line) and returns the cleaned names
 * that are not empty and not duplicated, neither inside the list nor
 * against `existingNames`.
 */
export function parseNameList(text: string, existingNames: readonly string[] = []): string[] {
  const seen = new Set(existingNames.map(normalizeName))
  const result: string[] = []
  for (const line of text.split(/\r?\n/)) {
    const name = cleanName(line)
    const key = normalizeName(name)
    if (key === '' || seen.has(key)) continue
    seen.add(key)
    result.push(name)
  }
  return result
}

/** Up to two uppercase initials, e.g. "ana maría lópez" -> "AM". */
export function initials(name: string): string {
  const words = cleanName(name).split(' ').filter(Boolean)
  return words
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('')
}
