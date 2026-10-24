import { useRoomStore } from '../store/roomStore'

export function RoomHeader() {
  const room = useRoomStore((s) => s.room)
  const me = useRoomStore((s) => s.me)
  const people = useRoomStore((s) => s.people)
  const setMyPerson = useRoomStore((s) => s.setMyPerson)

  if (!room || !me) return null

  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-200 bg-white px-4 py-2">
      <h1 className="text-lg font-semibold">{room.name}</h1>
      <label className="ml-auto flex items-center gap-2 text-sm text-slate-600">
        ¿Quién eres en la lista?
        <select
          value={me.personId ?? ''}
          onChange={(event) => void setMyPerson(event.target.value || null)}
          className="max-w-44 rounded-md border border-slate-300 bg-white px-1 py-0.5 text-sm"
        >
          <option value="">— Nadie —</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
      </label>
    </header>
  )
}
