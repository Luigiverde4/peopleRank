import { describe, expect, it } from 'vitest'
import { effectiveView } from './uiStore'

describe('effectiveView', () => {
  it('always allows my board', () => {
    expect(effectiveView({ kind: 'mine' }, false, [])).toEqual({ kind: 'mine' })
  })

  it('falls back to my board before revealing', () => {
    expect(effectiveView({ kind: 'consensus' }, false, [])).toEqual({ kind: 'mine' })
    expect(effectiveView({ kind: 'participant', participantId: 'a' }, false, ['a'])).toEqual({ kind: 'mine' })
  })

  it('allows consensus and existing participants once revealed', () => {
    expect(effectiveView({ kind: 'consensus' }, true, [])).toEqual({ kind: 'consensus' })
    expect(effectiveView({ kind: 'participant', participantId: 'a' }, true, ['a'])).toEqual({
      kind: 'participant',
      participantId: 'a',
    })
    expect(effectiveView({ kind: 'participant', participantId: 'gone' }, true, ['a'])).toEqual({ kind: 'mine' })
  })
})
