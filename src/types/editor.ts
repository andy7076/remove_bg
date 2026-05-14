import type { Texture } from 'pixi.js'

export type Point = {
  x: number
  y: number
}

export type MaskHistory = {
  id: string
  width: number
  height: number
  changed: Uint32Array
  before: Uint8Array
  after: Uint8Array
}

export type EditorTool = 'erase' | 'restore' | 'feather'

export type EditorState = {
  originalImage: ImageBitmap | null
  maskTexture: Texture | null
  previewTexture: Texture | null
  zoom: number
  offset: Point
  brushSize: number
  brushHardness: number
  history: MaskHistory[]
  selectedTool: EditorTool
  aiState: {
    loading: boolean
    refining: boolean
  }
}

export type MaskBitmap = {
  width: number
  height: number
  data: Uint8ClampedArray
}
