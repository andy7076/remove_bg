'use client'

import type { CSSProperties, PointerEvent, WheelEvent } from 'react'
import { useEffect, useRef } from 'react'
import { Application, Graphics, Sprite, Texture } from 'pixi.js'
import type { EditorTool, MaskBitmap, Point } from '@/types/editor'
import { maskToImageData } from '@/utils/mask'

type EditorCanvasProps = {
  image: ImageBitmap | null
  mask: MaskBitmap | null
  brushHardness?: number
  brushSize?: number
  editable?: boolean
  pannable?: boolean
  previewBackground?: string
  offset?: Point
  tool?: EditorTool
  zoom?: number
  onMaskEditEnd?: () => void
  onMaskEditStart?: () => void
  onOffsetChange?: (offset: Point) => void
  onStroke?: (stroke: { x: number; y: number; radius: number; hardness: number; tool: EditorTool }) => void
  onZoomChange?: (zoom: number) => void
}

const MIN_ZOOM = 0.35
const MAX_ZOOM = 4
const WHEEL_ZOOM_SPEED = 0.001

export function EditorCanvas({
  image,
  mask,
  brushHardness = 0.85,
  brushSize = 36,
  editable = false,
  pannable = false,
  previewBackground = 'transparent',
  offset = { x: 0, y: 0 },
  tool = 'erase',
  zoom = 1,
  onMaskEditEnd,
  onMaskEditStart,
  onOffsetChange,
  onStroke,
  onZoomChange,
}: EditorCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const overlayRef = useRef<HTMLCanvasElement | null>(null)
  const appRef = useRef<Application | null>(null)
  const backgroundRef = useRef<Graphics | null>(null)
  const borderRef = useRef<Graphics | null>(null)
  const imageSpriteRef = useRef<Sprite | null>(null)
  const maskSpriteRef = useRef<Sprite | null>(null)
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const maskTextureRef = useRef<Texture | null>(null)
  const destroyedRef = useRef(false)
  const interactionRef = useRef<
    | { type: 'idle' }
    | { type: 'paint'; pointerId: number }
    | { type: 'pan'; pointerId: number; startX: number; startY: number; startOffset: Point }
  >({ type: 'idle' })
  const cursorRef = useRef<Point | null>(null)
  const imageRef = useRef<ImageBitmap | null>(image)
  const maskRef = useRef<MaskBitmap | null>(mask)
  const offsetRef = useRef(offset)
  const zoomRef = useRef(zoom)
  const previewBackgroundRef = useRef(previewBackground)
  const resizeFrameRef = useRef(0)

  useEffect(() => {
    offsetRef.current = offset
    zoomRef.current = zoom
    previewBackgroundRef.current = previewBackground
    scheduleFitSprites()
  }, [offset, zoom, previewBackground])

  useEffect(() => {
    const host = hostRef.current
    if (!host) {
      return
    }

    let destroyed = false
    let initialized = false
    let appDestroyed = false
    const app = new Application()
    destroyedRef.current = false
    appRef.current = app

    const initPromise = app
      .init({
        resizeTo: host,
        antialias: true,
        backgroundAlpha: 0,
        preference: 'webgpu',
      })
      .then(() => {
        initialized = true
        if (destroyed) {
          destroyPixiApplication(app)
          return
        }

        host.appendChild(app.canvas)
        app.canvas.style.width = '100%'
        app.canvas.style.height = '100%'
        syncPixiScene()
      })
      .catch((error) => {
        if (!destroyed) {
          console.error('Failed to initialize Pixi application.', error)
        }
      })

    return () => {
      destroyed = true
      destroyedRef.current = true
      cancelAnimationFrame(resizeFrameRef.current)
      destroyScene()
      backgroundRef.current = null
      borderRef.current = null
      imageSpriteRef.current = null
      maskSpriteRef.current = null
      maskCanvasRef.current = null
      maskTextureRef.current = null
      appRef.current = null
      if (initialized) {
        destroyPixiApplication(app)
        return
      }

      initPromise.then(() => destroyPixiApplication(app)).catch(() => undefined)
    }

    function destroyPixiApplication(target: Application) {
      if (appDestroyed) {
        return
      }

      appDestroyed = true
      try {
        target.destroy(true, { children: true, texture: false })
      } catch (error) {
        console.error('Failed to destroy Pixi application.', error)
      }
    }
  }, [])

  useEffect(() => {
    imageRef.current = image
    syncPixiScene()
  }, [image])

  useEffect(() => {
    maskRef.current = mask
    syncMaskSprite()
    scheduleFitSprites()
  }, [mask])

  useEffect(() => {
    const host = hostRef.current
    if (!host) {
      return
    }

    const observer = new ResizeObserver(() => scheduleFitSprites())
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!editable || !image || !mask) {
      clearOverlay()
      return
    }

    let animation = 0

    const draw = () => {
      drawOverlay()
      animation = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animation)
  }, [editable, image, mask, brushSize, tool, zoom, offset])

  function syncPixiScene() {
    const app = appRef.current
    if (destroyedRef.current || !app || !app.stage || !app.renderer) {
      return
    }

    destroyScene()

    const currentImage = imageRef.current
    if (!currentImage) {
      return
    }

    const background = new Graphics()
    backgroundRef.current = background
    app.stage.addChild(background)

    const imageSprite = new Sprite(Texture.from(currentImage))
    imageSprite.anchor.set(0.5)
    imageSpriteRef.current = imageSprite
    app.stage.addChild(imageSprite)

    const border = new Graphics()
    borderRef.current = border
    app.stage.addChild(border)

    syncMaskSprite()
    scheduleFitSprites()
  }

  function syncMaskSprite() {
    const app = appRef.current
    const imageSprite = imageSpriteRef.current
    if (destroyedRef.current || !app || !app.stage || !imageSprite || imageSprite.destroyed) {
      return
    }

    const currentMask = maskRef.current
    if (!currentMask) {
      if (maskSpriteRef.current) {
        maskSpriteRef.current.destroy({ texture: true })
        maskSpriteRef.current = null
        maskTextureRef.current = null
      }
      imageSprite.mask = null
      return
    }

    const maskCanvas = ensureMaskCanvas(currentMask)
    const existingMask = maskSpriteRef.current
    if (existingMask && maskTextureRef.current && !existingMask.destroyed) {
      updateMaskCanvas(maskCanvas, currentMask)
      maskTextureRef.current.source.update()
      maskTextureRef.current.update()
      imageSprite.mask = existingMask
      app.stage.addChild(existingMask)
    } else {
      updateMaskCanvas(maskCanvas, currentMask)
      const maskTexture = Texture.from(maskCanvas, true)
      const maskSprite = new Sprite(maskTexture)
      maskSprite.anchor.set(0.5)
      maskSpriteRef.current = maskSprite
      maskTextureRef.current = maskTexture
      imageSprite.mask = maskSprite
      app.stage.addChild(maskSprite)
    }

    if (borderRef.current) {
      app.stage.addChild(borderRef.current)
    }
  }

  function ensureMaskCanvas(currentMask: MaskBitmap) {
    const currentCanvas = maskCanvasRef.current
    if (currentCanvas && currentCanvas.width === currentMask.width && currentCanvas.height === currentMask.height) {
      return currentCanvas
    }

    if (maskSpriteRef.current) {
      maskSpriteRef.current.destroy({ texture: true })
      maskSpriteRef.current = null
      maskTextureRef.current = null
    }

    const canvas = document.createElement('canvas')
    canvas.width = currentMask.width
    canvas.height = currentMask.height
    maskCanvasRef.current = canvas
    return canvas
  }

  function updateMaskCanvas(canvas: HTMLCanvasElement, currentMask: MaskBitmap) {
    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    context.putImageData(maskToImageData(currentMask), 0, 0)
  }

  function destroyScene() {
    const previousImage = imageSpriteRef.current
    const previousMask = maskSpriteRef.current
    const previousBackground = backgroundRef.current
    const previousBorder = borderRef.current

    if (previousBackground) {
      previousBackground.destroy()
    }
    if (previousBorder) {
      previousBorder.destroy()
    }
    if (previousImage) {
      previousImage.destroy({ texture: false })
    }
    if (previousMask) {
      previousMask.destroy({ texture: true })
    }

    backgroundRef.current = null
    borderRef.current = null
    imageSpriteRef.current = null
    maskSpriteRef.current = null
    maskTextureRef.current = null
  }

  function fitSprites() {
    const app = appRef.current
    const imageSprite = imageSpriteRef.current
    if (destroyedRef.current || !app || !app.renderer || !imageSprite || imageSprite.destroyed || !imageSprite.texture) {
      return
    }

    const screenWidth = app.renderer.width
    const screenHeight = app.renderer.height
    const sourceWidth = imageSprite.texture.width
    const sourceHeight = imageSprite.texture.height
    if (screenWidth <= 0 || screenHeight <= 0 || sourceWidth <= 0 || sourceHeight <= 0) {
      return
    }

    const scale = Math.min(screenWidth / sourceWidth, screenHeight / sourceHeight) * 0.88 * zoomRef.current
    const x = screenWidth / 2 + offsetRef.current.x
    const y = screenHeight / 2 + offsetRef.current.y

    imageSprite.scale.set(scale)
    imageSprite.position.set(x, y)

    const maskSprite = maskSpriteRef.current
    if (maskSprite && !maskSprite.destroyed) {
      maskSprite.scale.set(scale)
      maskSprite.position.set(x, y)
    }

    drawImageBounds(x, y, sourceWidth * scale, sourceHeight * scale)
  }

  function scheduleFitSprites() {
    cancelAnimationFrame(resizeFrameRef.current)
    resizeFrameRef.current = requestAnimationFrame(() => {
      fitSprites()
      requestAnimationFrame(() => fitSprites())
    })
  }

  function drawImageBounds(centerX: number, centerY: number, width: number, height: number) {
    const background = backgroundRef.current
    const border = borderRef.current
    if (!background || !border || background.destroyed || border.destroyed) {
      return
    }

    const x = centerX - width / 2
    const y = centerY - height / 2

    background.clear()
    if (previewBackgroundRef.current !== 'transparent') {
      background.rect(x, y, width, height).fill(parseColor(previewBackgroundRef.current))
    }

    border.clear()
    border.rect(x, y, width, height).stroke({
      color: 0x0f172a,
      alpha: 0.28,
      width: 1,
    })
  }

  function drawOverlay() {
    const canvas = overlayRef.current
    const host = hostRef.current
    if (!canvas || !host || !image || !mask) {
      return
    }

    const rect = host.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    const width = Math.max(1, Math.round(rect.width * dpr))
    const height = Math.max(1, Math.round(rect.height * dpr))

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }

    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`

    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    context.setTransform(dpr, 0, 0, dpr, 0, 0)
    context.clearRect(0, 0, rect.width, rect.height)

    const transform = imageTransform(rect.width, rect.height, image.width, image.height)
    const step = Math.max(1, Math.floor(Math.max(mask.width, mask.height) / 700))
    for (let y = step; y < mask.height - step; y += step) {
      for (let x = step; x < mask.width - step; x += step) {
        const index = y * mask.width + x
        if (mask.data[index] < 128) {
          continue
        }

        const edge =
          mask.data[index - step] < 128 ||
          mask.data[index + step] < 128 ||
          mask.data[index - step * mask.width] < 128 ||
          mask.data[index + step * mask.width] < 128

        if (!edge) {
          continue
        }

        const screen = imageToScreen({ x, y }, transform)
        const alternate = Math.floor((x + y) / 9) % 2 === 0
        context.fillStyle = alternate ? 'rgba(255, 233, 74, 0.95)' : 'rgba(14, 18, 24, 0.9)'
        context.fillRect(screen.x, screen.y, Math.max(1.6, step * transform.scale), Math.max(1.6, step * transform.scale))
      }
    }

    if (cursorRef.current && tool !== 'pan') {
      const screen = imageToScreen(cursorRef.current, transform)
      context.beginPath()
      context.arc(screen.x, screen.y, brushRadiusForTool() * transform.scale, 0, Math.PI * 2)
      context.lineWidth = 1.5
      context.strokeStyle = 'rgba(255, 255, 255, 0.9)'
      context.stroke()
      context.setLineDash([4, 4])
      context.strokeStyle = 'rgba(16, 19, 24, 0.75)'
      context.stroke()
      context.setLineDash([])
    }
  }

  function clearOverlay() {
    const canvas = overlayRef.current
    const context = canvas?.getContext('2d')
    if (canvas && context) {
      context.clearRect(0, 0, canvas.width, canvas.height)
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (!image || (tool !== 'pan' && (!editable || !mask)) || (tool === 'pan' && !pannable)) {
      return
    }

    event.currentTarget.setPointerCapture(event.pointerId)

    if (tool === 'pan') {
      interactionRef.current = {
        type: 'pan',
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startOffset: offsetRef.current,
      }
      return
    }

    onMaskEditStart?.()
    interactionRef.current = { type: 'paint', pointerId: event.pointerId }
    applyPointerStroke(event)
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (!image || (!editable && !(tool === 'pan' && pannable))) {
      return
    }

    const point = eventToImagePoint(event)
    cursorRef.current = point

    const interaction = interactionRef.current
    if (interaction.type === 'paint' && interaction.pointerId === event.pointerId) {
      applyPointerStroke(event)
      return
    }

    if (interaction.type === 'pan' && interaction.pointerId === event.pointerId) {
      onOffsetChange?.({
        x: interaction.startOffset.x + event.clientX - interaction.startX,
        y: interaction.startOffset.y + event.clientY - interaction.startY,
      })
    }
  }

  function handleWheel(event: WheelEvent<HTMLCanvasElement>) {
    if (!image || !onZoomChange) {
      return
    }

    event.preventDefault()

    const host = hostRef.current
    if (!host) {
      return
    }

    const rect = host.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) {
      return
    }

    const currentZoom = zoomRef.current
    const wheelScale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1
    const nextZoom = clampZoom(currentZoom * Math.exp(-event.deltaY * wheelScale * WHEEL_ZOOM_SPEED))
    if (nextZoom === currentZoom) {
      return
    }

    const sourceWidth = image.width
    const sourceHeight = image.height
    const baseScale = Math.min(rect.width / sourceWidth, rect.height / sourceHeight) * 0.88
    const pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top }
    const currentCenter = {
      x: rect.width / 2 + offsetRef.current.x,
      y: rect.height / 2 + offsetRef.current.y,
    }
    const zoomRatio = nextZoom / currentZoom
    const nextCenter = {
      x: pointer.x - (pointer.x - currentCenter.x) * zoomRatio,
      y: pointer.y - (pointer.y - currentCenter.y) * zoomRatio,
    }

    if (Number.isFinite(baseScale) && baseScale > 0) {
      onOffsetChange?.({
        x: nextCenter.x - rect.width / 2,
        y: nextCenter.y - rect.height / 2,
      })
    }
    onZoomChange(nextZoom)
  }

  function handlePointerUp(event: PointerEvent<HTMLCanvasElement>) {
    const interaction = interactionRef.current
    if (interaction.type === 'idle' || interaction.pointerId !== event.pointerId) {
      return
    }

    if (interaction.type === 'paint') {
      onMaskEditEnd?.()
    }

    if (interactionRef.current.type !== 'idle') {
      interactionRef.current = { type: 'idle' }
    }
  }

  function handlePointerLeave() {
    cursorRef.current = null
  }

  function handleLostPointer(event: PointerEvent<HTMLCanvasElement>) {
    handlePointerUp(event)
    cursorRef.current = null
  }

  function applyPointerStroke(event: PointerEvent<HTMLCanvasElement>) {
    const point = eventToImagePoint(event)
    if (!point || !image || !isInsideImage(point)) {
      return
    }

    onStroke?.({
      x: point.x,
      y: point.y,
      radius: brushRadiusForTool(),
      hardness: brushHardness,
      tool,
    })
  }

  function eventToImagePoint(event: PointerEvent<HTMLCanvasElement>) {
    if (!image) {
      return null
    }

    const host = hostRef.current
    if (!host) {
      return null
    }

    const rect = host.getBoundingClientRect()
    return screenToImage({ x: event.clientX - rect.left, y: event.clientY - rect.top }, imageTransform(rect.width, rect.height, image.width, image.height))
  }

  function brushRadiusForTool() {
    return brushSize / 2
  }

  function isInsideImage(point: Point) {
    return Boolean(image && point.x >= 0 && point.y >= 0 && point.x < image.width && point.y < image.height)
  }

  function imageTransform(screenWidth: number, screenHeight: number, sourceWidth: number, sourceHeight: number) {
    const scale = Math.min(screenWidth / sourceWidth, screenHeight / sourceHeight) * 0.88 * zoomRef.current
    return {
      scale,
      x: screenWidth / 2 + offsetRef.current.x,
      y: screenHeight / 2 + offsetRef.current.y,
      sourceWidth,
      sourceHeight,
    }
  }

  function imageToScreen(point: Point, transform: ReturnType<typeof imageTransform>): Point {
    return {
      x: transform.x + (point.x - transform.sourceWidth / 2) * transform.scale,
      y: transform.y + (point.y - transform.sourceHeight / 2) * transform.scale,
    }
  }

  function screenToImage(point: Point, transform: ReturnType<typeof imageTransform>): Point {
    return {
      x: (point.x - transform.x) / transform.scale + transform.sourceWidth / 2,
      y: (point.y - transform.y) / transform.scale + transform.sourceHeight / 2,
    }
  }

  function clampZoom(value: number) {
    return Number(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value)).toFixed(3))
  }

  function parseColor(value: string) {
    if (!value.startsWith('#')) {
      return 0xffffff
    }

    return Number.parseInt(value.slice(1), 16)
  }

  return (
    <div
      ref={hostRef}
      className="pixi-stage"
      data-background={previewBackground === 'transparent' ? 'checker' : 'solid'}
      style={{ '--preview-surface': previewBackground } as CSSProperties}
    >
      <canvas
        ref={overlayRef}
        className="edit-overlay"
        data-tool={tool}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handleLostPointer}
        onPointerLeave={handlePointerLeave}
        onWheel={handleWheel}
      />
    </div>
  )
}
