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

interface MovingToken {
  point: BoardPoint
  /** Who is dragging it right now. */
  name: string
}

/**
 * Positions of the board I can edit: my own board in 'vs' rooms, the shared board in 'general'
 * rooms. On the shared board, tokens other people are dragging right now are reported apart.
 */
function useEditableBoard() {
  const mode = useRoomStore((s) => s.room?.mode ?? 'vs')
  const placements = useRoomStore((s) => s.placements)
  const sharedPlacements = useRoomStore((s) => s.sharedPlacements)
  const liveDrags = useRoomStore((s) => s.liveDrags)
  const participants = useRoomStore((s) => s.participants)
  const meId = useRoomStore((s) => s.me?.id ?? '')

  const positions = useMemo<Map<string, BoardPoint>>(
    () => (mode === 'general' ? new Map(sharedPlacements.map((p) => [p.personId, p])) : placementsOf(placements, meId)),
    [mode, sharedPlacements, placements, meId],
  )

  const movingByOthers = useMemo(() => {
    const moving = new Map<string, MovingToken>()
    if (mode !== 'general') return moving
    const nameOf = new Map(participants.map((p) => [p.id, p.displayName]))
    for (const drag of Object.values(liveDrags)) {
      moving.set(drag.personId, { point: drag, name: nameOf.get(drag.participantId) ?? '…' })
    }
    return moving
  }, [mode, liveDrags, participants])

  return { positions, movingByOthers }
}

/** The editable board ("Mi tablero" or "Tablero común") plus the tray of people not placed yet. */
export function MyBoard() {
  const boardRef = useRef<HTMLDivElement>(null)
  const people = useRoomStore((s) => s.people)
  const placePerson = useRoomStore((s) => s.placePerson)
  const unplacePerson = useRoomStore((s) => s.unplacePerson)
  const dragPerson = useRoomStore((s) => s.dragPerson)
  const { lookOf, showNames } = useTokenStyles()
  const { positions, movingByOthers } = useEditableBoard()

  const unplaced = useMemo(
    () => people.filter((p) => !positions.has(p.id) && !movingByOthers.has(p.id)),
    [people, positions, movingByOthers],
  )

  const { drag, isMoving, handlersFor } = useTokenDrag(boardRef, {
    onMove: dragPerson,
    onDrop(personId, point) {
      if (point) void placePerson(personId, point)
      else if (positions.has(personId)) void unplacePerson(personId)
    },
  })

  const draggedPerson = drag ? people.find((p) => p.id === drag.personId) : undefined

  return (
    <div className="board-area flex w-full flex-col gap-3 xl:flex-row xl:items-start">
      <div className="board-fit board-fit-with-tray shrink-0">
        <Board boardRef={boardRef} active={isMoving}>
          {people.map((person) => {
            const moving = movingByOthers.get(person.id)
            const point = moving?.point ?? positions.get(person.id)
            if (!point) return null
            return (
              <PlacedToken
                key={person.id}
                person={person}
                point={point}
                movedBy={moving?.name}
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
  /** Name of whoever is dragging it on the shared board right now. */
  movedBy?: string
  handlers?: TokenDragHandlers
}

function PlacedToken({ person, point, size, ghost, showLabel, look, movedBy, handlers }: PlacedTokenProps) {
  return (
    <Token
      name={person.name}
      {...look}
      size={size}
      showLabel={showLabel}
      badge={movedBy}
      draggable={handlers !== undefined}
      position="absolute"
      className={`-translate-x-1/2 -translate-y-1/2 ${ghost ? 'opacity-30' : ''} ${
        look.highlighted || movedBy ? 'z-20' : 'z-10 hover:z-30'
      } ${movedBy ? 'opacity-80 transition-[left,top] duration-75' : ''}`}
      style={boardToPercent(point)}
      {...handlers}
    />
  )
}
