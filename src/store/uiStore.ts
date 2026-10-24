import { create } from 'zustand'
import type { GameMode } from '../data/types'
import { FULL_VIEW, zoomAt, type Viewport } from '../lib/viewport'

const BUTTON_ZOOM_FACTOR = 1.5

export type BoardView =
  { kind: 'mine' } | { kind: 'consensus' } | { kind: 'participant'; participantId: string } | { kind: 'graph' }

/**
 * Falls back to the editable board when the chosen view is not available: 'general' rooms only have
 * the shared board and the graph, and in 'vs' rooms the others' boards need the room revealed.
 */
export function effectiveView(
  view: BoardView,
  room: { revealed: boolean; mode: GameMode },
  participantIds: readonly string[],
): BoardView {
  if (view.kind === 'mine' || view.kind === 'graph') return view
  if (room.mode === 'general' || !room.revealed) return { kind: 'mine' }
  if (view.kind === 'participant' && !participantIds.includes(view.participantId)) return { kind: 'mine' }
  return view
}

export type SideTab = 'people' | 'groups'

interface UiStore {
  view: BoardView
  sideTab: SideTab
  groupFilter: string[]
  search: string
  showNames: boolean
  /** Zoom and pan of the boards; shared by all board views of the open room. */
  viewport: Viewport
  setView(view: BoardView): void
  setSideTab(tab: SideTab): void
  toggleGroupFilter(groupId: string): void
  clearGroupFilter(): void
  setSearch(search: string): void
  setShowNames(showNames: boolean): void
  updateViewport(change: (viewport: Viewport) => Viewport): void
  zoomIn(): void
  zoomOut(): void
  resetViewport(): void
  reset(): void
}

const initial = {
  view: { kind: 'mine' } as BoardView,
  sideTab: 'people' as SideTab,
  groupFilter: [] as string[],
  search: '',
  showNames: false,
  viewport: FULL_VIEW,
}

export const useUiStore = create<UiStore>()((set) => ({
  ...initial,
  setView: (view) => set({ view }),
  setSideTab: (sideTab) => set({ sideTab }),
  toggleGroupFilter: (groupId) =>
    set((state) => ({
      groupFilter: state.groupFilter.includes(groupId)
        ? state.groupFilter.filter((id) => id !== groupId)
        : [...state.groupFilter, groupId],
    })),
  clearGroupFilter: () => set({ groupFilter: [] }),
  setSearch: (search) => set({ search }),
  setShowNames: (showNames) => set({ showNames }),
  updateViewport: (change) => set((state) => ({ viewport: change(state.viewport) })),
  zoomIn: () => set((state) => ({ viewport: zoomAt(state.viewport, BUTTON_ZOOM_FACTOR, 0.5, 0.5) })),
  zoomOut: () => set((state) => ({ viewport: zoomAt(state.viewport, 1 / BUTTON_ZOOM_FACTOR, 0.5, 0.5) })),
  resetViewport: () => set({ viewport: FULL_VIEW }),
  reset: () => set(initial),
}))
