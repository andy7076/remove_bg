import * as ort from 'onnxruntime-web/webgpu'
import type { ModelNormalization } from '@/ai/modelRegistry'

export type SegmentationInferenceInput = {
  image: ImageBitmap
  model: ArrayBuffer
  modelKey?: string
  inputSize: number
  normalization?: ModelNormalization
}

export type BirefNetInput = SegmentationInferenceInput

let loadedSession: { key: string; session: ort.InferenceSession } | null = null

export async function runSegmentationInference({ image, model, modelKey, inputSize, normalization }: SegmentationInferenceInput): Promise<{
  width: number
  height: number
  mask: Uint8ClampedArray
}> {
  const sessionKey = modelKey ?? `${inputSize}:${model.byteLength}`

  if (loadedSession?.key !== sessionKey) {
    ort.env.wasm.numThreads = Math.max(1, Math.min(4, navigator.hardwareConcurrency || 1))
    ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/'
    loadedSession = {
      key: sessionKey,
      session: await ort.InferenceSession.create(model, {
      executionProviders: ['webgpu'],
      graphOptimizationLevel: 'all',
      }),
    }
  }

  const session = loadedSession.session
  const { tensor, sourceWidth, sourceHeight } = preprocessImage(image, inputSize, normalization)
  const inputName = session.inputNames[0]
  const output = await session.run({ [inputName]: tensor })
  const outputName = session.outputNames[0]
  const result = output[outputName]
  const matte = tensorToMask(result.data, result.dims, inputSize, sourceWidth, sourceHeight)

  image.close()

  return {
    width: sourceWidth,
    height: sourceHeight,
    mask: matte,
  }
}

export const runBirefNetInference = runSegmentationInference

function preprocessImage(image: ImageBitmap, size: number, normalization?: ModelNormalization) {
  const canvas = new OffscreenCanvas(size, size)
  const context = canvas.getContext('2d', { willReadFrequently: true })

  if (!context) {
    throw new Error('OffscreenCanvas 2D context is unavailable in worker.')
  }

  context.clearRect(0, 0, size, size)
  context.drawImage(image, 0, 0, size, size)

  const pixels = context.getImageData(0, 0, size, size).data
  const plane = size * size
  const input = new Float32Array(3 * plane)
  const mean = normalization?.mean ?? [0.485, 0.456, 0.406]
  const std = normalization?.std ?? [0.229, 0.224, 0.225]

  for (let i = 0, p = 0; i < pixels.length; i += 4, p += 1) {
    input[p] = pixels[i] / 255 / std[0] - mean[0] / std[0]
    input[p + plane] = pixels[i + 1] / 255 / std[1] - mean[1] / std[1]
    input[p + plane * 2] = pixels[i + 2] / 255 / std[2] - mean[2] / std[2]
  }

  return {
    sourceWidth: image.width,
    sourceHeight: image.height,
    tensor: new ort.Tensor('float32', input, [1, 3, size, size]),
  }
}

function tensorToMask(data: ort.Tensor['data'], dims: readonly number[], fallbackSize: number, width: number, height: number) {
  const values = numericData(data)
  const outputWidth = dims.length >= 2 ? dims[dims.length - 1] : fallbackSize
  const outputHeight = dims.length >= 3 ? dims[dims.length - 2] : fallbackSize
  const alpha = new Uint8ClampedArray(outputWidth * outputHeight * 4)
  const count = Math.min(values.length, outputWidth * outputHeight)
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY

  for (let i = 0; i < count; i += 1) {
    const value = values[i]
    min = Math.min(min, value)
    max = Math.max(max, value)
  }

  const isProbability = min >= 0 && max <= 1

  for (let i = 0, p = 0; i < count; i += 1, p += 4) {
    const value = values[i]
    const probability = isProbability ? value : sigmoid(value)
    const channel = Math.max(0, Math.min(255, Math.round(probability * 255)))
    alpha[p] = channel
    alpha[p + 1] = channel
    alpha[p + 2] = channel
    alpha[p + 3] = 255
  }

  const small = new OffscreenCanvas(outputWidth, outputHeight)
  const smallContext = small.getContext('2d')
  if (!smallContext) {
    throw new Error('Mask canvas context is unavailable.')
  }

  smallContext.putImageData(new ImageData(alpha, outputWidth, outputHeight), 0, 0)

  const full = new OffscreenCanvas(width, height)
  const fullContext = full.getContext('2d', { willReadFrequently: true })
  if (!fullContext) {
    throw new Error('Output mask canvas context is unavailable.')
  }

  fullContext.imageSmoothingEnabled = true
  fullContext.imageSmoothingQuality = 'high'
  fullContext.drawImage(small, 0, 0, width, height)

  const resized = fullContext.getImageData(0, 0, width, height).data
  const mask = new Uint8ClampedArray(width * height)

  for (let i = 0, p = 0; i < resized.length; i += 4, p += 1) {
    mask[p] = resized[i]
  }

  return mask
}

function sigmoid(value: number) {
  return 1 / (1 + Math.exp(-value))
}

function numericData(data: ort.Tensor['data']): ArrayLike<number> {
  if (typeof data[0] !== 'number') {
    throw new Error('BiRefNet returned a non-numeric tensor.')
  }

  return data as ArrayLike<number>
}
