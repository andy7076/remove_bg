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

  useEffect(() => {
    const host = hostRef.current
    if (!host) {
      return
    }

    let destroyed = false
    const app = new Application()
    appRef.current = app

    app
      .init({
        resizeTo: host,
        antialias: true,
        backgroundAlpha: 0,
        preference: 'webgpu',
      })
      .then(() => {
        if (destroyed) {
          app.destroy(true)
          return
        }

        host.appendChild(app.canvas)
        app.canvas.style.width = '100%'
        app.canvas.style.height = '100%'
      })

    return () => {
      destroyed = true
      imageSpriteRef.current = null
      maskSpriteRef.current = null
      app.destroy(true, { children: true, texture: true })
      appRef.current = null
    }
  }, [])

  useEffect(() => {
    const app = appRef.current
    if (!app || !image) {
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

    const imageSprite = new Sprite(Texture.from(image))
    imageSprite.anchor.set(0.5)
    imageSpriteRef.current = imageSprite
    app.stage.addChild(imageSprite)
    fitSprites()
  }, [image])

  useEffect(() => {
    const app = appRef.current
    const imageSprite = imageSpriteRef.current
    if (!app || !imageSprite || !mask) {
      return
    }

    const previousMask = maskSpriteRef.current
    if (previousMask) {
      previousMask.destroy({ texture: true })
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
    if (!app || !imageSprite) {
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
    if (maskSprite) {
      maskSprite.scale.set(scale)
      maskSprite.position.set(x, y)
    }
  }

  return <div ref={hostRef} className="pixi-stage" />
}
