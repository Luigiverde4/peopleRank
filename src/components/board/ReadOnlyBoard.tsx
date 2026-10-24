import { useRef, type ReactNode } from 'react'
import type { Person } from '../../data/types'
import { boardToPercent, type BoardPoint } from '../../lib/geometry'
import { Token } from '../Token'
import { useTokenStyles } from '../useTokenStyles'
import { Board } from './Board'
import { useBoardViewport } from './useBoardViewport'

export interface BoardItem {
  person: Person
  point: BoardPoint
  /** Radius of a translucent halo, in board units (e.g. the dispersion). */
  haloRadius?: number
  badge?: ReactNode
  /** Position still being dragged by its owner (not saved yet). */
  provisional?: boolean
}

const TOKEN_SIZE = 34

/** Non-editable board used by the consensus view and other participants' boards. */
export function ReadOnlyBoard({ items, emptyMessage }: { items: BoardItem[]; emptyMessage: string }) {
  const boardRef = useRef<HTMLDivElement>(null)
  const { lookOf, showNames } = useTokenStyles()
  const viewport = useBoardViewport(boardRef)

  return (
    <div className="board-area flex w-full justify-center">
      <div className="board-fit">
        <Board boardRef={boardRef} viewport={viewport}>
          {items.length === 0 && (
            <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-slate-400">
              {emptyMessage}
            </p>
          )}
          {/* Halos are clipped to the board; tokens are not, so edge tokens stay whole. */}
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg">
            {items.map((item) =>
              item.haloRadius !== undefined && item.haloRadius > 0 ? (
                <div
                  key={item.person.id}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-400/15 ring-1 ring-sky-400/30 ${
                    lookOf(item.person).dimmed ? 'opacity-25' : ''
                  }`}
                  style={{
                    ...boardToPercent(item.point),
                    width: `${item.haloRadius * 200}%`,
                    height: `${item.haloRadius * 200}%`,
                  }}
                />
              ) : null,
            )}
          </div>
          {items.map((item) => {
            const look = lookOf(item.person)
            return (
              <Token
                key={item.person.id}
                name={item.person.name}
                {...look}
                size={TOKEN_SIZE}
                showLabel={showNames}
                badge={item.badge}
                position="absolute"
                className={`-translate-x-1/2 -translate-y-1/2 ${look.highlighted ? 'z-20' : 'z-10 hover:z-30'} ${
                  item.provisional ? 'opacity-70 transition-[left,top] duration-75' : ''
                }`}
                style={boardToPercent(item.point)}
              />
            )
          })}
        </Board>
      </div>
    </div>
  )
}
