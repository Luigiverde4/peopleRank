import { useUiStore, type SideTab } from '../../store/uiStore'
import { GroupsTab } from './GroupsTab'
import { PeopleTab } from './PeopleTab'

const TABS: { id: SideTab; label: string }[] = [
  { id: 'people', label: 'Personas' },
  { id: 'groups', label: 'Grupos' },
]

export function SidePanel() {
  const sideTab = useUiStore((s) => s.sideTab)
  const setSideTab = useUiStore((s) => s.setSideTab)

  return (
    <aside className="flex max-h-[70dvh] flex-col rounded-lg border border-slate-200 bg-surface lg:max-h-none lg:min-h-0">
      <div role="tablist" className="flex border-b border-slate-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={sideTab === tab.id}
            onClick={() => setSideTab(tab.id)}
            className={`flex-1 px-3 py-2 text-sm font-medium ${
              sideTab === tab.id ? 'border-b-2 border-sky-600 text-sky-700' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="flex min-h-0 flex-1 flex-col p-3">
        {sideTab === 'people' ? <PeopleTab /> : <GroupsTab />}
      </div>
    </aside>
  )
}
