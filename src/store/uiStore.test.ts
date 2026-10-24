import { describe, expect, it } from 'vitest'
import { effectiveView } from './uiStore'

const blindVs = { revealed: false, mode: 'vs' as const }
const revealedVs = { revealed: true, mode: 'vs' as const }
const general = { revealed: false, mode: 'general' as const }

describe('effectiveView', () => {
  it('always allows the editable board and the group graph', () => {
    for (const room of [blindVs, revealedVs, general]) {
      expect(effectiveView({ kind: 'mine' }, room, [])).toEqual({ kind: 'mine' })
      expect(effectiveView({ kind: 'graph' }, room, [])).toEqual({ kind: 'graph' })
    }
  })

  it('falls back to my board before revealing', () => {
    expect(effectiveView({ kind: 'consensus' }, blindVs, [])).toEqual({ kind: 'mine' })
    expect(effectiveView({ kind: 'participant', participantId: 'a' }, blindVs, ['a'])).toEqual({ kind: 'mine' })
  })

  it('allows consensus and existing participants once revealed', () => {
    expect(effectiveView({ kind: 'consensus' }, revealedVs, [])).toEqual({ kind: 'consensus' })
    expect(effectiveView({ kind: 'participant', participantId: 'a' }, revealedVs, ['a'])).toEqual({
      kind: 'participant',
      participantId: 'a',
    })
    expect(effectiveView({ kind: 'participant', participantId: 'gone' }, revealedVs, ['a'])).toEqual({ kind: 'mine' })
  })

  it('has no consensus or individual boards in general rooms', () => {
    expect(effectiveView({ kind: 'consensus' }, general, [])).toEqual({ kind: 'mine' })
    expect(effectiveView({ kind: 'participant', participantId: 'a' }, general, ['a'])).toEqual({ kind: 'mine' })
  })
})
