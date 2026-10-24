import { useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph2D, { type ForceGraphMethods, type LinkObject, type NodeObject } from 'react-force-graph-2d'
import type { Person } from '../../data/types'
import { NO_GROUP_COLOR } from '../../lib/colors'
import { groupGraph } from '../../lib/graph'
import { initials } from '../../lib/names'
import { useRoomStore } from '../../store/roomStore'
import { BOARD_MAX_SIZE } from '../board/Board'
import { useTokenStyles, type TokenLook } from '../useTokenStyles'

const NODE_RADIUS = 7
const RING_WIDTH = 2

interface GraphNode {
  id: string
  name: string
  person: Person
}

interface GraphLinkDatum {
  source: string
  target: string
  color: string
  width: number
}

/** People as nodes, linked when they share a group; link color = shared group. */
export default function GroupGraph() {
  const people = useRoomStore((s) => s.people)
  const groups = useRoomStore((s) => s.groups)
  const memberships = useRoomStore((s) => s.memberships)
  const { lookOf } = useTokenStyles()
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<ForceGraphMethods<NodeObject<GraphNode>, LinkObject<GraphNode, GraphLinkDatum>>>(undefined)
  const size = useSquareSize(containerRef)

  // The library mutates nodes and links, so they are rebuilt only when the graph itself changes;
  // filter and search only affect how nodes are painted (no layout restart).
  const graphData = useMemo(() => {
    const colorOf = new Map(groups.map((g) => [g.id, g.color]))
    const { links } = groupGraph(people, groups, memberships)
    return {
      nodes: people.map<GraphNode>((person) => ({ id: person.id, name: person.name, person })),
      links: links.map<GraphLinkDatum>((link) => ({
        source: link.source,
        target: link.target,
        color: colorOf.get(link.groupIds[0]!) ?? NO_GROUP_COLOR,
        width: link.groupIds.length,
      })),
    }
  }, [people, groups, memberships])

  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-xs text-slate-500">
        Cada línea une a dos personas que comparten grupo (color del grupo; más gruesa si comparten varios). Arrastra
        para mover, rueda para hacer zoom.
      </p>
      <div
        ref={containerRef}
        data-board-export
        className="aspect-square w-full overflow-hidden rounded-lg border border-slate-300 bg-white"
        style={{ maxWidth: BOARD_MAX_SIZE }}
      >
        {size > 0 && (
          <ForceGraph2D<GraphNode, GraphLinkDatum>
            ref={graphRef}
            width={size}
            height={size}
            graphData={graphData}
            backgroundColor="#ffffff"
            nodeLabel={(node) => node.name}
            nodeRelSize={NODE_RADIUS}
            linkColor={(link) => `${link.color}66`}
            linkWidth={(link) => link.width}
            nodeCanvasObject={(node, context, scale) => drawNode(node, lookOf(node.person), context, scale)}
            nodePointerAreaPaint={(node, color, context) => {
              context.fillStyle = color
              context.beginPath()
              context.arc(node.x ?? 0, node.y ?? 0, NODE_RADIUS + RING_WIDTH, 0, 2 * Math.PI)
              context.fill()
            }}
            cooldownTicks={150}
            // Keep repainting after the layout settles so filter/search changes show at once.
            autoPauseRedraw={false}
            onEngineStop={() => graphRef.current?.zoomToFit(400, 24)}
          />
        )}
      </div>
    </div>
  )
}

function drawNode(
  node: GraphNode & { x?: number; y?: number },
  look: TokenLook,
  context: CanvasRenderingContext2D,
  scale: number,
) {
  const x = node.x ?? 0
  const y = node.y ?? 0
  const { ringColors, dimmed, highlighted } = look
  const colors = ringColors.length > 0 ? ringColors : [NO_GROUP_COLOR]
  context.save()
  context.globalAlpha = dimmed ? 0.2 : 1

  if (highlighted) {
    context.shadowColor = 'rgba(250, 204, 21, 0.95)'
    context.shadowBlur = 12
  }
  // Ring split in one arc per group, starting at the top like the CSS conic-gradient.
  const step = (2 * Math.PI) / colors.length
  colors.forEach((color, i) => {
    context.beginPath()
    context.moveTo(x, y)
    context.arc(x, y, NODE_RADIUS + RING_WIDTH, -Math.PI / 2 + i * step, -Math.PI / 2 + (i + 1) * step)
    context.closePath()
    context.fillStyle = color
    context.fill()
  })
  context.shadowBlur = 0
  context.beginPath()
  context.arc(x, y, NODE_RADIUS, 0, 2 * Math.PI)
  context.fillStyle = '#ffffff'
  context.fill()

  context.fillStyle = '#334155'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.font = `600 ${NODE_RADIUS * 0.9}px sans-serif`
  context.fillText(initials(node.name), x, y + 0.3)
  if (highlighted || scale > 2.5) {
    context.font = `${10 / scale}px sans-serif`
    context.fillText(node.name, x, y + NODE_RADIUS + RING_WIDTH + 6 / scale)
  }
  context.restore()
}

/** Width of the (square) container, updated on resize. */
function useSquareSize(ref: React.RefObject<HTMLElement | null>): number {
  const [size, setSize] = useState(0)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setSize(Math.floor(entry!.contentRect.width)))
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])
  return size
}
