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

/**
 * Optional class photos in `presets/orla_fotos/` (any subfolder), each file named like the person.
 * Git-ignored as well (real people), so only local builds have them.
 */
const photoFiles = import.meta.glob<string>('/presets/orla_fotos/**/*.{png,jpg,jpeg,webp,PNG,JPG,JPEG,WEBP}', {
  query: '?url',
  import: 'default',
  eager: true,
})

export interface PhotoPresetFile {
  /** Original file path, used to match the photo with a person by name. */
  name: string
  url: string
}

export const photoPreset: PhotoPresetFile[] = Object.entries(photoFiles).map(([name, url]) => ({ name, url }))

export const namePresets: NamePreset[] = Object.entries(files).map(([path, text]) => ({
  label: path.replace(/^.*\//, '').replace(/\.local\.txt$/, ''),
  text,
  count: text.split(/\r?\n/).filter((line) => line.trim() !== '').length,
}))
