import { create } from 'zustand'
import type { GameMode } from '../data/types'

export type BoardView =
  | { kind: 'mine' }
  | { kind: 'consensus' }
  | { kind: 'participant'; participantId: string }
  | { kind: 'graph' }

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
  setView(view: BoardView): void
  setSideTab(tab: SideTab): void
  toggleGroupFilter(groupId: string): void
  clearGroupFilter(): void
  setSearch(search: string): void
  setShowNames(showNames: boolean): void
  reset(): void
}

const initial = {
  view: { kind: 'mine' } as BoardView,
  sideTab: 'people' as SideTab,
  groupFilter: [] as string[],
  search: '',
  showNames: false,
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
  reset: () => set(initial),
}))
