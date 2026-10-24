import { useCallback, useEffect, useRef, type PointerEvent, type RefObject } from 'react'
import type { BoardPoint } from '../../lib/geometry'
import { fromScreen, panBy, zoomAt, type Viewport } from '../../lib/viewport'
import { useUiStore } from '../../store/uiStore'
/** Wheel delta (px) that doubles or halves the zoom; smaller = faster. */
const WHEEL_SENSITIVITY = 0.0015

interface ScreenPoint {
  x: number
  y: number
}

export interface BackgroundHandlers {
  onPointerDown(event: PointerEvent<HTMLDivElement>): void
  onPointerMove(event: PointerEvent<HTMLDivElement>): void
  onPointerUp(event: PointerEvent<HTMLDivElement>): void
  onPointerCancel(event: PointerEvent<HTMLDivElement>): void
}

export interface BoardViewport {
  view: Viewport
  /** Board point under a viewport position, or null when it is outside the board element. */
  boardPointAt(clientX: number, clientY: number): BoardPoint | null
  /** Pan with one pointer, pinch-zoom with two; attach to the board's empty background. */
  backgroundHandlers: BackgroundHandlers
}

/**
 * Zoom and pan gestures for a board: wheel zooms towards the cursor, dragging the empty background
 * pans and two fingers pinch-zoom. The view itself lives in the UI store (buttons in the toolbar);
 * each viewer has their own.
 */
export function useBoardViewport(boardRef: RefObject<HTMLElement | null>): BoardViewport {
  const view = useUiStore((s) => s.viewport)
  const setView = useUiStore((s) => s.updateViewport)
  const pointers = useRef(new Map<number, ScreenPoint>())

  const fractionAt = useCallback(
    (clientX: number, clientY: number) => {
      const rect = boardRef.current?.getBoundingClientRect()
      if (!rect || rect.width === 0) return null
      return { sx: (clientX - rect.left) / rect.width, sy: (clientY - rect.top) / rect.height, rect }
    },
    [boardRef],
  )

  // React registers wheel listeners as passive, so preventDefault (no page scroll) needs a native one.
  useEffect(() => {
    const element = boardRef.current
    if (!element) return
    const onWheel = (event: WheelEvent) => {
      const at = fractionAt(event.clientX, event.clientY)
      if (!at) return
      event.preventDefault()
      const factor = Math.exp(-event.deltaY * WHEEL_SENSITIVITY)
      setView((current) => zoomAt(current, factor, at.sx, at.sy))
    }
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [boardRef, fractionAt, setView])

  const boardPointAt = (clientX: number, clientY: number): BoardPoint | null => {
    const at = fractionAt(clientX, clientY)
    if (!at || at.sx < 0 || at.sx > 1 || at.sy < 0 || at.sy > 1) return null
    return fromScreen(at.sx, at.sy, view)
  }

  const backgroundHandlers: BackgroundHandlers = {
    onPointerDown(event) {
      if (event.pointerType === 'mouse' && event.button !== 0) return
      event.currentTarget.setPointerCapture(event.pointerId)
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    },
    onPointerMove(event) {
      const previous = pointers.current.get(event.pointerId)
      const rect = boardRef.current?.getBoundingClientRect()
      if (!previous || !rect) return
      const others = [...pointers.current.entries()].filter(([id]) => id !== event.pointerId)
      const current = { x: event.clientX, y: event.clientY }
      pointers.current.set(event.pointerId, current)

      if (others.length === 0) {
        const dsx = (current.x - previous.x) / rect.width
        const dsy = (current.y - previous.y) / rect.height
        setView((view) => panBy(view, dsx, dsy))
        return
      }
      // Pinch: zoom by the change in distance to the other finger, around their midpoint.
      const [, other] = others[0]!
      const before = Math.hypot(previous.x - other.x, previous.y - other.y)
      const after = Math.hypot(current.x - other.x, current.y - other.y)
      if (before < 1) return
      const midX = ((current.x + other.x) / 2 - rect.left) / rect.width
      const midY = ((current.y + other.y) / 2 - rect.top) / rect.height
      setView((view) => zoomAt(view, after / before, midX, midY))
    },
    onPointerUp(event) {
      pointers.current.delete(event.pointerId)
    },
    onPointerCancel(event) {
      pointers.current.delete(event.pointerId)
    },
  }

  return { view, boardPointAt, backgroundHandlers }
}
