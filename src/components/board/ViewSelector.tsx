import { useRoomStore } from '../../store/roomStore'
import { useUiStore } from '../../store/uiStore'

const tabClass = (active: boolean) =>
  `rounded-md px-3 py-1 text-sm font-medium ${
    active ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50'
  }`

/** "Mi tablero" (editable), "Consenso" and "Tablero de X" (only once revealed). */
export function ViewSelector() {
  const view = useUiStore((s) => s.view)
  const setView = useUiStore((s) => s.setView)
  const revealed = useRoomStore((s) => s.room?.revealed ?? false)
  const participants = useRoomStore((s) => s.participants)
  const myId = useRoomStore((s) => s.me?.id)
  const others = participants.filter((p) => p.id !== myId)

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Vista del tablero">
      <button type="button" className={tabClass(view.kind === 'mine')} onClick={() => setView({ kind: 'mine' })}>
        Mi tablero
      </button>
      {revealed ? (
        <select
          aria-label="Ver el tablero de otro participante"
          value={view.kind === 'participant' ? view.participantId : ''}
          onChange={(event) =>
            setView(event.target.value ? { kind: 'participant', participantId: event.target.value } : { kind: 'mine' })
          }
          className={`${tabClass(view.kind === 'participant')} pr-2`}
        >
          <option value="">Tablero de…</option>
          {others.map((participant) => (
            <option key={participant.id} value={participant.id}>
              {participant.displayName}
            </option>
          ))}
        </select>
      ) : (
        <span className="text-xs text-slate-400">Los tableros de los demás se verán al revelar.</span>
      )}
    </div>
  )
}

