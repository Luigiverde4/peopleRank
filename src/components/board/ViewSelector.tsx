import { useRoomStore } from '../../store/roomStore'
import { useUiStore } from '../../store/uiStore'

const segmentClass = (active: boolean) =>
  `px-3 py-1 text-sm font-medium first:rounded-l-md last:rounded-r-md disabled:cursor-not-allowed disabled:opacity-40 ${
    active ? 'bg-slate-800 text-slate-50' : 'bg-surface text-slate-600 hover:bg-slate-50'
  }`

/**
 * One segmented control with the board views.
 * 'vs': "Mi tablero", "Consenso" and "Tablero de X" (these two once revealed) and "Grafo".
 * 'general': "Tablero común" and "Grafo".
 */
export function ViewSelector() {
  const view = useUiStore((s) => s.view)
  const setView = useUiStore((s) => s.setView)
  const revealed = useRoomStore((s) => s.room?.revealed ?? false)
  const mode = useRoomStore((s) => s.room?.mode ?? 'vs')
  const participants = useRoomStore((s) => s.participants)
  const myId = useRoomStore((s) => s.me?.id)
  const others = participants.filter((p) => p.id !== myId)
  const blindHint = revealed ? undefined : 'Disponible al revelar la sala'

  return (
    <div
      role="group"
      aria-label="Vista del tablero"
      className="flex flex-wrap divide-x divide-slate-300 rounded-md ring-1 ring-slate-300"
    >
      {mode === 'general' ? (
        <button
          type="button"
          title="Todos movéis el mismo tablero y veis los cambios al momento"
          className={segmentClass(view.kind !== 'graph')}
          onClick={() => setView({ kind: 'mine' })}
        >
          Tablero común
        </button>
      ) : (
        <>
          <button
            type="button"
            className={segmentClass(view.kind === 'mine')}
            onClick={() => setView({ kind: 'mine' })}
          >
            Mi tablero
          </button>
          <button
            type="button"
            disabled={!revealed}
            title={blindHint}
            className={segmentClass(view.kind === 'consensus')}
            onClick={() => setView({ kind: 'consensus' })}
          >
            Consenso
          </button>
          <select
            aria-label="Ver el tablero de otro participante"
            disabled={!revealed}
            title={blindHint}
            value={view.kind === 'participant' ? view.participantId : ''}
            onChange={(event) =>
              setView(
                event.target.value ? { kind: 'participant', participantId: event.target.value } : { kind: 'mine' },
              )
            }
            className={`${segmentClass(view.kind === 'participant')} pr-2`}
          >
            <option value="">Tablero de…</option>
            {others.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participant.displayName}
              </option>
            ))}
          </select>
        </>
      )}
      <button type="button" className={segmentClass(view.kind === 'graph')} onClick={() => setView({ kind: 'graph' })}>
        Grafo
      </button>
    </div>
  )
}
