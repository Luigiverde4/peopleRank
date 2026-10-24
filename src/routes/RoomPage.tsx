import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { RoomScreen } from '../components/RoomScreen'
import { backend, type RoomMembership } from '../data'
import { loadDisplayName, saveDisplayName } from '../lib/displayName'
import { useRoomStore } from '../store/roomStore'
import { useUiStore } from '../store/uiStore'

type Entry =
  | { state: 'checking' }
  | { state: 'needs-name' }
  | { state: 'inside' }
  | { state: 'error'; message: string }

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** `/r/:slug`: opens the room if I'm already a participant, otherwise asks for a name and joins. */
export function RoomPage() {
  const { slug = '' } = useParams()
  const [entry, setEntry] = useState<Entry>({ state: 'checking' })

  useEffect(() => {
    let cancelled = false
    const enter = async () => {
      try {
        const membership = await backend.findMembership(slug)
        if (cancelled) return
        if (membership) await openRoom(membership)
        if (!cancelled) setEntry(membership ? { state: 'inside' } : { state: 'needs-name' })
      } catch (error) {
        if (!cancelled) setEntry({ state: 'error', message: errorMessage(error) })
      }
    }
    void enter()
    return () => {
      cancelled = true
      useRoomStore.getState().close()
      useUiStore.getState().reset()
    }
  }, [slug])

  const join = async (displayName: string) => {
    try {
      saveDisplayName(displayName)
      await openRoom(await backend.joinRoom(slug, displayName))
      setEntry({ state: 'inside' })
    } catch (error) {
      setEntry({ state: 'error', message: errorMessage(error) })
    }
  }

  switch (entry.state) {
    case 'checking':
      return <p className="p-6 text-slate-500">Entrando en la sala…</p>
    case 'needs-name':
      return <JoinForm onJoin={join} />
    case 'error':
      return (
        <main className="mx-auto max-w-md p-6">
          <p className="text-rose-600">
            {entry.message === 'Room not found' ? 'No existe ninguna sala con ese enlace.' : entry.message}
          </p>
          <Link to="/" className="mt-4 inline-block text-sky-700 underline">
            Volver al inicio
          </Link>
        </main>
      )
    case 'inside':
      return <RoomScreen />
  }
}

function openRoom({ room, me }: RoomMembership): Promise<void> {
  return useRoomStore.getState().open(room, me)
}

function JoinForm({ onJoin }: { onJoin(displayName: string): Promise<void> }) {
  const [displayName, setDisplayName] = useState(loadDisplayName)
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    await onJoin(displayName.trim())
  }

  return (
    <main className="mx-auto flex min-h-full max-w-sm flex-col justify-center px-4">
      <form onSubmit={submit} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-surface p-5 shadow-sm">
        <h1 className="text-lg font-semibold">Unirse a la sala</h1>
        <p className="text-sm text-slate-600">¿Cómo te llamas? Los demás verán este nombre.</p>
        <input
          autoFocus
          required
          maxLength={60}
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Tu nombre"
          aria-label="Tu nombre"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400"
        />
        <button
          type="submit"
          disabled={busy || !displayName.trim()}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-40"
        >
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
