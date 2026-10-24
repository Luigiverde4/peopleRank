import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { RoomScreen } from '../components/RoomScreen'
import { backend, type RoomMembership } from '../data'
import { describeError, useT } from '../i18n'
import { loadDisplayName, saveDisplayName } from '../lib/displayName'
import { useRoomStore } from '../store/roomStore'
import { useUiStore } from '../store/uiStore'

type Entry =
  | { state: 'checking' }
  | { state: 'needs-name' }
  | { state: 'inside' }
  | { state: 'error'; error: unknown }

/** `/r/:slug`: opens the room if I'm already a participant, otherwise asks for a name and joins. */
export function RoomPage() {
  const t = useT()
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
        if (!cancelled) setEntry({ state: 'error', error })
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
      setEntry({ state: 'error', error })
    }
  }

  switch (entry.state) {
    case 'checking':
      return <p className="p-6 text-slate-500">{t.join.entering}</p>
    case 'needs-name':
      return <JoinForm onJoin={join} />
    case 'error':
      return (
        <main className="mx-auto max-w-md p-6">
          <p className="text-rose-600">{describeError(entry.error, t)}</p>
          <Link to="/" className="mt-4 inline-block text-sky-700 underline">
            {t.join.backHome}
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
  const t = useT()
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
        <h1 className="text-lg font-semibold">{t.join.title}</h1>
        <p className="text-sm text-slate-600">{t.join.question}</p>
        <input
          autoFocus
          required
          maxLength={60}
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder={t.common.yourName}
          aria-label={t.common.yourName}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400"
        />
        <button
          type="submit"
          disabled={busy || !displayName.trim()}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-40"
        >
          {busy ? t.common.entering : t.common.enter}
        </button>
      </form>
    </main>
  )
}
