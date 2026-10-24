import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { LanguageToggle } from '../components/ui/LanguageToggle'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { backend, parseSlug, type GameMode } from '../data'
import { describeError, useT } from '../i18n'
import { loadDisplayName, saveDisplayName } from '../lib/displayName'
import { ImportSessionCard } from './ImportSessionCard'

const inputClass =
  'w-full rounded-md border border-slate-300 bg-surface px-3 py-2 text-sm outline-none focus:border-sky-400'
const buttonClass =
  'rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-40'

export function HomePage() {
  const t = useT()

  return (
    <main className="mx-auto flex min-h-full max-w-3xl flex-col justify-center gap-8 px-4 py-10">
      <div className="flex justify-end gap-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">peopleRank</h1>
        <p className="mt-2 text-slate-600">{t.home.tagline}</p>
        {backend.kind === 'memory' && (
          <p className="mt-2 text-xs text-amber-700">{t.home.offlineDemo}</p>
        )}
      </header>
      <div className="grid gap-6 md:grid-cols-2">
        <CreateRoomCard />
        <JoinRoomCard />
        <ImportSessionCard />
      </div>
    </main>
  )
}

const GAME_MODES: GameMode[] = ['general', 'vs']

function CreateRoomCard() {
  const t = useT()
  const navigate = useNavigate()
  const [roomName, setRoomName] = useState('')
  const [mode, setMode] = useState<GameMode>('general')
  const [displayName, setDisplayName] = useState(loadDisplayName)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const defaultName = t.home.defaultRoomName(new Date())

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      saveDisplayName(displayName)
      const slug = await backend.createRoom(roomName.trim() || defaultName, displayName.trim(), mode)
      navigate(`/r/${slug}`)
    } catch (caught) {
      setError(caught)
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-surface p-5 shadow-sm">
      <h2 className="text-lg font-semibold">{t.home.createTitle}</h2>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium text-slate-700">{t.home.modeLegend}</legend>
        {GAME_MODES.map((option) => (
          <label
            key={option}
            className={`flex cursor-pointer gap-2 rounded-lg border p-3 text-sm ${
              mode === option ? 'border-sky-500 bg-sky-50' : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            <input
              type="radio"
              name="game-mode"
              value={option}
              checked={mode === option}
              onChange={() => setMode(option)}
              className="mt-0.5"
            />
            <span>
              <span className="font-semibold">{t.common.modeName(option)}</span>
              <span className="block text-slate-600">{t.home.modes[option]}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <input
        maxLength={100}
        value={roomName}
        onChange={(event) => setRoomName(event.target.value)}
        placeholder={t.home.roomNamePlaceholder(defaultName)}
        aria-label={t.home.roomNameLabel}
        className={inputClass}
      />
      <p className="-mt-1 text-xs text-slate-500">{t.home.roomNameHint}</p>
      <input
        required
        maxLength={60}
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
        placeholder={t.common.yourName}
        aria-label={t.common.yourName}
        className={inputClass}
      />
      <button type="submit" disabled={busy || !displayName.trim()} className={buttonClass}>
        {busy ? t.home.creating : t.home.createTitle}
      </button>
      {error !== null && <p className="text-sm text-rose-600">{describeError(error, t)}</p>}
    </form>
  )
}

function JoinRoomCard() {
  const t = useT()
  const navigate = useNavigate()
  const [link, setLink] = useState('')
  const slug = parseSlug(link)

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (slug) navigate(`/r/${slug}`)
      }}
      className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-surface p-5 shadow-sm"
    >
      <h2 className="text-lg font-semibold">{t.home.joinTitle}</h2>
      <input
        value={link}
        onChange={(event) => setLink(event.target.value)}
        placeholder={t.home.joinPlaceholder}
        aria-label={t.home.joinLabel}
        className={inputClass}
      />
      <button type="submit" disabled={!slug} className={buttonClass}>
        {t.common.enter}
      </button>
      {link.trim() !== '' && !slug && <p className="text-sm text-slate-500">{t.home.notALink}</p>}
    </form>
  )
}
