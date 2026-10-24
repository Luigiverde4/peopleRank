import { useT } from '../../i18n'
import { useUiStore } from '../../store/uiStore'

const controlClass =
  'flex h-7 min-w-7 items-center justify-center rounded px-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-30'

/** Zoom buttons for the boards, in the toolbar so they never cover a corner of the board. */
export function ZoomControls() {
  const t = useT()
  const scale = useUiStore((s) => s.viewport.scale)
  const { zoomIn, zoomOut, resetViewport } = useUiStore.getState()

  return (
    <div
      role="group"
      aria-label={t.zoom.label}
      className="flex items-center gap-0.5 rounded-md border border-slate-300 bg-surface p-0.5"
    >
      <button
        type="button"
        aria-label={t.zoom.out}
        title={t.zoom.out}
        className={controlClass}
        onClick={zoomOut}
        disabled={scale <= 1}
      >
        −
      </button>
      <span
        className="w-11 text-center text-xs tabular-nums text-slate-500"
        title={t.zoom.wheelHint}
      >
        {Math.round(scale * 100)}%
      </span>
      <button
        type="button"
        aria-label={t.zoom.in}
        title={t.zoom.inHint}
        className={controlClass}
        onClick={zoomIn}
      >
        +
      </button>
      <button
        type="button"
        title={t.zoom.fitHint}
        className={controlClass}
        onClick={resetViewport}
        disabled={scale <= 1}
      >
        {t.zoom.fit}
      </button>
    </div>
  )
}
