import { Texture } from 'pixi.js'
import type { MaskBitmap } from '@/types/editor'
import { maskToCanvas } from '@/utils/mask'

export function createMaskTexture(mask: MaskBitmap) {
  return Texture.from(maskToCanvas(mask))
}
