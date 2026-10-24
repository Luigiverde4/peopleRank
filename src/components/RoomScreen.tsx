import { dismissError, useRoomStore } from '../store/roomStore'
import { MyBoard } from './board/MyBoard'
import { BoardToolbar } from './board/BoardToolbar'
import { RoomHeader } from './RoomHeader'
import { SidePanel } from './side/SidePanel'

/** Layout of an open room: header, side panel, board and tray. */
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
          <BoardToolbar />
          <MyBoard />
        </section>
      </main>
    </div>
  )
}
