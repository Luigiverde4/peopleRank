import type { ReactNode, RefObject } from 'react'

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
  children: ReactNode
  /** Highlights the board while a token is dragged over it. */
  active?: boolean
}

/** Square board with labelled axes. Children are positioned absolutely in percentages. */
export function Board({ boardRef, children, active = false }: BoardProps) {
  return (
    <div className="flex w-full flex-col items-center">
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
          className={`relative aspect-square w-full rounded-lg border bg-white shadow-inner transition-colors ${
            active ? 'border-sky-400' : 'border-slate-300'
          }`}
          style={gridBackground}
        >
          {children}
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
