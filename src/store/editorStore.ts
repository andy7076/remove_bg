import { create } from 'zustand'
import type { EditorState, EditorTool, MaskHistory, Point } from '@/types/editor'
import type { Texture } from 'pixi.js'

type EditorActions = {
  setOriginalImage: (image: ImageBitmap | null) => void
  setMaskTexture: (texture: Texture | null) => void
  setPreviewTexture: (texture: Texture | null) => void
  setZoom: (zoom: number) => void
  setOffset: (offset: Point) => void
  setBrushSize: (brushSize: number) => void
  setBrushHardness: (brushHardness: number) => void
  setSelectedTool: (tool: EditorTool) => void
  setAiState: (state: Partial<EditorState['aiState']>) => void
  pushHistory: (entry: MaskHistory) => void
  resetHistory: () => void
}

const initialState: EditorState = {
  originalImage: null,
  maskTexture: null,
  previewTexture: null,
  zoom: 1,
  offset: { x: 0, y: 0 },
  brushSize: 36,
  brushHardness: 0.85,
  history: [],
  selectedTool: 'erase',
  aiState: {
    loading: false,
    refining: false,
  },
}

export const useEditorStore = create<EditorState & EditorActions>((set) => ({
  ...initialState,
  setOriginalImage: (originalImage) => set({ originalImage }),
  setMaskTexture: (maskTexture) => set({ maskTexture }),
  setPreviewTexture: (previewTexture) => set({ previewTexture }),
  setZoom: (zoom) => set({ zoom }),
  setOffset: (offset) => set({ offset }),
  setBrushSize: (brushSize) => set({ brushSize }),
  setBrushHardness: (brushHardness) => set({ brushHardness }),
  setSelectedTool: (selectedTool) => set({ selectedTool }),
  setAiState: (aiState) => set((state) => ({ aiState: { ...state.aiState, ...aiState } })),
  pushHistory: (entry) => set((state) => ({ history: [...state.history, entry] })),
  resetHistory: () => set({ history: [] }),
}))
