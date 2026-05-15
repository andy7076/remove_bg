'use client'

import {
  AlertCircle,
  Brush,
  CheckCircle2,
  Cpu,
  Download,
  Eraser,
  Eye,
  HardDriveDownload,
  Hand,
  ImagePlus,
  LoaderCircle,
  Minus,
  MousePointer2,
  Palette,
  Pencil,
  Redo2,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Undo2,
  UploadCloud,
  ZoomIn,
} from 'lucide-react'
import type { CSSProperties, ChangeEvent, DragEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MODEL_REGISTRY, SEGMENTATION_MODELS, type SelectableSegmentationModelName } from '@/ai/modelRegistry'
import { runSegmentationModel, type SegmentationProgress } from '@/ai/segmentation/runSegmentationModel'
import { LocaleSwitcher } from '@/components/LocaleSwitcher'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { applyBrush, type BrushStroke } from '@/editor/brush/BrushEngine'
import { useLocale } from '@/i18n/LocaleProvider'
import { MESSAGES, type Locale } from '@/i18n/messages'
import { EditorCanvas } from '@/components/EditorCanvas'
import { useEditorStore } from '@/store/editorStore'
import type { MaskBitmap } from '@/types/editor'
import { downloadBlob, exportTransparentPng } from '@/utils/exportPng'
import { createOpaqueMask } from '@/utils/mask'

type FlowStage = 'idle' | 'processing' | 'ready' | 'error'
type ProcessStep = 'decode' | 'model' | 'inference' | 'preview'
type StepState = 'pending' | 'active' | 'done' | 'error'
type EditTool = 'restore' | 'erase' | 'pan'
type ViewMode = 'preview' | 'edit'
type StatusState =
  | { key: 'idle' }
  | { key: 'readingImage' }
  | { key: 'preparingModel'; model: string }
  | { key: 'modelCacheHit' }
  | { key: 'modelStored' }
  | { key: 'downloading'; loaded: number; total: number | null }
  | { key: 'inferenceRunning' }
  | { key: 'previewGenerating' }
  | { key: 'done' }
  | { key: 'exporting' }
  | { key: 'exported' }
  | { key: 'error' }

const STEP_ORDER: ProcessStep[] = ['decode', 'model', 'inference', 'preview']
const HISTORY_LIMIT = 40
const EDIT_TOOLS: { id: EditTool; icon: typeof MousePointer2 }[] = [
  { id: 'restore', icon: Brush },
  { id: 'erase', icon: Eraser },
  { id: 'pan', icon: Hand },
]
const PREVIEW_BACKGROUNDS = [
  'transparent',
  '#ffffff',
  '#f3f4f6',
  '#111827',
  '#000000',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#a855f7',
] as const

