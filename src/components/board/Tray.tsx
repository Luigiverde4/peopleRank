import type { Person } from '../../data/types'
import { Token } from '../Token'
import type { TokenLook } from '../useTokenStyles'
import type { TokenDragHandlers } from './useTokenDrag'

interface TrayProps {
  people: Person[]
  lookOf(person: Person): TokenLook
  draggingId: string | null
  handlersFor(personId: string): TokenDragHandlers
}

/** People not placed yet on my board. Dragging a placed token out of the board brings it back here. */
export function Tray({ people, lookOf, draggingId, handlersFor }: TrayProps) {
  return (
    <section className="flex w-full flex-col rounded-lg border border-slate-200 bg-surface xl:max-h-full xl:min-w-0 xl:flex-1">
      <h2 className="border-b border-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
        Sin colocar <span className="font-normal text-slate-400">({people.length})</span>
      </h2>
      {people.length === 0 ? (
        <p className="px-3 py-4 text-sm text-slate-400">Todo el mundo está colocado.</p>
      ) : (
        <ul className="flex max-h-60 flex-wrap gap-x-1 gap-y-2 overflow-y-auto p-2 xl:max-h-none">
          {people.map((person) => {
            const look = lookOf(person)
            return (
              <li key={person.id} className="w-[4.25rem]">
                <Token
                  name={person.name}
                  {...look}
                  size={34}
                  draggable
                  className={draggingId === person.id ? 'opacity-30' : ''}
                  {...handlersFor(person.id)}
                />
                <p
                  className={`mt-0.5 truncate text-center text-[11px] leading-tight ${
                    look.dimmed ? 'text-slate-300' : 'text-slate-600'
                  }`}
                >
                  {person.name}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
