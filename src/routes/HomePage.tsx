import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { backend, parseSlug } from '../data'
import { defaultRoomName, loadDisplayName, saveDisplayName } from '../lib/displayName'

const inputClass =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400'
const buttonClass =
  'rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-40'

export function HomePage() {
  return (
    <main className="mx-auto flex min-h-full max-w-3xl flex-col justify-center gap-8 px-4 py-10">
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">peopleRank</h1>
        <p className="mt-2 text-slate-600">Clasificad a la gente del curso por popularidad, cada uno en su tablero.</p>
        {backend.kind === 'memory' && (
          <p className="mt-2 text-xs text-amber-700">
            Modo demo sin conexión: los datos solo se guardan en este navegador.
          </p>
        )}
      </header>
      <div className="grid gap-6 md:grid-cols-2">
        <CreateRoomCard />
        <JoinRoomCard />
      </div>
    </main>
  )
}

function CreateRoomCard() {
  const navigate = useNavigate()
  const [roomName, setRoomName] = useState('')
  const [displayName, setDisplayName] = useState(loadDisplayName)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      saveDisplayName(displayName)
      const slug = await backend.createRoom(roomName.trim() || defaultRoomName(new Date()), displayName.trim())
      navigate(`/r/${slug}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">Crear sala</h2>
      <input
        maxLength={100}
        value={roomName}
        onChange={(event) => setRoomName(event.target.value)}
        placeholder={`Nombre de la sala (opcional): ${defaultRoomName(new Date())}`}
        aria-label="Nombre de la sala (opcional)"
        className={inputClass}
      />
      <p className="-mt-1 text-xs text-slate-500">
        Una sala es una votación. El nombre solo sirve para distinguirla si creáis varias.
      </p>
      <input
        required
        maxLength={60}
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
        placeholder="Tu nombre"
        aria-label="Tu nombre"
        className={inputClass}
      />
      <button type="submit" disabled={busy || !displayName.trim()} className={buttonClass}>
        {busy ? 'Creando…' : 'Crear sala'}
      </button>
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </form>
  )
}

function JoinRoomCard() {
  const navigate = useNavigate()
  const [link, setLink] = useState('')
  const slug = parseSlug(link)

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (slug) navigate(`/r/${slug}`)
      }}
      className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h2 className="text-lg font-semibold">Unirse a una sala</h2>
      <input
        value={link}
        onChange={(event) => setLink(event.target.value)}
        placeholder="Pega el enlace o el código"
        aria-label="Enlace o código de la sala"
        className={inputClass}
      />
      <button type="submit" disabled={!slug} className={buttonClass}>
        Entrar
      </button>
      {link.trim() !== '' && !slug && <p className="text-sm text-slate-500">Eso no parece un enlace de sala.</p>}
    </form>
  )
}
