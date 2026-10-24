import type { ReactNode, RefObject } from 'react'
import { worldBox } from '../../lib/viewport'
import type { BoardViewport } from './useBoardViewport'

const GRID_STEP_PERCENT = 10

const gridBackground = {
  backgroundImage: [
    'linear-gradient(to right, rgb(148 163 184 / 0.18) 1px, transparent 1px)',
    'linear-gradient(to bottom, rgb(148 163 184 / 0.18) 1px, transparent 1px)',
    // Stronger center lines.
    'linear-gradient(to right, transparent calc(50% - 1px), rgb(100 116 139 / 0.35) calc(50% - 1px), rgb(100 116 139 / 0.35) calc(50% + 1px), transparent calc(50% + 1px))',
    'linear-gradient(to bottom, transparent calc(50% - 1px), rgb(100 116 139 / 0.35) calc(50% - 1px), rgb(100 116 139 / 0.35) calc(50% + 1px), transparent calc(50% + 1px))',
  ].join(', '),
  backgroundSize: `${GRID_STEP_PERCENT}% ${GRID_STEP_PERCENT}%, ${GRID_STEP_PERCENT}% ${GRID_STEP_PERCENT}%, 100% 100%, 100% 100%`,
}

interface BoardProps {
  boardRef: RefObject<HTMLDivElement | null>
  viewport: BoardViewport
  children: ReactNode
  /** Highlights the board while a token is dragged over it. */
  active?: boolean
}

/**
 * Square board with labelled axes. Children are positioned in percentages of the whole board inside
 * a "world" layer that grows with the zoom, so tokens keep their size while the space between them
 * grows. The visible square clips the world only while zoomed in.
 */
export function Board({ boardRef, viewport, children, active = false }: BoardProps) {
  const zoomed = viewport.view.scale > 1

  return (
    <div data-board-export className="flex w-full flex-col items-center bg-white">
      <div className="flex w-full items-stretch gap-1">
        <div className="flex w-5 shrink-0 flex-col items-center justify-between py-1 text-[11px] text-slate-500">
          <span>Alta</span>
          <span className="whitespace-nowrap [writing-mode:vertical-rl] rotate-180 font-medium text-slate-600">
            Popularidad en el curso →
          </span>
          <span>Baja</span>
        </div>
        <div
          ref={boardRef}
          className={`relative aspect-square w-full touch-none rounded-lg border bg-white shadow-inner transition-colors ${
            active ? 'border-sky-400' : 'border-slate-300'
          } ${zoomed ? 'cursor-grab overflow-hidden active:cursor-grabbing' : ''}`}
          {...viewport.backgroundHandlers}
        >
          <div className="absolute" style={{ ...worldBox(viewport.view), ...gridBackground }}>
            {children}
          </div>
          <ZoomControls viewport={viewport} />
        </div>
      </div>
      <div className="ml-6 flex w-[calc(100%-1.5rem)] justify-between px-1 pt-1 text-[11px] text-slate-500">
        <span>Periferia</span>
        <span className="font-medium text-slate-600">Popularidad en su grupo →</span>
        <span>Centro</span>
      </div>
    </div>
  )
}

const controlClass =
  'flex h-7 min-w-7 items-center justify-center rounded px-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-30'

function ZoomControls({ viewport }: { viewport: BoardViewport }) {
  const { scale } = viewport.view

  return (
    <div
      data-export-ignore
      className="absolute right-2 top-2 z-40 flex items-center gap-0.5 rounded-md border border-slate-200 bg-white/90 p-0.5 shadow-sm"
      // Clicks on the controls must not start a pan of the board underneath.
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        aria-label="Alejar"
        title="Alejar"
        className={controlClass}
        onClick={viewport.zoomOut}
        disabled={scale <= 1}
      >
        −
      </button>
      <span className="w-10 text-center text-xs tabular-nums text-slate-500">{Math.round(scale * 100)}%</span>
      <button
        type="button"
        aria-label="Acercar"
        title="Acercar (o rueda del ratón)"
        className={controlClass}
        onClick={viewport.zoomIn}
      >
        +
      </button>
      {scale > 1 && (
        <button type="button" title="Ver el tablero entero" className={controlClass} onClick={viewport.reset}>
          Ajustar
        </button>
      )}
    </div>
  )
}
