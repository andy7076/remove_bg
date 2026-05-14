import type { MaskBitmap } from '@/types/editor'

export type Trimap = {
  width: number
  height: number
  data: Uint8ClampedArray
}

export function createTrimap(mask: MaskBitmap, unknownBand = 12): Trimap {
  const data = new Uint8ClampedArray(mask.width * mask.height)

  for (let y = 0; y < mask.height; y += 1) {
    for (let x = 0; x < mask.width; x += 1) {
      const index = y * mask.width + x
      const value = mask.data[index]

      if (value <= 8) {
        data[index] = 0
      } else if (value >= 247) {
        data[index] = 255
      } else {
        data[index] = 128
      }
    }
  }

  if (unknownBand <= 0) {
    return { width: mask.width, height: mask.height, data }
  }

  for (let y = 1; y < mask.height - 1; y += 1) {
    for (let x = 1; x < mask.width - 1; x += 1) {
      const index = y * mask.width + x
      const value = mask.data[index]
      const edge =
        Math.abs(value - mask.data[index - 1]) > unknownBand ||
        Math.abs(value - mask.data[index + 1]) > unknownBand ||
        Math.abs(value - mask.data[index - mask.width]) > unknownBand ||
        Math.abs(value - mask.data[index + mask.width]) > unknownBand

      if (edge) {
        data[index] = 128
      }
    }
  }

  return { width: mask.width, height: mask.height, data }
}
