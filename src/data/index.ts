import type { DataBackend } from './backend'
import { createMemoryBackend } from './memoryBackend'
import { createSupabaseBackend } from './supabaseBackend'

export type { DataBackend, RoomMembership } from './backend'
export { parseSlug } from './ids'
export * from './types'

function selectBackend(): DataBackend {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  const forceMemory = import.meta.env.VITE_DATA_MODE === 'memory'
  if (!forceMemory && url && key) return createSupabaseBackend(url, key)
  return createMemoryBackend()
}

/** Supabase when configured; otherwise (or with VITE_DATA_MODE=memory) the offline demo. */
export const backend: DataBackend = selectBackend()
