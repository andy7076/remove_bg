import { modelManager, type ModelLoadProgress } from '@/ai/ModelManager'
import type { MaskBitmap } from '@/types/editor'

type WorkerRequest = {
  id: string
  type: 'segment'
  image: ImageBitmap
  model: ArrayBuffer
  inputSize: number
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

export type BirefNetProgress =
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
    worker = new Worker(new URL('../worker/birefnet.worker.ts', import.meta.url), { type: 'module' })
  }

  return worker
}

export async function runBirefNet(image: ImageBitmap, onProgress?: (progress: BirefNetProgress) => void): Promise<MaskBitmap> {
  const model = await modelManager.load('birefnet', (modelProgress) => {
    onProgress?.({ stage: 'model', model: modelProgress })
  })
  const id = crypto.randomUUID()
  const inputSize = 512
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

    const request: WorkerRequest = { id, type: 'segment', image, model, inputSize }
    activeWorker.addEventListener('message', handleMessage)
    activeWorker.addEventListener('error', handleError)
    activeWorker.postMessage(request, [image, model])
  })
}
