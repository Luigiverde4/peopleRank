import { AppError } from './appError'
export const PHOTO_SIZE = 256
const WEBP_QUALITY = 0.85

export interface SquareCrop {
  sx: number
  sy: number
  side: number
}

/** Largest centered square inside a width × height image. */
export function centerSquareCrop(width: number, height: number): SquareCrop {
  const side = Math.min(width, height)
  return { sx: Math.round((width - side) / 2), sy: Math.round((height - side) / 2), side }
}

/**
 * Crops the image to a centered square and resizes it to `size` × `size`
 * WebP using a canvas (browser only).
 */
export async function resizeToWebp(image: Blob, size = PHOTO_SIZE): Promise<Blob> {
  const bitmap = await createImageBitmap(image)
  try {
    const { sx, sy, side } = centerSquareCrop(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const context = canvas.getContext('2d')
    if (!context) throw new AppError('imageProcessingFailed')
    context.imageSmoothingQuality = 'high'
    context.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY))
    // Browsers without WebP encoding silently fall back to PNG.
    if (!blob || blob.type !== 'image/webp') throw new AppError('webpUnsupported')
    return blob
  } finally {
    bitmap.close()
  }
}
