import { useRef, useState, type PointerEvent } from 'react'
import type { BoardPoint } from '../../lib/geometry'

/** Pointer movement (px) below which a press counts as a click, not a drag. */
const DRAG_THRESHOLD_PX = 4

export interface DragState {
  personId: string
  pointerId: number
  clientX: number
  clientY: number
  startX: number
  startY: number
}

export interface TokenDragCallbacks {
  /** Called while moving; `point` is null when the pointer is outside the board. */
  onMove(personId: string, point: BoardPoint | null): void
  /** Called on release after a real drag; `point` is null when dropped outside the board. */
  onDrop(personId: string, point: BoardPoint | null): void
}

export interface TokenDragHandlers {
  onPointerDown(event: PointerEvent<HTMLDivElement>): void
  onPointerMove(event: PointerEvent<HTMLDivElement>): void
  onPointerUp(event: PointerEvent<HTMLDivElement>): void
  onPointerCancel(event: PointerEvent<HTMLDivElement>): void
}

/**
 * Custom drag based on Pointer Events and setPointerCapture: the pressed
 * token keeps receiving events wherever the pointer goes (board, tray or
 * outside), so it works the same with mouse and touch.
 */
export function useTokenDrag(
  /** Board point under a viewport position (zoom-aware), or null outside the board. */
  boardPointAt: (clientX: number, clientY: number) => BoardPoint | null,
  callbacks: TokenDragCallbacks,
) {
  const [drag, setDrag] = useState<DragState | null>(null)
  const dragRef = useRef<DragState | null>(null)

  const update = (next: DragState | null) => {
    dragRef.current = next
    setDrag(next)
  }

  const hasMoved = (state: DragState) =>
    Math.hypot(state.clientX - state.startX, state.clientY - state.startY) >= DRAG_THRESHOLD_PX

  const handlersFor = (personId: string): TokenDragHandlers => ({
    onPointerDown(event: PointerEvent<HTMLDivElement>) {
      if (event.button !== 0 || dragRef.current) return
      event.preventDefault()
      // Otherwise the board behind would start panning and steal the pointer capture.
      event.stopPropagation()
      event.currentTarget.setPointerCapture(event.pointerId)
      const { clientX, clientY, pointerId } = event
      update({ personId, pointerId, clientX, clientY, startX: clientX, startY: clientY })
    },
    onPointerMove(event: PointerEvent<HTMLDivElement>) {
      const current = dragRef.current
      if (!current || current.pointerId !== event.pointerId) return
      update({ ...current, clientX: event.clientX, clientY: event.clientY })
      callbacks.onMove(personId, boardPointAt(event.clientX, event.clientY))
    },
    onPointerUp(event: PointerEvent<HTMLDivElement>) {
      const current = dragRef.current
      if (!current || current.pointerId !== event.pointerId) return
      update(null)
      const final = { ...current, clientX: event.clientX, clientY: event.clientY }
      if (hasMoved(final)) callbacks.onDrop(personId, boardPointAt(event.clientX, event.clientY))
    },
    onPointerCancel(event: PointerEvent<HTMLDivElement>) {
      if (dragRef.current?.pointerId === event.pointerId) update(null)
    },
  })

  const isMoving = drag !== null && hasMoved(drag)

  return { drag, isMoving, handlersFor }
}
