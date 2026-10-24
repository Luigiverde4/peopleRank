import { useState } from 'react'
import { useT } from '../../i18n'
import { buildRoomReport } from '../../store/reportExport'
import { useRoomStore } from '../../store/roomStore'
import { currentSessionFile } from '../../store/sessionTransfer'
import { useUiStore } from '../../store/uiStore'
import { downloadFile, downloadVisibleBoard } from './exportBoard'

const itemClass = 'block w-full rounded px-3 py-1.5 text-left text-sm hover:bg-slate-100'

/** Export the visible board (PNG), the whole session (JSON, to continue it later) or a standalone report (HTML). */
export function ExportMenu() {
  const t = useT()
  const slug = useRoomStore((s) => s.room?.slug ?? 'room')
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
    downloadFile(`peopleRank-${slug}-${t.export.sessionFile}.json`, JSON.stringify(currentSessionFile(), null, 2), 'application/json')

  const exportReport = async () => downloadFile(`peopleRank-${slug}-${t.export.reportFile}.html`, await buildRoomReport(), 'text/html')

  return (
    <details className="relative" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary
        className={`cursor-pointer list-none rounded-md border border-slate-300 bg-surface px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 ${
          busy ? 'pointer-events-none opacity-50' : ''
        }`}
      >
        {busy ? t.export.exporting : t.export.menu}
      </summary>
      {open && (
        <div className="absolute right-0 z-50 mt-1 w-64 rounded-md border border-slate-200 bg-surface p-1 shadow-lg">
          <button type="button" className={itemClass} onClick={() => void run(exportPng)}>
            {t.export.png}
            <span className="block text-xs text-slate-500">{t.export.pngHint}</span>
          </button>
          <button type="button" className={itemClass} onClick={() => void run(exportSession)}>
            {t.export.session}
            <span className="block text-xs text-slate-500">{t.export.sessionHint}</span>
          </button>
          <button type="button" className={itemClass} onClick={() => void run(exportReport)}>
            {t.export.report}
            <span className="block text-xs text-slate-500">{t.export.reportHint}</span>
          </button>
        </div>
      )}
    </details>
  )
}
