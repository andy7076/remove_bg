import { modelManager, type ModelLoadProgress } from '@/ai/ModelManager'
import { MODEL_REGISTRY, type ModelOutputTransform, type SegmentationModelName } from '@/ai/modelRegistry'
import type { MaskBitmap } from '@/types/editor'

type WorkerRequest = {
  id: string
  type: 'segment'
  image: ImageBitmap
  model: ArrayBuffer
  modelKey: string
  inputSize: number
  normalization: {
    mean: readonly [number, number, number]
    std: readonly [number, number, number]
  }
  outputTransform?: ModelOutputTransform
}

type WorkerSuccess = {
  id: string
  type: 'success'
  width: number
  height: number
  mask: ArrayBuffer
}

type WorkerFailure = {
  id: string
  type: 'error'
  message: string
}

type WorkerResponse = WorkerSuccess | WorkerFailure

export type SegmentationProgress =
  | {
      stage: 'model'
      model: ModelLoadProgress
    }
  | {
      stage: 'inference'
    }

let worker: Worker | null = null

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('../worker/segmentation.worker.ts', import.meta.url), { type: 'module' })
  }

  return worker
}

export async function runSegmentationModel(
  modelName: SegmentationModelName,
  image: ImageBitmap,
  onProgress?: (progress: SegmentationProgress) => void,
): Promise<MaskBitmap> {
  const descriptor = MODEL_REGISTRY[modelName]
  const model = await modelManager.load(modelName, (modelProgress) => {
    onProgress?.({ stage: 'model', model: modelProgress })
  })
  const id = crypto.randomUUID()

  onProgress?.({ stage: 'inference' })

  return new Promise((resolve, reject) => {
    const activeWorker = getWorker()

    const handleMessage = (event: MessageEvent<WorkerResponse>) => {
      if (event.data.id !== id) {
        return
      }

      activeWorker.removeEventListener('message', handleMessage)
      activeWorker.removeEventListener('error', handleError)

      if (event.data.type === 'error') {
        reject(new Error(event.data.message))
        return
      }

      resolve({
        width: event.data.width,
        height: event.data.height,
        data: new Uint8ClampedArray(event.data.mask),
      })
    }

    const handleError = (event: ErrorEvent) => {
      activeWorker.removeEventListener('message', handleMessage)
      activeWorker.removeEventListener('error', handleError)
      reject(new Error(event.message))
    }

    const request: WorkerRequest = {
      id,
      type: 'segment',
      image,
      model,
      modelKey: modelManager.keyFor(modelName),
      inputSize: descriptor.inputSize,
      normalization: descriptor.normalization,
      outputTransform: descriptor.outputTransform,
    }
    activeWorker.addEventListener('message', handleMessage)
    activeWorker.addEventListener('error', handleError)
    activeWorker.postMessage(request, [image, model])
  })
}
