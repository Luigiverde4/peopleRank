import { useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { Person } from '../../data/types'
import { boardToPercent, type BoardPoint } from '../../lib/geometry'
import { placementsOf } from '../../lib/rooms'
import { useRoomStore } from '../../store/roomStore'
import { Token } from '../Token'
import { useTokenStyles, type TokenLook } from '../useTokenStyles'
import { Board } from './Board'
import { Tray } from './Tray'
import { useTokenDrag, type TokenDragHandlers } from './useTokenDrag'

const BOARD_TOKEN_SIZE = 34

/** "Mi tablero": the editable board plus the tray of people not placed yet. */
export function MyBoard() {
  const boardRef = useRef<HTMLDivElement>(null)
  const people = useRoomStore((s) => s.people)
  const placements = useRoomStore((s) => s.placements)
  const meId = useRoomStore((s) => s.me?.id ?? '')
  const placePerson = useRoomStore((s) => s.placePerson)
  const unplacePerson = useRoomStore((s) => s.unplacePerson)
  const dragPerson = useRoomStore((s) => s.dragPerson)
  const { lookOf, showNames } = useTokenStyles()

  const mine = useMemo(() => placementsOf(placements, meId), [placements, meId])
  const unplaced = useMemo(() => people.filter((p) => !mine.has(p.id)), [people, mine])

  const { drag, isMoving, handlersFor } = useTokenDrag(boardRef, {
    onMove: dragPerson,
    onDrop(personId, point) {
      if (point) void placePerson(personId, point)
      else if (mine.has(personId)) void unplacePerson(personId)
    },
  })

  const draggedPerson = drag ? people.find((p) => p.id === drag.personId) : undefined

  return (
    <div className="flex w-full flex-col gap-3 xl:flex-row xl:items-start">
      <div className="min-w-0 flex-1" style={{ maxWidth: 'min(100%, calc(100dvh - 10rem))' }}>
        <Board boardRef={boardRef} active={isMoving}>
          {people.map((person) => {
            const placement = mine.get(person.id)
            if (!placement) return null
            return (
              <PlacedToken
                key={person.id}
                person={person}
                point={placement}
                size={BOARD_TOKEN_SIZE}
                ghost={isMoving && drag?.personId === person.id}
                showLabel={showNames}
                look={lookOf(person)}
                handlers={handlersFor(person.id)}
              />
            )
          })}
        </Board>
      </div>
      <Tray
        people={unplaced}
        lookOf={lookOf}
        draggingId={isMoving ? (drag?.personId ?? null) : null}
        handlersFor={handlersFor}
      />
      {isMoving &&
        drag &&
        draggedPerson &&
        createPortal(
          <Token
            name={draggedPerson.name}
            {...lookOf(draggedPerson)}
            dimmed={false}
            size={BOARD_TOKEN_SIZE}
            showLabel
            position="fixed"
            className="pointer-events-none z-50 -translate-x-1/2 -translate-y-1/2 scale-110"
            style={{ left: drag.clientX, top: drag.clientY }}
          />,
          document.body,
        )}
    </div>
  )
}

interface PlacedTokenProps {
  person: Person
  point: BoardPoint
  size: number
  ghost: boolean
  showLabel: boolean
  look: TokenLook
  handlers?: TokenDragHandlers
}

function PlacedToken({ person, point, size, ghost, showLabel, look, handlers }: PlacedTokenProps) {
  return (
    <Token
      name={person.name}
      {...look}
      size={size}
      showLabel={showLabel}
      draggable={handlers !== undefined}
      position="absolute"
      className={`-translate-x-1/2 -translate-y-1/2 ${ghost ? 'opacity-30' : ''} ${
        look.highlighted ? 'z-20' : 'z-10 hover:z-30'
      }`}
      style={boardToPercent(point)}
      {...handlers}
    />
  )
}
