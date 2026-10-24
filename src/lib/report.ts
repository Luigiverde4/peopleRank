/**
 * Standalone HTML report of a room: boards drawn as SVG plus the stats tables. Pure string
 * building, so it works offline once saved and can be tested without a browser.
 */

export interface ReportToken {
  name: string
  /** Ring colors, one segment per group. */
  colors: string[]
  /** Board coordinates in [0, 1], y = 1 at the top. */
  x: number
  y: number
  /** Optional photo as a data URL. */
  photo?: string
  /** Consensus extras. */
  halo?: number
  votes?: number
}

export interface ReportBoard {
  title: string
  subtitle?: string
  tokens: ReportToken[]
}

export interface ReportTable {
  title: string
  hint?: string
  headers: string[]
  rows: string[][]
}

export interface ReportData {
  title: string
  subtitle: string
  generatedAt: Date
  legend: { name: string; color: string; subgroup: boolean }[]
  boards: ReportBoard[]
  tables: ReportTable[]
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Only #rrggbb colors reach the SVG (they come from user-editable groups). */
function safeColor(color: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#cbd5e1'
}

/** Only image data URLs are embedded as photos. */
function safePhoto(photo: string | undefined): string | null {
  return photo && /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(photo) ? photo : null
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
}

const SIZE = 1000
const PAD = 40
const RADIUS = 17
const RING = 4

const round = (value: number) => Math.round(value * 10) / 10

/** SVG arc path on a circle, from angle a to b (radians, 0 = top, clockwise). */
function arcPath(cx: number, cy: number, r: number, a: number, b: number): string {
  const point = (angle: number) => [cx + r * Math.sin(angle), cy - r * Math.cos(angle)].map(round).join(' ')
  const large = b - a > Math.PI ? 1 : 0
  return `M ${point(a)} A ${r} ${r} 0 ${large} 1 ${point(b)}`
}

function tokenSvg(token: ReportToken, index: number, boardIndex: number): string {
  const cx = round(PAD + token.x * SIZE)
  const cy = round(PAD + (1 - token.y) * SIZE)
  const colors = token.colors.length > 0 ? token.colors.map(safeColor) : ['#cbd5e1']
  const ringRadius = RADIUS + RING / 2
  const ring =
    colors.length === 1
      ? `<circle cx="${cx}" cy="${cy}" r="${ringRadius}" fill="none" stroke="${colors[0]}" stroke-width="${RING}"/>`
      : colors
          .map((color, i) => {
            const step = (2 * Math.PI) / colors.length
            return `<path d="${arcPath(cx, cy, ringRadius, i * step, (i + 1) * step)}" fill="none" stroke="${color}" stroke-width="${RING}"/>`
          })
          .join('')
  const photo = safePhoto(token.photo)
  const clipId = `c${boardIndex}-${index}`
  const face = photo
    ? `<clipPath id="${clipId}"><circle cx="${cx}" cy="${cy}" r="${RADIUS}"/></clipPath><image href="${photo}" x="${cx - RADIUS}" y="${cy - RADIUS}" width="${RADIUS * 2}" height="${RADIUS * 2}" clip-path="url(#${clipId})" preserveAspectRatio="xMidYMid slice"/>`
    : `<circle cx="${cx}" cy="${cy}" r="${RADIUS}" class="face"/><text x="${cx}" y="${cy + 4}" class="initials">${escapeHtml(initials(token.name))}</text>`
  const halo =
    token.halo && token.halo > 0 ? `<circle cx="${cx}" cy="${cy}" r="${round(token.halo * SIZE)}" class="halo" clip-path="url(#board-${boardIndex})"/>` : ''
  const votes =
    token.votes !== undefined
      ? `<circle cx="${cx + 15}" cy="${cy - 15}" r="8" class="badge"/><text x="${cx + 15}" y="${cy - 12}" class="badge-text">${token.votes}</text>`
      : ''
  return `<g class="token"><title>${escapeHtml(token.name)}</title>${halo}${face}${ring}${votes}<text x="${cx}" y="${cy + RADIUS + 15}" class="label">${escapeHtml(token.name)}</text></g>`
}

function boardSvg(board: ReportBoard, boardIndex: number): string {
  const lines = Array.from({ length: 11 }, (_, i) => {
    const pos = PAD + (i * SIZE) / 10
    const cls = i === 5 ? 'axis' : 'grid'
    return `<line x1="${pos}" y1="${PAD}" x2="${pos}" y2="${PAD + SIZE}" class="${cls}"/><line x1="${PAD}" y1="${pos}" x2="${PAD + SIZE}" y2="${pos}" class="${cls}"/>`
  }).join('')
  const full = SIZE + PAD * 2
  const tokens = board.tokens.map((token, i) => tokenSvg(token, i, boardIndex)).join('')
  return `<svg viewBox="0 0 ${full} ${full}" role="img" aria-label="${escapeHtml(board.title)}">
<defs><clipPath id="board-${boardIndex}"><rect x="${PAD}" y="${PAD}" width="${SIZE}" height="${SIZE}"/></clipPath></defs>
<rect x="${PAD}" y="${PAD}" width="${SIZE}" height="${SIZE}" class="board"/>${lines}
<text x="${PAD + 4}" y="${PAD - 12}" class="axis-label">Alta popularidad en el curso ↑</text>
<text x="${PAD + 4}" y="${full - 12}" class="axis-label">Periferia del grupo</text>
<text x="${full - PAD - 4}" y="${full - 12}" class="axis-label end">Centro del grupo →</text>
${tokens}</svg>`
}

function tableHtml(table: ReportTable): string {
  const head = table.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')
  const body =
    table.rows.length === 0
      ? `<tr><td colspan="${table.headers.length}" class="empty">Sin datos</td></tr>`
      : table.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')
  return `<section><h2>${escapeHtml(table.title)}</h2>${table.hint ? `<p class="hint">${escapeHtml(table.hint)}</p>` : ''}<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div></section>`
}

const STYLES = `
:root{--bg:#f5f6fa;--surface:#fff;--fg:#1a1c2b;--muted:#5e6178;--line:#dfe1ea;--grid:#e8eaf1;--axis:#9aa0b4;--accent:#5b3fc4}
@media (prefers-color-scheme:dark){:root{--bg:#11131c;--surface:#191b28;--fg:#e6e7f0;--muted:#a1a4ba;--line:#2c2f43;--grid:#232638;--axis:#4a4f68;--accent:#a993f5}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:980px;margin:0 auto;padding:32px max(16px,env(safe-area-inset-left)) 64px;display:grid;gap:32px}
header{border-bottom:2px solid var(--fg);padding-bottom:16px}h1{margin:0;font-size:clamp(26px,5vw,38px);line-height:1.1}
.sub{color:var(--muted);margin:6px 0 0}h2{margin:0 0 6px;font-size:20px}.hint{margin:0 0 10px;color:var(--muted);font-size:13px}
.legend{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:13px}.legend span{display:inline-flex;align-items:center;gap:6px}
.dot{width:11px;height:11px;border-radius:50%;display:inline-block}
figure{margin:0;background:var(--surface);border:1px solid var(--line);border-radius:6px;padding:12px}
figcaption{font-weight:600;margin-bottom:6px}figcaption small{font-weight:400;color:var(--muted)}
svg{width:100%;height:auto;display:block}.board{fill:var(--surface);stroke:var(--line)}
.grid{stroke:var(--grid);stroke-width:1}.axis{stroke:var(--axis);stroke-width:2}
.axis-label{fill:var(--muted);font-size:20px}.end{text-anchor:end}
.face{fill:var(--surface)}.initials{fill:var(--fg);font-size:13px;font-weight:600;text-anchor:middle}
.label{fill:var(--muted);font-size:11px;text-anchor:middle}.halo{fill:#38bdf8;fill-opacity:.12;stroke:#38bdf8;stroke-opacity:.3}
.badge{fill:var(--fg)}.badge-text{fill:var(--surface);font-size:10px;text-anchor:middle;font-weight:600}
.table-wrap{overflow-x:auto;background:var(--surface);border:1px solid var(--line);border-radius:6px}
table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line)}
th{font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}tr:last-child td{border-bottom:0}
td{font-variant-numeric:tabular-nums}.empty{color:var(--muted)}footer{color:var(--muted);font-size:13px}
`

export function renderReportHtml(data: ReportData): string {
  const legend = data.legend
    .map(
      (g) =>
        `<span>${g.subgroup ? '↳ ' : ''}<i class="dot" style="background:${safeColor(g.color)}"></i>${escapeHtml(g.name)}</span>`,
    )
    .join('')
  const boards = data.boards
    .map(
      (board, i) =>
        `<figure><figcaption>${escapeHtml(board.title)}${board.subtitle ? ` <small>${escapeHtml(board.subtitle)}</small>` : ''}</figcaption>${boardSvg(board, i)}</figure>`,
    )
    .join('')
  const date = data.generatedAt.toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(data.title)} · peopleRank</title><style>${STYLES}</style></head>
<body><main>
<header><h1>${escapeHtml(data.title)}</h1><p class="sub">${escapeHtml(data.subtitle)} · ${escapeHtml(date)}</p></header>
${legend ? `<section><h2>Grupos</h2><div class="legend">${legend}</div></section>` : ''}
${boards}
${data.tables.map(tableHtml).join('\n')}
<footer>Informe generado con peopleRank. Eje vertical: popularidad en el curso; eje horizontal: popularidad dentro de su grupo (0–100).</footer>
</main></body></html>`
}
