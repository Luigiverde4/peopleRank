import { describe, expect, it } from 'vitest'
import { parseGroupShortcut } from './groupShortcut'

describe('parseGroupShortcut', () => {
  it('parses one group per line', () => {
    const text = 'Fútbol: Ana, Bea ,carlos\nTeatro:Dani\n\nsin dos puntos\n : Eva'
    expect(parseGroupShortcut(text)).toEqual([
      { groupName: 'Fútbol', memberNames: ['Ana', 'Bea', 'carlos'] },
      { groupName: 'Teatro', memberNames: ['Dani'] },
    ])
  })

  it('removes empty and duplicated members', () => {
    expect(parseGroupShortcut('G: Ana,, ána , ,Bea')).toEqual([
      { groupName: 'G', memberNames: ['Ana', 'Bea'] },
    ])
  })
})
