import { describe, expect, it } from 'vitest'
import { matchPhotos, photoNameFromPath } from './photoMatch'

describe('photoNameFromPath', () => {
  it('drops folders and the last extension only', () => {
    expect(photoNameFromPath('/presets/orla/Alumnos/Ana Ruiz.png')).toBe('Ana Ruiz')
    expect(photoNameFromPath('C:\\fotos\\Paloma López de Ontiv. Morató.png')).toBe('Paloma López de Ontiv. Morató')
    expect(photoNameFromPath('sin-extension')).toBe('sin-extension')
  })
})

describe('matchPhotos', () => {
  const people = [
    { id: 'p1', name: 'Álvaro Alfaro Peyró' },
    { id: 'p2', name: 'Lucía Mora' },
  ]

  it('matches ignoring accents, case and extra spaces', () => {
    const files = ['alvaro  alfaro peyro.PNG', 'LUCÍA MORA.jpg', 'Desconocido.png']
    const result = matchPhotos(files, (f) => f, people)
    expect(result.matched).toEqual([
      { file: 'alvaro  alfaro peyro.PNG', personId: 'p1' },
      { file: 'LUCÍA MORA.jpg', personId: 'p2' },
    ])
    expect(result.unmatched).toEqual(['Desconocido.png'])
  })

  it('gives each person a single photo', () => {
    const result = matchPhotos(['Lucía Mora.png', 'lucia mora.jpg'], (f) => f, people)
    expect(result.matched).toHaveLength(1)
    expect(result.unmatched).toEqual(['lucia mora.jpg'])
  })
})
