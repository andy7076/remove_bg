import type { MaskBitmap } from '@/types/editor'

export function createOpaqueMask(width: number, height: number): MaskBitmap {
  return {
    width,
    height,
    data: new Uint8ClampedArray(width * height).fill(255),
  }
}

export function maskToImageData(mask: MaskBitmap): ImageData {
  const pixels = new Uint8ClampedArray(mask.width * mask.height * 4)

  for (let i = 0, p = 0; i < mask.data.length; i += 1, p += 4) {
    const value = mask.data[i]
    pixels[p] = 255
    pixels[p + 1] = 255
    pixels[p + 2] = 255
    pixels[p + 3] = value
  }

  return new ImageData(pixels, mask.width, mask.height)
}

export function maskToCanvas(mask: MaskBitmap): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = mask.width
  canvas.height = mask.height
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Unable to create mask canvas.')
  }

  context.putImageData(maskToImageData(mask), 0, 0)
  return canvas
}
