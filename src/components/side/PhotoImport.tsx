import { useState } from 'react'
import { photoPreset } from '../../data/presets'
import { useT, type Messages } from '../../i18n'
import { useRoomStore, type PhotoSource } from '../../store/roomStore'

interface ImportResult {
  assigned: number
  unmatched: string[]
  failed: string[]
}

type Status = { kind: 'idle' } | { kind: 'running'; done: number; total: number } | { kind: 'done'; result: ImportResult }

function summary(result: ImportResult, t: Messages): string {
  const parts = [t.photos.assigned(result.assigned)]
  if (result.unmatched.length > 0) parts.push(t.photos.unmatched(result.unmatched.join(', ')))
  if (result.failed.length > 0) parts.push(t.photos.failed(result.failed.join(', ')))
  return parts.join(' · ')
}

/**
 * Bulk photos: each file is given to the person with the same name (accents and case ignored).
 * Local builds also offer the git-ignored class photos in presets/orla_fotos.
 */
export function PhotoImport() {
  const t = useT()
  const importPhotos = useRoomStore((s) => s.importPhotos)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const running = status.kind === 'running'

  const run = async (sources: PhotoSource[]) => {
    if (sources.length === 0) return
    const result = await importPhotos(sources, (done, total) => setStatus({ kind: 'running', done, total }))
    setStatus({ kind: 'done', result })
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
            {t.photos.loadPreset(photoPreset.length)}
          </button>
        )}
        <label
          className={`cursor-pointer rounded-md border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50 ${
            running ? 'pointer-events-none opacity-40' : ''
          }`}
          title={t.photos.importHint}
        >
          {t.photos.importFiles}
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
          {t.photos.uploading(status.done, status.total)}
        </p>
      )}
      {status.kind === 'done' && <p className="text-xs text-slate-500">{summary(status.result, t)}</p>}
    </div>
  )
}
