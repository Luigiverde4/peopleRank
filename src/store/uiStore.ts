import { create } from 'zustand'

export type BoardView =
  | { kind: 'mine' }
  | { kind: 'consensus' }
  | { kind: 'participant'; participantId: string }
  | { kind: 'graph' }

/** Falls back to "Mi tablero" when the chosen view is not available (yet): the others' boards need a revealed room. */
export function effectiveView(view: BoardView, revealed: boolean, participantIds: readonly string[]): BoardView {
  if (view.kind === 'mine' || view.kind === 'graph') return view
  if (!revealed) return { kind: 'mine' }
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
