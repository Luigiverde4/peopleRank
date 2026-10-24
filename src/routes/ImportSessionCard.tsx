import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { describeError, useT } from '../i18n'
import { loadDisplayName, saveDisplayName } from '../lib/displayName'
import { parseSessionFile, type SessionFile } from '../lib/session'
import { importSession } from '../store/sessionTransfer'

/** Starts a new room from a session file exported with "Export → Session (JSON)". */
export function ImportSessionCard() {
  const t = useT()
  const navigate = useNavigate()
  const [file, setFile] = useState<SessionFile | null>(null)
  const [displayName, setDisplayName] = useState(loadDisplayName)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const readFile = async (selected: File | undefined) => {
    setError(null)
    setFile(null)
    if (!selected) return
    try {
      setFile(parseSessionFile(await selected.text()))
    } catch (caught) {
      setError(caught)
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
      setError(caught)
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-surface p-5 shadow-sm md:col-span-2"
    >
      <h2 className="text-lg font-semibold">{t.importSession.title}</h2>
      <p className="text-sm text-slate-600">{t.importSession.description}</p>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          accept="application/json,.json"
          aria-label={t.importSession.fileLabel}
          onChange={(event) => void readFile(event.target.files?.[0])}
          className="text-sm text-slate-600 file:mr-2 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm"
        />
        <input
          required
          maxLength={60}
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder={t.common.yourName}
          aria-label={t.importSession.nameLabel}
          className="min-w-0 flex-1 rounded-md border border-slate-300 bg-surface px-3 py-2 text-sm outline-none focus:border-sky-400"
        />
        <button
          type="submit"
          disabled={busy || !file || !displayName.trim()}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-40"
        >
          {busy ? t.importSession.importing : t.importSession.import}
        </button>
      </div>
      {file && (
        <p className="text-xs text-slate-500">
          {t.importSession.summary(
            file.room.name || t.importSession.defaultName,
            t.common.modeName(file.room.mode),
            file.people.length,
            file.groups.length,
            file.bridges.length,
          )}
        </p>
      )}
      {error !== null && <p className="text-sm text-rose-600">{describeError(error, t)}</p>}
    </form>
  )
}
