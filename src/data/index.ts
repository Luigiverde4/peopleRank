import type { DataBackend } from './backend'
import { createMemoryBackend } from './memoryBackend'

export type { DataBackend, RoomMembership } from './backend'
export { parseSlug } from './ids'
export * from './types'

export const backend: DataBackend = createMemoryBackend()
