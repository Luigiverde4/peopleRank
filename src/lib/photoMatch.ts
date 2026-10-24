import { normalizeName } from './names'

/** File name without folders or extension: "orla/Alumnos/Ana Ruiz.png" -> "Ana Ruiz". */
export function photoNameFromPath(path: string): string {
  const base = path.split(/[\\/]/).pop() ?? path
  const dot = base.lastIndexOf('.')
  return dot > 0 ? base.slice(0, dot) : base
}

export interface PhotoMatch<F> {
  matched: { file: F; personId: string }[]
  /** Files whose name is not a person of the room. */
  unmatched: F[]
}

/**
 * Pairs photo files with people by name (case-, accent- and spacing-insensitive), e.g. a class
 * photo folder where every file is called like the student. Each person gets at most one photo.
 */
export function matchPhotos<F>(
  files: readonly F[],
  nameOf: (file: F) => string,
  people: readonly { id: string; name: string }[],
): PhotoMatch<F> {
  const personByName = new Map(people.map((p) => [normalizeName(p.name), p.id]))
  const taken = new Set<string>()
  const result: PhotoMatch<F> = { matched: [], unmatched: [] }
  for (const file of files) {
    const personId = personByName.get(normalizeName(photoNameFromPath(nameOf(file))))
    if (personId && !taken.has(personId)) {
      taken.add(personId)
      result.matched.push({ file, personId })
    } else {
      result.unmatched.push(file)
    }
  }
  return result
}