export function EditorShell() {
  const { locale } = useLocale()
  const copy = MESSAGES[locale]
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const backgroundMenuRef = useRef<HTMLDivElement | null>(null)
  const maskRef = useRef<MaskBitmap | null>(null)
  const pendingHistoryMaskRef = useRef<MaskBitmap | null>(null)
  const originalImage = useEditorStore((state) => state.originalImage)
  const aiState = useEditorStore((state) => state.aiState)
  const setOriginalImage = useEditorStore((state) => state.setOriginalImage)
  const setAiState = useEditorStore((state) => state.setAiState)
  const resetHistory = useEditorStore((state) => state.resetHistory)
  const zoom = useEditorStore((state) => state.zoom)
  const offset = useEditorStore((state) => state.offset)
  const brushSize = useEditorStore((state) => state.brushSize)
  const brushHardness = useEditorStore((state) => state.brushHardness)
  const selectedTool = useEditorStore((state) => state.selectedTool)
  const setZoom = useEditorStore((state) => state.setZoom)
  const setOffset = useEditorStore((state) => state.setOffset)
  const setBrushSize = useEditorStore((state) => state.setBrushSize)
  const setSelectedTool = useEditorStore((state) => state.setSelectedTool)
  const [mask, setMask] = useState<MaskBitmap | null>(null)
  const [stage, setStage] = useState<FlowStage>('idle')
  const [activeStep, setActiveStep] = useState<ProcessStep | null>(null)
  const [completedSteps, setCompletedSteps] = useState<ProcessStep[]>([])
  const [statusState, setStatusState] = useState<StatusState>({ key: 'idle' })
  const [errorMessage, setErrorMessage] = useState('')
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null)
  const [fileName, setFileName] = useState('transparent-image')
  const [isDragging, setIsDragging] = useState(false)
  const [selectedModel, setSelectedModel] = useState<SelectableSegmentationModelName>('silueta')
  const [previewBackground, setPreviewBackground] = useState('transparent')
  const [backgroundMenuOpen, setBackgroundMenuOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('preview')
  const [undoStack, setUndoStack] = useState<MaskBitmap[]>([])
  const [redoStack, setRedoStack] = useState<MaskBitmap[]>([])

  useEffect(() => {
    maskRef.current = mask
  }, [mask])

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!backgroundMenuRef.current?.contains(event.target as Node)) {
        setBackgroundMenuOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setBackgroundMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const canExport = Boolean(originalImage && mask && stage === 'ready' && !aiState.loading)
  const modelLabel = useMemo(() => MODEL_REGISTRY[selectedModel].displayName, [selectedModel])
  const selectedModelCopy = copy.models.options[selectedModel]
  const statusText = useMemo(() => formatStatus(copy, locale, statusState), [copy, locale, statusState])
  const stepItems = useMemo(() => buildStepItems(copy, completedSteps, activeStep, stage), [copy, completedSteps, activeStep, stage])
  const previewTitle =
    stage === 'ready' ? copy.preview.readyTitle : stage === 'processing' ? copy.preview.processingTitle : copy.preview.waitingTitle

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      await processFile(file)
    }
    event.target.value = ''
  }

  async function processFile(file: File) {
    if (!file.type.startsWith('image/')) {
      showError(copy.errors.unsupportedImage)
      return
    }

    resetProcessingState()
    setStage('processing')
    setActiveStep('decode')
    setStatusState({ key: 'readingImage' })
    setFileName(file.name.replace(/\.[^.]+$/, '') || 'transparent-image')
    setViewMode('preview')
    resetHistory()
    resetLocalHistory()
    setZoom(1)
    setOffset({ x: 0, y: 0 })

    try {
      const previewBitmap = await createImageBitmap(file)
      markStepDone('decode')
      setOriginalImage(previewBitmap)
      setMask(createOpaqueMask(previewBitmap.width, previewBitmap.height))
      await runSegmentation(previewBitmap)
    } catch (error) {
      showError(error instanceof Error ? error.message : copy.errors.imageDecodeFailed)
    }
  }

  async function runSegmentation(image: ImageBitmap) {
    setAiState({ loading: true })
    setActiveStep('model')
    setStatusState({ key: 'preparingModel', model: modelLabel })

    try {
      const inferenceBitmap = await createImageBitmap(image)
      const result = await runSegmentationModel(selectedModel, inferenceBitmap, handleSegmentationProgress)
      markStepDone('inference')
      setActiveStep('preview')
      setStatusState({ key: 'previewGenerating' })
      setMask(result)
      markStepDone('preview')
      setActiveStep(null)
      setStage('ready')
      setViewMode('preview')
      setStatusState({ key: 'done' })
      setErrorMessage('')
    } catch (error) {
      showError(error instanceof Error ? error.message : copy.errors.inferenceFailed)
    } finally {
      setAiState({ loading: false })
    }
  }

  async function handleRetrySegmentation() {
    if (!originalImage || aiState.loading) {
      return
    }

    setStage('processing')
    setViewMode('preview')
    setCompletedSteps(['decode'])
    setDownloadProgress(null)
    setErrorMessage('')
    resetLocalHistory()
    setZoom(1)
    setOffset({ x: 0, y: 0 })
    setMask(createOpaqueMask(originalImage.width, originalImage.height))
    await runSegmentation(originalImage)
  }

  function handleCanvasStroke(stroke: BrushStroke) {
    setMask((current) => {
      if (!current) {
        return current
      }

      const next = applyBrush(current, stroke)
      maskRef.current = next
      return next
    })
  }

  function handleMaskEditStart() {
    const current = maskRef.current
    if (current) {
      pendingHistoryMaskRef.current = cloneMask(current)
    }
  }

  function handleMaskEditEnd() {
    const before = pendingHistoryMaskRef.current
    const current = maskRef.current
    pendingHistoryMaskRef.current = null

    if (!before || !current || !hasMaskChanged(before, current)) {
      return
    }

    pushUndoSnapshot(before)
  }

  function handleUndo() {
    const current = maskRef.current
    const previous = undoStack.at(-1)
    if (!current || !previous) {
      return
    }

    const restored = cloneMask(previous)
    setUndoStack((items) => items.slice(0, -1))
    setRedoStack((items) => [cloneMask(current), ...items].slice(0, HISTORY_LIMIT))
    maskRef.current = restored
    setMask(restored)
  }

  function handleRedo() {
    const current = maskRef.current
    const next = redoStack[0]
    if (!current || !next) {
      return
    }

    const restored = cloneMask(next)
    setRedoStack((items) => items.slice(1))
    setUndoStack((items) => [...items, cloneMask(current)].slice(-HISTORY_LIMIT))
    maskRef.current = restored
    setMask(restored)
  }

  function pushUndoSnapshot(snapshot: MaskBitmap) {
    setUndoStack((items) => [...items, cloneMask(snapshot)].slice(-HISTORY_LIMIT))
    setRedoStack([])
  }

  function resetLocalHistory() {
    pendingHistoryMaskRef.current = null
    setUndoStack([])
    setRedoStack([])
  }

  function handleSegmentationProgress(progress: SegmentationProgress) {
    if (progress.stage === 'inference') {
      markStepDone('model')
      setDownloadProgress(null)
      setActiveStep('inference')
      setStatusState({ key: 'inferenceRunning' })
      return
    }

    const modelProgress = progress.model

    if (modelProgress.phase === 'cache-hit') {
      setDownloadProgress(100)
      setStatusState({ key: 'modelCacheHit' })
      return
    }

    if (modelProgress.phase === 'stored') {
      setDownloadProgress(100)
      setStatusState({ key: 'modelStored' })
      return
    }

    const loaded = modelProgress.displayLoaded ?? modelProgress.loaded
    const total = modelProgress.displayTotal ?? modelProgress.total

    if (total) {
      const percent = Math.min(99, Math.round((loaded / total) * 100))
      setDownloadProgress(percent)
      setStatusState({
        key: 'downloading',
        loaded,
        total,
      })
      return
    }

    setDownloadProgress(null)
    setStatusState({
      key: 'downloading',
      loaded,
      total: null,
    })
  }

  async function handleExport() {
    if (!originalImage || !mask) {
      return
    }

    setStatusState({ key: 'exporting' })

    try {
      const blob = await exportTransparentPng(originalImage, mask, previewBackground)
      downloadBlob(blob, `${fileName}-transparent.png`)
      setStatusState({ key: 'exported' })
    } catch (error) {
      showError(error instanceof Error ? error.message : copy.errors.exportFailed)
    }
  }

  function resetProcessingState() {
    setErrorMessage('')
    setDownloadProgress(null)
    setCompletedSteps([])
    setActiveStep(null)
    setMask(null)
    maskRef.current = null
    resetLocalHistory()
    setStatusState({ key: 'idle' })
  }

  function showError(message: string) {
    setStage('error')
    setErrorMessage(message)
    setStatusState({ key: 'error' })
    setAiState({ loading: false })
  }

  function markStepDone(step: ProcessStep) {
    setCompletedSteps((current) => (current.includes(step) ? current : [...current, step]))
  }

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setIsDragging(false)
  }

  async function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files[0]
    if (file) {
      await processFile(file)
    }
  }

  return (
    <main className="experience-shell">
      <section className="intro-panel">
        <div className="intro-top">
          <div className="brand-mark">
            <Sparkles size={18} />
            <span>{copy.brand}</span>
          </div>
          <div className="top-controls">
            <LocaleSwitcher />
            <ThemeSwitcher />
          </div>
        </div>

        <div className="intro-copy">
          <h1>{copy.introTitle}</h1>
          <p>{copy.introDescription}</p>
        </div>

        <label className="model-select">
          <span>{copy.models.label}</span>
          <select
            value={selectedModel}
            disabled={aiState.loading}
            onChange={(event) => setSelectedModel(event.target.value as SelectableSegmentationModelName)}
          >
            {SEGMENTATION_MODELS.map((modelName) => (
              <option value={modelName} key={modelName}>
                {copy.models.options[modelName].name}
              </option>
            ))}
          </select>
          <small>{selectedModelCopy.description}</small>
        </label>

        <label
          className="upload-card"
          data-dragging={isDragging}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
          />
          <span className="upload-icon">
            <UploadCloud size={26} />
          </span>
          <strong>{isDragging ? copy.upload.dragging : copy.upload.idle}</strong>
          <span>{copy.upload.hint}</span>
        </label>

        <div className="trust-grid">
          <div>
            <ShieldCheck size={18} />
            <span>{copy.trust.noUpload}</span>
          </div>
          <div>
            <Cpu size={18} />
            <span>{copy.trust.webgpu}</span>
          </div>
          <div>
            <HardDriveDownload size={18} />
            <span>{copy.trust.cache}</span>
          </div>
        </div>

        <div className="action-row">
          <button type="button" data-variant="primary" onClick={() => fileInputRef.current?.click()} disabled={aiState.loading}>
            <ImagePlus size={18} />
            {copy.actions.chooseImage}
          </button>
          <button type="button" onClick={handleRetrySegmentation} disabled={!originalImage || aiState.loading}>
            <RefreshCw size={17} />
            {copy.actions.rerun}
          </button>
        </div>
      </section>

      <section className="work-panel">
        <header className="work-header">
          <div>
            <span>{previewTitle}</span>
            <strong>{originalImage ? fileName : copy.preview.placeholderTitle}</strong>
          </div>
          <button type="button" data-variant="primary" onClick={handleExport} disabled={!canExport}>
            <Download size={18} />
            {copy.actions.download}
          </button>
        </header>

        <div className="edit-toolbar" aria-label={copy.edit.label}>
          <div className="view-mode-switcher" role="group" aria-label={copy.edit.viewMode}>
            <button
              type="button"
              aria-pressed={viewMode === 'preview'}
              data-active={viewMode === 'preview'}
              disabled={!originalImage}
              onClick={() => setViewMode('preview')}
              title={copy.edit.previewMode}
            >
              <Eye size={16} />
              <span>{copy.edit.previewMode}</span>
            </button>
            <button
              type="button"
              aria-pressed={viewMode === 'edit'}
              data-active={viewMode === 'edit'}
              disabled={!originalImage || !mask || aiState.loading}
              onClick={() => setViewMode('edit')}
              title={copy.edit.editMode}
            >
              <Pencil size={16} />
              <span>{copy.edit.editMode}</span>
            </button>
          </div>

          <div className="edit-tool-group">
            {EDIT_TOOLS.map((tool) => {
              const Icon = tool.icon
              const label = copy.edit[tool.id]

              return (
                <button
                  type="button"
                  aria-label={label}
                  aria-pressed={selectedTool === tool.id}
                  data-active={selectedTool === tool.id}
                  disabled={viewMode !== 'edit' || !originalImage || !mask || aiState.loading}
                  key={tool.id}
                  onClick={() => setSelectedTool(tool.id)}
                  title={label}
                >
                  <Icon size={16} />
                </button>
              )
            })}
          </div>

          <label className="brush-control">
            <span>{copy.edit.brushSize}</span>
            <input
              type="range"
              min="6"
              max="96"
              value={brushSize}
              disabled={viewMode !== 'edit' || !originalImage || !mask || aiState.loading || selectedTool === 'pan'}
              style={{ '--brush-fill': `${((brushSize - 6) / 90) * 100}%` } as CSSProperties}
              onChange={(event) => setBrushSize(Number(event.target.value))}
            />
            <span>{brushSize}px</span>
          </label>

          <div className="edit-tool-group">
            <button
              type="button"
              aria-label={copy.edit.undo}
              disabled={!mask || undoStack.length === 0 || aiState.loading}
              onClick={handleUndo}
              title={copy.edit.undo}
            >
              <Undo2 size={16} />
            </button>
            <button
              type="button"
              aria-label={copy.edit.redo}
              disabled={!mask || redoStack.length === 0 || aiState.loading}
              onClick={handleRedo}
              title={copy.edit.redo}
            >
              <Redo2 size={16} />
            </button>
          </div>

          <div className="edit-tool-group">
            <button
              type="button"
              aria-label={copy.edit.zoomOut}
              disabled={!originalImage}
              onClick={() => setZoom(Math.max(0.35, Number((zoom - 0.15).toFixed(2))))}
              title={copy.edit.zoomOut}
            >
              <Minus size={16} />
            </button>
            <button
              type="button"
              aria-label={copy.edit.zoomIn}
              disabled={!originalImage}
              onClick={() => setZoom(Math.min(4, Number((zoom + 0.15).toFixed(2))))}
              title={copy.edit.zoomIn}
            >
              <ZoomIn size={16} />
            </button>
            <button
              type="button"
              aria-label={copy.edit.resetView}
              disabled={!originalImage}
              onClick={() => {
                setZoom(1)
                setOffset({ x: 0, y: 0 })
              }}
              title={copy.edit.resetView}
            >
              <RotateCcw size={16} />
            </button>
          </div>

          <div className="background-picker" ref={backgroundMenuRef}>
            <button
              type="button"
              className="background-trigger"
              aria-label={copy.edit.background}
              aria-expanded={backgroundMenuOpen}
              aria-haspopup="dialog"
              disabled={!originalImage}
              onClick={() => setBackgroundMenuOpen((current) => !current)}
              title={copy.edit.background}
            >
              <Palette size={16} />
            </button>
            {backgroundMenuOpen && (
              <div className="background-popover">
                <div className="background-swatch-grid">
                  {PREVIEW_BACKGROUNDS.map((background) => (
                    <button
                      type="button"
                      aria-label={copy.edit.backgroundOption(background)}
                      aria-pressed={previewBackground === background}
                      data-active={previewBackground === background}
                      key={background}
                      onClick={() => setPreviewBackground(background)}
                      style={{ '--swatch': background === 'transparent' ? 'transparent' : background } as CSSProperties}
                      title={copy.edit.backgroundOption(background)}
                    />
                  ))}
                </div>
                <label className="custom-color-control">
                  <span>{copy.edit.customBackground}</span>
                  <input
                    type="color"
                    value={previewBackground === 'transparent' ? '#ffffff' : previewBackground}
                    onChange={(event) => setPreviewBackground(event.target.value)}
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        <div className="preview-frame">
          <EditorCanvas
            image={originalImage}
            mask={mask}
            brushHardness={brushHardness}
            brushSize={brushSize}
            editable={Boolean(viewMode === 'edit' && originalImage && mask && stage !== 'processing')}
            offset={offset}
            previewBackground={previewBackground}
            tool={selectedTool}
            zoom={zoom}
            onMaskEditEnd={handleMaskEditEnd}
            onMaskEditStart={handleMaskEditStart}
            onOffsetChange={setOffset}
            onStroke={handleCanvasStroke}
          />
          {!originalImage && (
            <div className="preview-empty">
              <UploadCloud size={32} />
              <strong>{copy.preview.placeholderTitle}</strong>
              <span>{copy.preview.placeholderSubtitle}</span>
            </div>
          )}
          {stage === 'processing' && (
            <div className="processing-badge">
              <LoaderCircle className="spin" size={16} />
              {copy.preview.processingBadge}
            </div>
          )}
        </div>

        <div className="process-panel" data-tone={stage === 'error' ? 'error' : 'normal'}>
          <div className="status-head">
            <div>
              <span>{copy.process.label}</span>
              <strong>
                {stage === 'ready'
                  ? copy.process.ready
                  : stage === 'error'
                    ? copy.process.error
                    : stage === 'processing'
                      ? copy.process.running
                      : copy.process.waiting}
              </strong>
            </div>
            {stage === 'ready' && <CheckCircle2 size={22} />}
            {stage === 'error' && <AlertCircle size={22} />}
            {stage === 'processing' && <LoaderCircle className="spin" size={22} />}
          </div>

          <p className="status-message">{statusText}</p>
          {errorMessage && <p className="error-message">{errorMessage}</p>}

          <div className="steps">
            {stepItems.map((step) => (
              <div className="step-item" data-state={step.state} key={step.id}>
                <span className="step-dot">
                  {step.state === 'done' && <CheckCircle2 size={15} />}
                  {step.state === 'active' && <LoaderCircle className="spin" size={15} />}
                  {step.state === 'error' && <AlertCircle size={15} />}
                </span>
                <span>
                  <strong>{step.label}</strong>
                  <small>{step.detail}</small>
                </span>
              </div>
            ))}
          </div>

          {activeStep === 'model' && (
            <div className="progress-block">
              <div className="progress-label">
                <span>{copy.process.modelCache}</span>
                <span>{downloadProgress === null ? '...' : `${downloadProgress}%`}</span>
              </div>
              <div className="progress-track">
                <span style={{ width: `${downloadProgress ?? 38}%` }} />
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

function buildStepItems(
  copy: (typeof MESSAGES)[Locale],
  completedSteps: ProcessStep[],
  activeStep: ProcessStep | null,
  stage: FlowStage,
) {
  return STEP_ORDER.map((id) => {
    const base = copy.steps[id]
    let state: StepState = 'pending'

    if (stage === 'error' && activeStep === id) {
      state = 'error'
    } else if (completedSteps.includes(id)) {
      state = 'done'
    } else if (activeStep === id) {
      state = 'active'
    }

    return {
      id,
      label: base.label,
      detail: base.detail,
      state,
    }
  })
}

function formatStatus(copy: (typeof MESSAGES)[Locale], locale: Locale, state: StatusState) {
  const formatter = new Intl.NumberFormat(locale === 'zh' ? 'zh-CN' : 'en-US')

  switch (state.key) {
    case 'idle':
      return copy.status.idle
    case 'readingImage':
      return copy.status.readingImage
    case 'preparingModel':
      return copy.status.preparingModel(state.model)
    case 'modelCacheHit':
      return copy.status.modelCacheHit
    case 'modelStored':
      return copy.status.modelStored
    case 'downloading':
      return copy.status.downloading(formatBytes(state.loaded, formatter), state.total ? formatBytes(state.total, formatter) : null)
    case 'inferenceRunning':
      return copy.status.inferenceRunning
    case 'previewGenerating':
      return copy.status.previewGenerating
    case 'done':
      return copy.status.done
    case 'exporting':
      return copy.status.exporting
    case 'exported':
      return copy.status.exported
    case 'error':
      return copy.status.error
  }
}

function formatBytes(bytes: number, formatter: Intl.NumberFormat) {
  if (bytes < 1024 * 1024) {
    return `${formatter.format(Math.max(1, Math.round(bytes / 1024)))} KB`
  }

  return `${formatter.format(Number((bytes / 1024 / 1024).toFixed(1)))} MB`
}

function cloneMask(mask: MaskBitmap): MaskBitmap {
  return {
    ...mask,
    data: new Uint8ClampedArray(mask.data),
  }
}

function hasMaskChanged(before: MaskBitmap, after: MaskBitmap) {
  if (before.width !== after.width || before.height !== after.height || before.data.length !== after.data.length) {
    return true
  }

  for (let i = 0; i < before.data.length; i += 1) {
    if (before.data[i] !== after.data[i]) {
      return true
    }
  }

  return false
}
