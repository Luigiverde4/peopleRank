import { useRef, type ReactNode } from 'react'
import type { Person } from '../../data/types'
import { boardToPercent, type BoardPoint } from '../../lib/geometry'
import { Token } from '../Token'
import { useTokenStyles } from '../useTokenStyles'
import { Board } from './Board'

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

  return (
    <div className="min-w-0 flex-1" style={{ maxWidth: 'min(100%, calc(100dvh - 10rem))' }}>
      <Board boardRef={boardRef}>
        {items.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-slate-400">
            {emptyMessage}
          </p>
        )}
        {items.map((item) => {
          const look = lookOf(item.person)
          return (
            <div key={item.person.id}>
              {item.haloRadius !== undefined && item.haloRadius > 0 && (
                <div
                  aria-hidden
                  className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-400/15 ring-1 ring-sky-400/30 ${
                    look.dimmed ? 'opacity-25' : ''
                  }`}
                  style={{
                    ...boardToPercent(item.point),
                    width: `${item.haloRadius * 200}%`,
                    height: `${item.haloRadius * 200}%`,
                  }}
                />
              )}
              <Token
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
            </div>
          )
        })}
      </Board>
    </div>
  )
}
