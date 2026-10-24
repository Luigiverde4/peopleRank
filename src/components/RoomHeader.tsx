import { useState } from 'react'
import { Link } from 'react-router'
import { backend } from '../data'
import { useRoomStore } from '../store/roomStore'
import { ConfirmButton } from './ui/ConfirmButton'

export function RoomHeader() {
  const room = useRoomStore((s) => s.room)
  const me = useRoomStore((s) => s.me)

  if (!room || !me) return null

  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-200 bg-white px-4 py-2">
      <Link to="/" className="text-sm font-bold text-sky-700">
        peopleRank
      </Link>
      <h1 className="text-lg font-semibold">{room.name}</h1>
      <CopyLinkButton />
      {backend.kind === 'memory' && (
        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Demo sin conexión</span>
      )}
      <OnlineList />
      <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-2">
        {room.mode === 'general' ? (
          <span
            className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800"
            title="Un único tablero que movéis todos"
          >
            Modo General
          </span>
        ) : (
          <>
            <span className="rounded bg-violet-50 px-2 py-0.5 text-xs text-violet-700" title="Cada uno en su tablero">
              Modo VS
            </span>
            <RevealStatus />
            <WhoAmISelect />
          </>
        )}
      </div>
    </header>
  )
}

function CopyLinkButton() {
  const [copied, setCopied] = useState(false)
  const link = window.location.href

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard unavailable (e.g. http on the LAN): the link stays visible in the address bar.
    }
  }

  return (
    <button
      type="button"
      title={link}
      onClick={() => void copy()}
      className="rounded-md border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50"
    >
      {copied ? '¡Copiado!' : 'Copiar enlace'}
    </button>
  )
}

function OnlineList() {
  const online = useRoomStore((s) => s.online)
  const myId = useRoomStore((s) => s.me?.id)

  return (
    <ul className="flex flex-wrap items-center gap-1" aria-label="Conectados">
      {online.map((entry) => (
        <li
          key={entry.participantId}
          className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {entry.displayName}
          {entry.participantId === myId && ' (tú)'}
        </li>
      ))}
    </ul>
  )
}

function RevealStatus() {
  const room = useRoomStore((s) => s.room)
  const me = useRoomStore((s) => s.me)
  const reveal = useRoomStore((s) => s.reveal)
  if (!room || !me) return null

  if (room.revealed) {
    return <span className="rounded bg-violet-100 px-2 py-0.5 text-xs text-violet-800">Revelado: todos ven todo</span>
  }

  const isCreator = room.createdBy === me.userId
  return (
    <div className="flex items-center gap-2">
      <span
        className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
        title="Cada uno solo ve sus propias colocaciones hasta que se revele la sala"
      >
        Modo ciego
      </span>
      {isCreator && (
        <ConfirmButton
          onConfirm={() => void reveal()}
          confirmLabel="¿Revelar a todos?"
          variant="primary"
          title="Todos verán los tableros de todos"
        >
          Revelar
        </ConfirmButton>
      )}
    </div>
  )
}

function WhoAmISelect() {
  const me = useRoomStore((s) => s.me)
  const people = useRoomStore((s) => s.people)
  const setMyPerson = useRoomStore((s) => s.setMyPerson)
  if (!me) return null

  return (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      ¿Quién eres en la lista?
      <select
        value={me.personId ?? ''}
        onChange={(event) => void setMyPerson(event.target.value || null)}
        className="max-w-44 rounded-md border border-slate-300 bg-white px-1 py-0.5 text-sm"
      >
        <option value="">— Nadie —</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.name}
          </option>
        ))}
      </select>
    </label>
  )
}
