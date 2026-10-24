import { useRoomStore } from '../../store/roomStore'
import { useUiStore } from '../../store/uiStore'

/** Group filter (dims the rest) and name search (highlights matches). */
export function BoardToolbar() {
  const groups = useRoomStore((s) => s.groups)
  const groupFilter = useUiStore((s) => s.groupFilter)
  const search = useUiStore((s) => s.search)
  const showNames = useUiStore((s) => s.showNames)
  const { toggleGroupFilter, clearGroupFilter, setSearch, setShowNames } = useUiStore.getState()

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Buscar por nombre…"
        aria-label="Buscar por nombre"
        className="w-44 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm outline-none focus:border-sky-400"
      />
      <label className="flex items-center gap-1 text-xs text-slate-600">
        <input type="checkbox" checked={showNames} onChange={(event) => setShowNames(event.target.checked)} />
        Nombres
      </label>
      {groups.length > 0 && (
        <div className="flex flex-wrap items-center gap-1" aria-label="Filtrar por grupos">
          {groups.map((group) => {
            const active = groupFilter.includes(group.id)
            return (
              <button
                key={group.id}
                type="button"
                aria-pressed={active}
                onClick={() => toggleGroupFilter(group.id)}
                className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${
                  active ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-300 bg-white text-slate-600'
                }`}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: group.color }} />
                {group.name}
              </button>
            )
          })}
          {groupFilter.length > 0 && (
            <button type="button" onClick={clearGroupFilter} className="px-1 text-xs text-sky-700 hover:underline">
              Quitar filtro
            </button>
          )}
        </div>
      )}
    </div>
  )
}
