import type { CSSProperties, PointerEventHandler, ReactNode } from 'react'
import { ringBackground } from '../lib/colors'
import { initials } from '../lib/names'

export interface TokenProps {
  name: string
  ringColors: string[]
  photoUrl?: string | null
  size?: number
  dimmed?: boolean
  highlighted?: boolean
  showLabel?: boolean
  /** Small badge in the corner, e.g. the number of votes. */
  badge?: ReactNode
  draggable?: boolean
  /** CSS position of the token root; badge and label are positioned against it. */
  position?: 'relative' | 'absolute' | 'fixed'
  className?: string
  style?: CSSProperties
  onPointerDown?: PointerEventHandler<HTMLDivElement>
  onPointerMove?: PointerEventHandler<HTMLDivElement>
  onPointerUp?: PointerEventHandler<HTMLDivElement>
  onPointerCancel?: PointerEventHandler<HTMLDivElement>
}

const RING_WIDTH = 3

export function Token({
  name,
  ringColors,
  photoUrl,
  size = 36,
  dimmed = false,
  highlighted = false,
  showLabel = false,
  badge,
  draggable = false,
  position = 'relative',
  className = '',
  style,
  ...pointerHandlers
}: TokenProps) {
  const stateClasses = [
    dimmed ? 'opacity-25' : '',
    highlighted ? 'z-20 scale-125 drop-shadow-[0_0_6px_rgba(250,204,21,0.9)]' : '',
    draggable ? 'cursor-grab touch-none active:cursor-grabbing' : '',
  ].join(' ')

  return (
    <div
      className={`group/token ${position} flex select-none flex-col items-center transition-[opacity,scale] ${stateClasses} ${className}`}
      style={style}
      title={name}
      {...pointerHandlers}
    >
      <div
        className="rounded-full shadow-sm"
        style={{ width: size, height: size, padding: RING_WIDTH, background: ringBackground(ringColors) }}
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={name}
            draggable={false}
            className="h-full w-full rounded-full bg-surface object-cover"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center rounded-full bg-surface font-semibold text-slate-700"
            style={{ fontSize: size * 0.34 }}
          >
            {initials(name)}
          </div>
        )}
      </div>
      {badge !== undefined && (
        <span className="absolute -right-1.5 -top-1.5 rounded-full bg-slate-800 px-1 text-[10px] leading-4 text-slate-50">
          {badge}
        </span>
      )}
      <span
        className={`pointer-events-none absolute top-full mt-0.5 max-w-24 truncate rounded bg-surface/90 px-1 text-[11px] leading-4 text-slate-700 shadow-sm ${
          showLabel || highlighted ? 'block' : 'hidden group-hover/token:block'
        }`}
      >
        {name}
      </span>
    </div>
  )
}
