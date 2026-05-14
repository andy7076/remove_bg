import type { MaskBitmap, MaskHistory } from '@/types/editor'

export function createMaskDiff(before: MaskBitmap, after: MaskBitmap): MaskHistory {
  if (before.width !== after.width || before.height !== after.height) {
    throw new Error('Cannot diff masks with different dimensions.')
  }

  const changed: number[] = []
  const beforeValues: number[] = []
  const afterValues: number[] = []

  for (let i = 0; i < before.data.length; i += 1) {
    if (before.data[i] !== after.data[i]) {
      changed.push(i)
      beforeValues.push(before.data[i])
      afterValues.push(after.data[i])
    }
  }

  return {
    id: crypto.randomUUID(),
    width: before.width,
    height: before.height,
    changed: Uint32Array.from(changed),
    before: Uint8Array.from(beforeValues),
    after: Uint8Array.from(afterValues),
  }
}

export function applyMaskDiff(mask: MaskBitmap, diff: MaskHistory, direction: 'undo' | 'redo'): MaskBitmap {
  const data = new Uint8ClampedArray(mask.data)
  const values = direction === 'undo' ? diff.before : diff.after

  for (let i = 0; i < diff.changed.length; i += 1) {
    data[diff.changed[i]] = values[i]
  }

  return { ...mask, data }
}
