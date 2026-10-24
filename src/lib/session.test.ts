import { describe, expect, it } from 'vitest'
import { buildSessionFile, parseSessionFile, type SessionContent } from './session'

const content: SessionContent = {
  room: { name: 'Votación del 24/10', mode: 'general', revealed: false },
  exportedBy: 'me',
  people: [
    { id: 'p1', name: 'Ana' },
    { id: 'p2', name: 'Bea' },
  ],
  groups: [
    { id: 'g1', name: 'A', color: '#e11d48', parentId: null },
    { id: 'g2', name: 'Trío', color: '#f06080', parentId: 'g1' },
    { id: 'g3', name: 'B', color: '#2563eb', parentId: null },
  ],
  memberships: [{ personId: 'p1', groupId: 'g2' }],
  bridges: [{ groupAId: 'g1', groupBId: 'g3', personAId: 'p1', personBId: 'p2' }],
  participants: [{ id: 'me', displayName: 'Ricardo', personId: 'p1' }],
  placements: [{ participantId: 'me', personId: 'p1', x: 0.2, y: 0.8 }],
  sharedPlacements: [{ personId: 'p2', x: 0.5, y: 0.5 }],
}

describe('session files', () => {
  it('round-trips through JSON', () => {
    const file = buildSessionFile(content, new Date('2026-10-24T12:00:00Z'))
    expect(parseSessionFile(JSON.stringify(file))).toEqual(file)
  })

  it('rejects files that are not sessions', () => {
    expect(() => parseSessionFile('no es json')).toThrow('invalidJson')
    expect(() => parseSessionFile('{"hola": 1}')).toThrow('notASession')
    expect(() => parseSessionFile('{"format": "peopleRank-session", "version": 99}')).toThrow('unsupportedSessionVersion')
  })

  it('drops rows that point to missing people or groups, or have coordinates out of range', () => {
    const file = buildSessionFile(content, new Date())
    const broken = {
      ...file,
      memberships: [...file.memberships, { personId: 'ghost', groupId: 'g1' }],
      bridges: [...file.bridges, { groupAId: 'g1', groupBId: 'g1', personAId: 'p1', personBId: 'p2' }],
      placements: [...file.placements, { participantId: 'me', personId: 'p2', x: 1.5, y: 0.5 }],
      sharedPlacements: [...file.sharedPlacements, { personId: 'p9', x: 0.1, y: 0.1 }],
      groups: [...file.groups, { id: 'g4', name: 'Huérfano', color: '#000000', parentId: 'nope' }],
    }
    const parsed = parseSessionFile(JSON.stringify(broken))
    expect(parsed.memberships).toEqual(content.memberships)
    expect(parsed.bridges).toEqual(content.bridges)
    expect(parsed.placements).toEqual(content.placements)
    expect(parsed.sharedPlacements).toEqual(content.sharedPlacements)
    expect(parsed.groups.find((g) => g.id === 'g4')?.parentId).toBeNull()
  })

  it('defaults unknown modes to vs', () => {
    const file = { ...buildSessionFile(content, new Date()), room: { name: 'x', mode: 'raro', revealed: false } }
    expect(parseSessionFile(JSON.stringify(file)).room.mode).toBe('vs')
  })
})
