/**
 * Optional name lists read at build time from `presets/*.local.txt` (one
 * name per line). Those files are git-ignored because they hold real
 * people's names, so deployed builds simply have no presets.
 */
const files = import.meta.glob<string>('/presets/*.local.txt', {
  query: '?raw',
  import: 'default',
  eager: true,
})

export interface NamePreset {
  label: string
  text: string
  count: number
}

export const namePresets: NamePreset[] = Object.entries(files).map(([path, text]) => ({
  label: path.replace(/^.*\//, '').replace(/\.local\.txt$/, ''),
  text,
  count: text.split(/\r?\n/).filter((line) => line.trim() !== '').length,
}))
