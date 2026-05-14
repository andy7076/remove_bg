'use client'

import { useEffect, useRef } from 'react'
import { Application, Sprite, Texture } from 'pixi.js'
import type { MaskBitmap } from '@/types/editor'
import { maskToCanvas } from '@/utils/mask'

type EditorCanvasProps = {
  image: ImageBitmap | null
  mask: MaskBitmap | null
}

export function EditorCanvas({ image, mask }: EditorCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const appRef = useRef<Application | null>(null)
  const imageSpriteRef = useRef<Sprite | null>(null)
  const maskSpriteRef = useRef<Sprite | null>(null)
  const destroyedRef = useRef(false)

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
      })
      .catch((error) => {
        if (!destroyed) {
          console.error('Failed to initialize Pixi application.', error)
        }
      })

    return () => {
      destroyed = true
      destroyedRef.current = true
      imageSpriteRef.current = null
      maskSpriteRef.current = null
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
        target.destroy(true, { children: true, texture: true })
      } catch (error) {
        console.error('Failed to destroy Pixi application.', error)
      }
    }
  }, [])

  useEffect(() => {
    const app = appRef.current
    if (destroyedRef.current || !app || !app.stage || !app.renderer || !image) {
      return
    }

    const previousImage = imageSpriteRef.current
    const previousMask = maskSpriteRef.current
    if (previousImage) {
      previousImage.destroy({ texture: true })
    }
    if (previousMask) {
      previousMask.destroy({ texture: true })
    }
    imageSpriteRef.current = null
    maskSpriteRef.current = null

    const imageSprite = new Sprite(Texture.from(image))
    imageSprite.anchor.set(0.5)
    imageSpriteRef.current = imageSprite
    app.stage.addChild(imageSprite)
    fitSprites()
  }, [image])

  useEffect(() => {
    const app = appRef.current
    const imageSprite = imageSpriteRef.current
    if (destroyedRef.current || !app || !app.stage || !imageSprite || imageSprite.destroyed || !mask) {
      return
    }

    const previousMask = maskSpriteRef.current
    if (previousMask) {
      previousMask.destroy({ texture: true })
      maskSpriteRef.current = null
    }

    const maskCanvas = maskToCanvas(mask)
    const maskSprite = new Sprite(Texture.from(maskCanvas))
    maskSprite.anchor.set(0.5)
    maskSpriteRef.current = maskSprite
    imageSprite.mask = maskSprite
    app.stage.addChild(maskSprite)
    fitSprites()
  }, [mask])

  useEffect(() => {
    const host = hostRef.current
    if (!host) {
      return
    }

    const observer = new ResizeObserver(() => fitSprites())
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

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
    const scale = Math.min(screenWidth / sourceWidth, screenHeight / sourceHeight) * 0.88
    const x = screenWidth / 2
    const y = screenHeight / 2

    imageSprite.scale.set(scale)
    imageSprite.position.set(x, y)

    const maskSprite = maskSpriteRef.current
    if (maskSprite && !maskSprite.destroyed) {
      maskSprite.scale.set(scale)
      maskSprite.position.set(x, y)
    }
  }

  return <div ref={hostRef} className="pixi-stage" />
}
