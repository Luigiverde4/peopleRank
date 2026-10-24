import { describe, expect, it } from 'vitest'
import { escapeHtml, renderReportHtml, type ReportData } from './report'

const data: ReportData = {
  title: 'Votación <del> 24/10',
  subtitle: 'Modo General',
  generatedAt: new Date('2026-10-24T12:00:00Z'),
  legend: [
    { name: 'Fútbol', color: '#e11d48', subgroup: false },
    { name: 'Trío', color: 'red;}</style>', subgroup: true },
  ],
  boards: [
    {
      title: 'Tablero común',
      tokens: [
        { name: 'Ana <script>', colors: ['#e11d48', '#2563eb'], x: 0.25, y: 0.75 },
        { name: 'Bea', colors: [], x: 0.5, y: 0.5, halo: 0.1, votes: 3, photo: 'javascript:alert(1)' },
      ],
    },
  ],
  tables: [{ title: 'Grupos', headers: ['Grupo', 'Nº'], rows: [['Fútbol & cía', '9']] }],
}

describe('escapeHtml', () => {
  it('escapes markup characters', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;')
  })
})

describe('renderReportHtml', () => {
  const html = renderReportHtml(data)

  it('is a complete document with the title, boards and tables', () => {
    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(html).toContain('<title>Votación &lt;del&gt; 24/10 · peopleRank</title>')
    expect(html).toContain('Tablero común')
    expect(html).toContain('Fútbol &amp; cía')
  })

  it('escapes names and never lets bad colors or photo URLs through', () => {
    expect(html).not.toContain('<script>')
    expect(html).toContain('Ana &lt;script&gt;')
    expect(html).not.toContain('red;}</style>')
    expect(html).not.toContain('javascript:')
  })

  it('places tokens with y = 1 at the top and draws one arc per group', () => {
    // x 0.25 -> 40 + 250, y 0.75 -> 40 + 250.
    expect(html).toContain('cx="290" cy="290"')
    expect((html.match(/<path d="M/g) ?? []).length).toBe(2)
  })

  it('draws halos and vote badges when given', () => {
    expect(html).toContain('class="halo"')
    expect(html).toContain('class="badge-text">3<')
  })
})
