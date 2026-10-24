import { describe, expect, it } from 'vitest'
import { presenceEntries, toPlacement, toRoom } from './supabaseRows'

describe('row mappers', () => {
  it('maps snake_case rows to app types', () => {
    expect(
      toRoom({ id: 'r', slug: 's', name: 'n', created_by: 'u', revealed: true, created_at: 't' }),
    ).toEqual({ id: 'r', slug: 's', name: 'n', createdBy: 'u', revealed: true, createdAt: 't' })
    expect(
      toPlacement({ participant_id: 'a', person_id: 'p', room_id: 'r', x: 0.1, y: 0.9, updated_at: 't' }),
    ).toEqual({ participantId: 'a', personId: 'p', roomId: 'r', x: 0.1, y: 0.9, updatedAt: 't' })
  })
})

describe('presenceEntries', () => {
  it('deduplicates participants with several tabs and sorts by name', () => {
    const state = {
      k1: [{ participant_id: 'b', display_name: 'Bea' }],
      k2: [
        { participant_id: 'a', display_name: 'Ana' },
        { participant_id: 'b', display_name: 'Bea' },
      ],
      k3: [{ display_name: 'sin id' }],
    }
    expect(presenceEntries(state)).toEqual([
      { participantId: 'a', displayName: 'Ana' },
      { participantId: 'b', displayName: 'Bea' },
    ])
  })
})
