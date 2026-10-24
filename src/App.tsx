import { useEffect } from 'react'
import { RoomScreen } from './components/RoomScreen'
import { backend } from './data'
import { useRoomStore } from './store/roomStore'

const LOCAL_SLUG_KEY = 'peopleRank:localSlug'

/** Phase 1: a single local room, created on first visit. */
async function openLocalRoom(): Promise<void> {
  await backend.ensureSession()
  let slug = localStorage.getItem(LOCAL_SLUG_KEY)
  let membership = slug ? await backend.findMembership(slug) : null
  if (!membership) {
    slug = await backend.createRoom('Mi curso', 'Yo')
    localStorage.setItem(LOCAL_SLUG_KEY, slug)
    membership = await backend.findMembership(slug)
  }
  if (membership) await useRoomStore.getState().open(membership.room, membership.me)
}

let opening: Promise<void> | null = null

export function App() {
  useEffect(() => {
    // Memoized so StrictMode's double effect does not create two rooms.
    opening ??= openLocalRoom()
  }, [])

  return <RoomScreen />
}
