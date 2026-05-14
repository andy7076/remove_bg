import type { MaskBitmap, Point } from '@/types/editor'

export type ContourPath = Point[]

export function traceMaskBounds(mask: MaskBitmap): ContourPath {
  let minX = mask.width
  let minY = mask.height
  let maxX = 0
  let maxY = 0

  for (let y = 0; y < mask.height; y += 1) {
    for (let x = 0; x < mask.width; x += 1) {
      if (mask.data[y * mask.width + x] > 8) {
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
  }

  if (minX > maxX || minY > maxY) {
    return []
  }

  return [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ]
}
