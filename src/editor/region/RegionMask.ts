import type { MaskBitmap } from '@/types/editor'

const OPAQUE_THRESHOLD = 128

export type RegionEdit = {
  imageData?: ImageData | null
  x: number
  y: number
  mode: 'erase' | 'restore'
}

const SEED_COLOR_TOLERANCE = 54
const NEIGHBOR_COLOR_TOLERANCE = 34

export function applyRegionEdit(mask: MaskBitmap, edit: RegionEdit): MaskBitmap {
  const startX = Math.floor(edit.x)
  const startY = Math.floor(edit.y)
  if (startX < 0 || startY < 0 || startX >= mask.width || startY >= mask.height) {
    return mask
  }

  const targetKept = edit.mode === 'erase'
  const startIndex = startY * mask.width + startX
  if (isKept(mask.data[startIndex]) !== targetKept) {
    return mask
  }

  const next = new Uint8ClampedArray(mask.data)
  const visited = new Uint8Array(mask.data.length)
  const stack = [startIndex]
  const fillValue = edit.mode === 'restore' ? 255 : 0
  const imagePixels = edit.imageData?.data
  const seedColor = imagePixels ? readColor(imagePixels, startIndex) : null
  let changed = false

  visited[startIndex] = 1

  while (stack.length > 0) {
    const index = stack.pop()
    if (index === undefined) {
      continue
    }

    if (isKept(mask.data[index]) !== targetKept) {
      continue
    }

    if (next[index] !== fillValue) {
      next[index] = fillValue
      changed = true
    }

    const x = index % mask.width
    const y = Math.floor(index / mask.width)
    const currentColor = imagePixels ? readColor(imagePixels, index) : null
    addNeighbor(stack, visited, mask, imagePixels, seedColor, currentColor, x - 1, y, targetKept)
    addNeighbor(stack, visited, mask, imagePixels, seedColor, currentColor, x + 1, y, targetKept)
    addNeighbor(stack, visited, mask, imagePixels, seedColor, currentColor, x, y - 1, targetKept)
    addNeighbor(stack, visited, mask, imagePixels, seedColor, currentColor, x, y + 1, targetKept)
  }

  if (!changed) {
    return mask
  }

  return { ...mask, data: next }
}

function addNeighbor(
  stack: number[],
  visited: Uint8Array,
  mask: MaskBitmap,
  imagePixels: Uint8ClampedArray | undefined,
  seedColor: [number, number, number] | null,
  currentColor: [number, number, number] | null,
  x: number,
  y: number,
  targetKept: boolean,
) {
  if (x < 0 || y < 0 || x >= mask.width || y >= mask.height) {
    return
  }

  const index = y * mask.width + x
  if (visited[index] || isKept(mask.data[index]) !== targetKept) {
    return
  }

  if (imagePixels && seedColor && currentColor) {
    const nextColor = readColor(imagePixels, index)
    if (
      colorDistance(seedColor, nextColor) > SEED_COLOR_TOLERANCE ||
      colorDistance(currentColor, nextColor) > NEIGHBOR_COLOR_TOLERANCE
    ) {
      return
    }
  }

  visited[index] = 1
  stack.push(index)
}

function isKept(value: number) {
  return value >= OPAQUE_THRESHOLD
}

function readColor(pixels: Uint8ClampedArray, index: number): [number, number, number] {
  const offset = index * 4
  return [pixels[offset], pixels[offset + 1], pixels[offset + 2]]
}

function colorDistance(a: [number, number, number], b: [number, number, number]) {
  const r = a[0] - b[0]
  const g = a[1] - b[1]
  const blue = a[2] - b[2]
  return Math.sqrt(r * r + g * g + blue * blue)
}
