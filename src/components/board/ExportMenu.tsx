import { useState } from 'react'
import { useRoomStore } from '../../store/roomStore'
import { buildRoomReport } from '../../store/reportExport'
import { currentSessionFile } from '../../store/sessionTransfer'
import { useUiStore } from '../../store/uiStore'
import { downloadFile, downloadVisibleBoard } from './exportBoard'

const itemClass = 'block w-full rounded px-3 py-1.5 text-left text-sm hover:bg-slate-100'

/** Export the visible board (PNG), the whole session (JSON, to continue it later) or a standalone report (HTML). */
export function ExportMenu() {
  const slug = useRoomStore((s) => s.room?.slug ?? 'sala')
  const view = useUiStore((s) => s.view)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const run = async (action: () => Promise<void> | void) => {
    setOpen(false)
    setBusy(true)
    try {
      await action()
    } finally {
      setBusy(false)
    }
  }

  const exportPng = () => downloadVisibleBoard(`peopleRank-${slug}-${view.kind}.png`)
  const exportSession = () =>
    downloadFile(`peopleRank-${slug}-sesion.json`, JSON.stringify(currentSessionFile(), null, 2), 'application/json')

  const exportReport = async () => downloadFile(`peopleRank-${slug}-informe.html`, await buildRoomReport(), 'text/html')

  return (
    <details className="relative" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary
        className={`cursor-pointer list-none rounded-md border border-slate-300 bg-surface px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 ${
          busy ? 'pointer-events-none opacity-50' : ''
        }`}
      >
        {busy ? 'Exportando…' : 'Exportar ▾'}
      </summary>
      {open && (
        <div className="absolute right-0 z-50 mt-1 w-64 rounded-md border border-slate-200 bg-surface p-1 shadow-lg">
          <button type="button" className={itemClass} onClick={() => void run(exportPng)}>
            Imagen del tablero (PNG)
            <span className="block text-xs text-slate-500">Lo que se ve ahora, con el zoom aplicado.</span>
          </button>
          <button type="button" className={itemClass} onClick={() => void run(exportSession)}>
            Sesión (JSON)
            <span className="block text-xs text-slate-500">Para importarla y continuar en otra sala.</span>
          </button>
          <button type="button" className={itemClass} onClick={() => void run(exportReport)}>
            Informe (HTML)
            <span className="block text-xs text-slate-500">
              Tableros y estadísticas en un fichero para ver sin la app.
            </span>
          </button>
        </div>
      )}
    </details>
  )
}
