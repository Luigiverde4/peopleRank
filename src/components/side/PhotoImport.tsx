import { useState } from 'react'
import { photoPreset } from '../../data/presets'
import { useRoomStore, type PhotoSource } from '../../store/roomStore'

type Status = { kind: 'idle' } | { kind: 'running'; done: number; total: number } | { kind: 'done'; text: string }

function summary(result: { assigned: number; unmatched: string[]; failed: string[] }): string {
  const parts = [
    `${result.assigned} foto${result.assigned === 1 ? '' : 's'} asignada${result.assigned === 1 ? '' : 's'}`,
  ]
  if (result.unmatched.length > 0) parts.push(`sin persona con ese nombre: ${result.unmatched.join(', ')}`)
  if (result.failed.length > 0) parts.push(`no se pudieron subir: ${result.failed.join(', ')}`)
  return parts.join(' · ')
}

/**
 * Bulk photos: each file is given to the person with the same name (accents and case ignored).
 * Local builds also offer the git-ignored class photos in presets/orla_fotos.
 */
export function PhotoImport() {
  const importPhotos = useRoomStore((s) => s.importPhotos)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const running = status.kind === 'running'

  const run = async (sources: PhotoSource[]) => {
    if (sources.length === 0) return
    const result = await importPhotos(sources, (done, total) => setStatus({ kind: 'running', done, total }))
    setStatus({ kind: 'done', text: summary(result) })
  }

  const fromPreset = () =>
    run(
      photoPreset.map((file) => ({ name: file.name, load: () => fetch(file.url).then((response) => response.blob()) })),
    )

  const fromFiles = (files: FileList | null) =>
    run([...(files ?? [])].map((file) => ({ name: file.name, load: () => Promise.resolve(file) })))

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        {photoPreset.length > 0 && (
          <button
            type="button"
            disabled={running}
            onClick={() => void fromPreset()}
            className="rounded-md border border-sky-300 px-2 py-0.5 text-xs text-sky-700 hover:bg-sky-50 disabled:opacity-40"
          >
            Cargar fotos de la orla ({photoPreset.length})
          </button>
        )}
        <label
          className={`cursor-pointer rounded-md border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50 ${
            running ? 'pointer-events-none opacity-40' : ''
          }`}
          title="Cada foto se asigna a la persona que se llama igual que el fichero"
        >
          Importar fotos…
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            disabled={running}
            onChange={(event) => {
              void fromFiles(event.target.files)
              event.target.value = ''
            }}
          />
        </label>
      </div>
      {status.kind === 'running' && (
        <p className="text-xs text-slate-500" role="status">
          Subiendo fotos {status.done}/{status.total}…
        </p>
      )}
      {status.kind === 'done' && <p className="text-xs text-slate-500">{status.text}</p>}
    </div>
  )
}
