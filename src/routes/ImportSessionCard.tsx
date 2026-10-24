import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { loadDisplayName, saveDisplayName } from '../lib/displayName'
import { parseSessionFile, type SessionFile } from '../lib/session'
import { importSession } from '../store/sessionTransfer'

function count(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`
}

/** Starts a new room from a session file exported with "Exportar → Sesión (JSON)". */
export function ImportSessionCard() {
  const navigate = useNavigate()
  const [file, setFile] = useState<SessionFile | null>(null)
  const [displayName, setDisplayName] = useState(loadDisplayName)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const readFile = async (selected: File | undefined) => {
    setError(null)
    setFile(null)
    if (!selected) return
    try {
      setFile(parseSessionFile(await selected.text()))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    }
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      saveDisplayName(displayName)
      navigate(`/r/${await importSession(file, displayName.trim())}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-surface p-5 shadow-sm md:col-span-2"
    >
      <h2 className="text-lg font-semibold">Continuar una sesión</h2>
      <p className="text-sm text-slate-600">
        Crea una sala nueva a partir de un fichero exportado con «Exportar → Sesión (JSON)». Se recuperan personas,
        grupos, puentes y el tablero común (modo General) o tus colocaciones (modo VS).
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          accept="application/json,.json"
          aria-label="Fichero de sesión"
          onChange={(event) => void readFile(event.target.files?.[0])}
          className="text-sm text-slate-600 file:mr-2 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm"
        />
        <input
          required
          maxLength={60}
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Tu nombre"
          aria-label="Tu nombre para la sesión importada"
          className="min-w-0 flex-1 rounded-md border border-slate-300 bg-surface px-3 py-2 text-sm outline-none focus:border-sky-400"
        />
        <button
          type="submit"
          disabled={busy || !file || !displayName.trim()}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-40"
        >
          {busy ? 'Importando…' : 'Importar'}
        </button>
      </div>
      {file && (
        <p className="text-xs text-slate-500">
          «{file.room.name}» · modo {file.room.mode === 'general' ? 'General' : 'VS'} ·{' '}
          {count(file.people.length, 'persona', 'personas')} · {count(file.groups.length, 'grupo', 'grupos')} ·{' '}
          {count(file.bridges.length, 'puente', 'puentes')}
        </p>
      )}
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </form>
  )
}
