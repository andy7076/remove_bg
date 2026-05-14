import type { MaskBitmap } from '@/types/editor'

export type PreviewInput = {
  image: ImageBitmap
  mask: MaskBitmap
}

export function assertPreviewInput({ image, mask }: PreviewInput) {
  if (image.width !== mask.width || image.height !== mask.height) {
    throw new Error('Preview image and mask dimensions must match.')
  }
}
