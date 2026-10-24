import type { ReactNode, RefObject } from 'react'
import { useT } from '../../i18n'
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
  const t = useT()
  const zoomed = viewport.view.scale > 1

  return (
    <div data-board-export className="flex w-full flex-col items-center bg-surface">
      <div className="flex w-full items-stretch gap-1">
        <div className="flex w-5 shrink-0 flex-col items-center justify-between py-1 text-[11px] text-slate-500">
          <span>{t.board.high}</span>
          <span className="whitespace-nowrap [writing-mode:vertical-rl] rotate-180 font-medium text-slate-600">
            {t.board.courseAxis}
          </span>
          <span>{t.board.low}</span>
        </div>
        <div
          ref={boardRef}
          className={`relative aspect-square w-full touch-none rounded-lg border bg-surface shadow-inner transition-colors ${
            active ? 'border-sky-400' : 'border-slate-300'
          } ${zoomed ? 'cursor-grab overflow-hidden active:cursor-grabbing' : ''}`}
          {...viewport.backgroundHandlers}
        >
          <div className="absolute" style={{ ...worldBox(viewport.view), ...gridBackground }}>
            {children}
          </div>
        </div>
      </div>
      <div className="ml-6 flex w-[calc(100%-1.5rem)] justify-between px-1 pt-1 text-[11px] text-slate-500">
        <span>{t.board.periphery}</span>
        <span className="font-medium text-slate-600">{t.board.groupAxis}</span>
        <span>{t.board.center}</span>
      </div>
    </div>
  )
}
