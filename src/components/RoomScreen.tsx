import { dismissError, useRoomStore } from '../store/roomStore'
import { effectiveView, useUiStore } from '../store/uiStore'
import { BoardToolbar } from './board/BoardToolbar'
import { ConsensusBoard } from './board/ConsensusBoard'
import { MyBoard } from './board/MyBoard'
import { ParticipantBoard } from './board/ParticipantBoard'
import { ViewSelector } from './board/ViewSelector'
import { RoomHeader } from './RoomHeader'
import { SidePanel } from './side/SidePanel'
import { StatsPanel } from './stats/StatsPanel'

/** Layout of an open room: header, side panel and the board of the selected view. */
export function RoomScreen() {
  const status = useRoomStore((s) => s.status)
  const error = useRoomStore((s) => s.error)

  if (status === 'loading' || status === 'idle') {
    return <p className="p-6 text-slate-500">Cargando sala…</p>
  }

  return (
    <div className="flex min-h-full flex-col lg:h-full">
      <RoomHeader />
      {error && (
        <div role="alert" className="flex items-center gap-2 bg-rose-50 px-4 py-1.5 text-sm text-rose-700">
          {error}
          <button type="button" className="ml-auto text-xs underline" onClick={dismissError}>
            Cerrar
          </button>
        </div>
      )}
      <main className="flex min-h-0 flex-1 flex-col gap-3 p-3 lg:flex-row">
        <div className="flex flex-col lg:w-80 lg:shrink-0">
          <SidePanel />
        </div>
        <section className="flex min-w-0 flex-1 flex-col gap-3 lg:overflow-y-auto">
          <ViewSelector />
          <BoardToolbar />
          <SelectedBoard />
        </section>
        <StatsPanel />
      </main>
    </div>
  )
}

function SelectedBoard() {
  const chosen = useUiStore((s) => s.view)
  const revealed = useRoomStore((s) => s.room?.revealed ?? false)
  const participantIds = useRoomStore((s) => s.participants.map((p) => p.id).join(','))
  const view = effectiveView(chosen, revealed, participantIds.split(','))

  switch (view.kind) {
    case 'participant':
      return <ParticipantBoard participantId={view.participantId} />
    case 'consensus':
      return <ConsensusBoard />
    case 'mine':
      return <MyBoard />
  }
}
