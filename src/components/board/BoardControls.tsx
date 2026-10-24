import { useT } from '../../i18n'
import { useUiStore } from '../../store/uiStore'
import { useGroupTree } from '../useGroupTree'
import { ExportMenu } from './ExportMenu'
import { ViewSelector } from './ViewSelector'
import { ZoomControls } from './ZoomControls'

/**
 * Every board control in one place: views, zoom and export on top; search, names and the
 * group filter below.
 */
export function BoardControls() {
  const view = useUiStore((s) => s.view)

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-surface p-2">
      <div className="flex flex-wrap items-center gap-2">
        <ViewSelector />
        <div className="ml-auto flex items-center gap-2">
          {view.kind !== 'graph' && <ZoomControls />}
          <ExportMenu />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
        <SearchAndFilter />
      </div>
    </div>
  )
}

/** Name search (highlights matches), names toggle and group filter (dims the rest). */
function SearchAndFilter() {
  const t = useT()
  const { orderedGroups: groups } = useGroupTree()
  const groupFilter = useUiStore((s) => s.groupFilter)
  const search = useUiStore((s) => s.search)
  const showNames = useUiStore((s) => s.showNames)
  const { toggleGroupFilter, clearGroupFilter, setSearch, setShowNames } = useUiStore.getState()

  return (
    <>
      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={t.controls.search}
        aria-label={t.controls.searchLabel}
        className="w-44 rounded-md border border-slate-300 bg-surface px-2 py-1 text-sm outline-none focus:border-sky-400"
      />
      <label className="flex items-center gap-1 text-xs text-slate-600">
        <input type="checkbox" checked={showNames} onChange={(event) => setShowNames(event.target.checked)} />
        {t.controls.names}
      </label>
      {groups.length > 0 && (
        <div className="flex flex-wrap items-center gap-1" aria-label={t.controls.filterLabel}>
          {groups.map((group) => {
            const active = groupFilter.includes(group.id)
            return (
              <button
                key={group.id}
                type="button"
                aria-pressed={active}
                onClick={() => toggleGroupFilter(group.id)}
                className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${
                  active ? 'border-slate-700 bg-slate-800 text-slate-50' : 'border-slate-300 bg-surface text-slate-600'
                }`}
              >
                {group.parentId && <span aria-hidden>↳</span>}
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: group.color }} />
                {group.name}
              </button>
            )
          })}
          {groupFilter.length > 0 && (
            <button type="button" onClick={clearGroupFilter} className="px-1 text-xs text-sky-700 hover:underline">
              {t.controls.clearFilter}
            </button>
          )}
        </div>
      )}
    </>
  )
}
