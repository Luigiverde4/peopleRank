import { useState } from 'react'
import { Link } from 'react-router'
import { backend } from '../data'
import { useT } from '../i18n'
import { useRoomStore } from '../store/roomStore'
import { ConfirmButton } from './ui/ConfirmButton'
import { LanguageToggle } from './ui/LanguageToggle'
import { ThemeToggle } from './ui/ThemeToggle'

export function RoomHeader() {
  const t = useT()
  const room = useRoomStore((s) => s.room)
  const me = useRoomStore((s) => s.me)

  if (!room || !me) return null

  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-200 bg-surface px-4 py-2">
      <Link to="/" className="text-sm font-bold text-sky-700">
        peopleRank
      </Link>
      <h1 className="text-lg font-semibold">{room.name}</h1>
      <CopyLinkButton />
      {backend.kind === 'memory' && (
        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">{t.header.offlineDemo}</span>
      )}
      <OnlineList />
      <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-2">
        <LanguageToggle />
        <ThemeToggle />
        {room.mode === 'general' ? (
          <span
            className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800"
            title={t.header.generalModeHint}
          >
            {t.header.generalMode}
          </span>
        ) : (
          <>
            <span className="rounded bg-violet-50 px-2 py-0.5 text-xs text-violet-700" title={t.header.vsModeHint}>
              {t.header.vsMode}
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
  const t = useT()
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
      {copied ? t.header.copied : t.header.copyLink}
    </button>
  )
}

function OnlineList() {
  const t = useT()
  const online = useRoomStore((s) => s.online)
  const myId = useRoomStore((s) => s.me?.id)

  return (
    <ul className="flex flex-wrap items-center gap-1" aria-label={t.header.online}>
      {online.map((entry) => (
        <li
          key={entry.participantId}
          className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {entry.displayName}
          {entry.participantId === myId && t.header.you}
        </li>
      ))}
    </ul>
  )
}

function RevealStatus() {
  const t = useT()
  const room = useRoomStore((s) => s.room)
  const me = useRoomStore((s) => s.me)
  const reveal = useRoomStore((s) => s.reveal)
  if (!room || !me) return null

  if (room.revealed) {
    return <span className="rounded bg-violet-100 px-2 py-0.5 text-xs text-violet-800">{t.header.revealed}</span>
  }

  const isCreator = room.createdBy === me.userId
  return (
    <div className="flex items-center gap-2">
      <span
        className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
        title={t.header.blindHint}
      >
        {t.header.blind}
      </span>
      {isCreator && (
        <ConfirmButton
          onConfirm={() => void reveal()}
          confirmLabel={t.header.revealConfirm}
          variant="primary"
          title={t.header.revealHint}
        >
          {t.header.reveal}
        </ConfirmButton>
      )}
    </div>
  )
}

function WhoAmISelect() {
  const t = useT()
  const me = useRoomStore((s) => s.me)
  const people = useRoomStore((s) => s.people)
  const setMyPerson = useRoomStore((s) => s.setMyPerson)
  if (!me) return null

  return (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      {t.header.whoAmI}
      <select
        value={me.personId ?? ''}
        onChange={(event) => void setMyPerson(event.target.value || null)}
        className="max-w-44 rounded-md border border-slate-300 bg-surface px-1 py-0.5 text-sm"
      >
        <option value="">{t.header.nobody}</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.name}
          </option>
        ))}
      </select>
    </label>
  )
}
