import { useMemo } from 'react'
import { useT } from '../../i18n'
import { useRoomStore } from '../../store/roomStore'
import { ReadOnlyBoard, type BoardItem } from './ReadOnlyBoard'

/** "Tablero de X": another participant's board, including their in-progress drags. */
export function ParticipantBoard({ participantId }: { participantId: string }) {
  const t = useT()
  const people = useRoomStore((s) => s.people)
  const placements = useRoomStore((s) => s.placements)
  const liveDrags = useRoomStore((s) => s.liveDrags)
  const participant = useRoomStore((s) => s.participants.find((p) => p.id === participantId))

  const items = useMemo<BoardItem[]>(() => {
    const saved = new Map(placements.filter((p) => p.participantId === participantId).map((p) => [p.personId, p]))
    const dragging = new Map(
      Object.values(liveDrags)
        .filter((drag) => drag.participantId === participantId)
        .map((drag) => [drag.personId, drag]),
    )
    return people.flatMap((person) => {
      const drag = dragging.get(person.id)
      const point = drag ?? saved.get(person.id)
      return point ? [{ person, point: { x: point.x, y: point.y }, provisional: drag !== undefined }] : []
    })
  }, [people, placements, liveDrags, participantId])

  return (
    <ReadOnlyBoard
      items={items}
      emptyMessage={t.board.participantEmpty(participant?.displayName)}
    />
  )
}
