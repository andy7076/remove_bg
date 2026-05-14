import type { MaskBitmap } from '@/types/editor'

export async function exportTransparentPng(image: ImageBitmap, mask: MaskBitmap): Promise<Blob> {
  if (image.width !== mask.width || image.height !== mask.height) {
    throw new Error('Image and mask dimensions do not match.')
  }

  const canvas = new OffscreenCanvas(image.width, image.height)
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('OffscreenCanvas export context is unavailable.')
  }

  context.clearRect(0, 0, image.width, image.height)
  context.drawImage(image, 0, 0)
  context.globalCompositeOperation = 'destination-in'
  context.drawImage(createMaskCanvas(mask), 0, 0)
  context.globalCompositeOperation = 'source-over'
  return canvas.convertToBlob({ type: 'image/png' })
}

function createMaskCanvas(mask: MaskBitmap) {
  const canvas = new OffscreenCanvas(mask.width, mask.height)
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('OffscreenCanvas mask context is unavailable.')
  }

  const pixels = new Uint8ClampedArray(mask.width * mask.height * 4)

  for (let i = 0, p = 0; i < mask.data.length; i += 1, p += 4) {
    pixels[p] = 255
    pixels[p + 1] = 255
    pixels[p + 2] = 255
    pixels[p + 3] = mask.data[i]
  }

  context.putImageData(new ImageData(pixels, mask.width, mask.height), 0, 0)
  return canvas
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
