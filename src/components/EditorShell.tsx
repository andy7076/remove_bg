'use client'

import {
  AlertCircle,
  CheckCircle2,
  Cpu,
  Download,
  HardDriveDownload,
  ImagePlus,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UploadCloud,
} from 'lucide-react'
import { ChangeEvent, DragEvent, useMemo, useRef, useState } from 'react'
import { runBirefNet, type BirefNetProgress } from '@/ai/birefnet/runBirefNet'
import { MODEL_REGISTRY } from '@/ai/modelRegistry'
import { LocaleSwitcher } from '@/components/LocaleSwitcher'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
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

export function EditorShell() {
  const { locale } = useLocale()
  const copy = MESSAGES[locale]
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const originalImage = useEditorStore((state) => state.originalImage)
  const aiState = useEditorStore((state) => state.aiState)
  const setOriginalImage = useEditorStore((state) => state.setOriginalImage)
  const setAiState = useEditorStore((state) => state.setAiState)
  const resetHistory = useEditorStore((state) => state.resetHistory)
  const [mask, setMask] = useState<MaskBitmap | null>(null)
  const [stage, setStage] = useState<FlowStage>('idle')
  const [activeStep, setActiveStep] = useState<ProcessStep | null>(null)
  const [completedSteps, setCompletedSteps] = useState<ProcessStep[]>([])
  const [statusState, setStatusState] = useState<StatusState>({ key: 'idle' })
  const [errorMessage, setErrorMessage] = useState('')
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null)
  const [fileName, setFileName] = useState('transparent-image')
  const [isDragging, setIsDragging] = useState(false)

  const canExport = Boolean(originalImage && mask && stage === 'ready' && !aiState.loading)
  const modelLabel = useMemo(() => MODEL_REGISTRY.birefnet.name, [])
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
    resetHistory()

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
      const result = await runBirefNet(inferenceBitmap, handleBirefNetProgress)
      markStepDone('inference')
      setActiveStep('preview')
      setStatusState({ key: 'previewGenerating' })
      setMask(result)
      markStepDone('preview')
      setActiveStep(null)
      setStage('ready')
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
    setCompletedSteps(['decode'])
    setDownloadProgress(null)
    setErrorMessage('')
    setMask(createOpaqueMask(originalImage.width, originalImage.height))
    await runSegmentation(originalImage)
  }

  function handleBirefNetProgress(progress: BirefNetProgress) {
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

    if (modelProgress.total) {
      const percent = Math.min(99, Math.round((modelProgress.loaded / modelProgress.total) * 100))
      setDownloadProgress(percent)
      setStatusState({
        key: 'downloading',
        loaded: modelProgress.loaded,
        total: modelProgress.total,
      })
      return
    }

    setDownloadProgress(null)
    setStatusState({
      key: 'downloading',
      loaded: modelProgress.loaded,
      total: null,
    })
  }

  async function handleExport() {
    if (!originalImage || !mask) {
      return
    }

    setStatusState({ key: 'exporting' })

    try {
      const blob = await exportTransparentPng(originalImage, mask)
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

        <div className="preview-frame">
          <EditorCanvas image={originalImage} mask={mask} />
          {!originalImage && (
            <div className="preview-empty">
              <UploadCloud size={32} />
              <strong>{copy.preview.placeholderTitle}</strong>
              <span>{copy.preview.placeholderSubtitle}</span>
            </div>
          )}
          {stage === 'processing' && (
            <div className="processing-badge">
              <LoaderCircle size={16} />
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
