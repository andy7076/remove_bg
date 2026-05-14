import type { EditorTool, MaskBitmap } from '@/types/editor'

export type BrushStroke = {
  x: number
  y: number
  radius: number
  hardness: number
  tool: EditorTool
}

export function applyBrush(mask: MaskBitmap, stroke: BrushStroke): MaskBitmap {
  const next = new Uint8ClampedArray(mask.data)
  const radiusSquared = stroke.radius * stroke.radius
  const minX = Math.max(0, Math.floor(stroke.x - stroke.radius))
  const maxX = Math.min(mask.width - 1, Math.ceil(stroke.x + stroke.radius))
  const minY = Math.max(0, Math.floor(stroke.y - stroke.radius))
  const maxY = Math.min(mask.height - 1, Math.ceil(stroke.y + stroke.radius))

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = x - stroke.x
      const dy = y - stroke.y
      const distanceSquared = dx * dx + dy * dy

      if (distanceSquared > radiusSquared) {
        continue
      }

      const index = y * mask.width + x
      const distance = Math.sqrt(distanceSquared) / stroke.radius
      const falloff = distance <= stroke.hardness ? 1 : Math.max(0, 1 - (distance - stroke.hardness) / (1 - stroke.hardness))

      if (stroke.tool === 'restore') {
        next[index] = Math.max(next[index], Math.round(255 * falloff))
      } else if (stroke.tool === 'erase') {
        next[index] = Math.min(next[index], Math.round(255 * (1 - falloff)))
      } else {
        next[index] = Math.round(next[index] * (1 - falloff * 0.35) + 128 * falloff * 0.35)
      }
    }
  }

  return { ...mask, data: next }
}
