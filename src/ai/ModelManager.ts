import { MODEL_REGISTRY, type ModelName } from '@/ai/modelRegistry'

type StoredModel = {
  key: string
  name: ModelName
  version: string
  url: string
  buffer: ArrayBuffer
  updatedAt: number
}

export type ModelLoadProgress = {
  phase: 'cache-hit' | 'download' | 'stored'
  loaded: number
  total: number | null
  displayLoaded?: number
  displayTotal?: number | null
}

const DB_NAME = 'ai-background-remover-models'
const STORE_NAME = 'models'
const DB_VERSION = 1

function openModelDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function tx<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openModelDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode)
        const request = action(transaction.objectStore(STORE_NAME))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
        transaction.oncomplete = () => db.close()
        transaction.onerror = () => {
          db.close()
          reject(transaction.error)
        }
      }),
  )
}

export class ModelManager {
  async load(name: ModelName, onProgress?: (progress: ModelLoadProgress) => void): Promise<ArrayBuffer> {
    const descriptor = MODEL_REGISTRY[name]
    const key = this.keyFor(name)
    const cached = await tx<StoredModel | undefined>('readonly', (store) => store.get(key))

    if (cached?.buffer.byteLength) {
      onProgress?.({
        phase: 'cache-hit',
        loaded: cached.buffer.byteLength,
        total: cached.buffer.byteLength,
        displayLoaded: cached.buffer.byteLength,
        displayTotal: cached.buffer.byteLength,
      })
      return cached.buffer.slice(0)
    }

    return this.cache(name, onProgress)
  }

  async preload(name: ModelName): Promise<void> {
    await this.load(name)
  }

  async cache(name: ModelName, onProgress?: (progress: ModelLoadProgress) => void): Promise<ArrayBuffer> {
    const descriptor = MODEL_REGISTRY[name]
    const response = await fetch(descriptor.url, {
      mode: 'cors',
      credentials: 'omit',
      cache: 'force-cache',
    })

    if (!response.ok) {
      throw new Error(`Model download failed: ${descriptor.url} (${response.status})`)
    }

    const buffer = await readResponseBuffer(response, onProgress)
    const stored: StoredModel = {
      key: this.keyFor(name),
      name,
      version: descriptor.version,
      url: descriptor.url,
      buffer,
      updatedAt: Date.now(),
    }

    await tx<IDBValidKey>('readwrite', (store) => store.put(stored))
    onProgress?.({
      phase: 'stored',
      loaded: buffer.byteLength,
      total: buffer.byteLength,
      displayLoaded: buffer.byteLength,
      displayTotal: buffer.byteLength,
    })
    return buffer.slice(0)
  }

  keyFor(name: ModelName): string {
    const descriptor = MODEL_REGISTRY[name]
    return `${descriptor.name}:${descriptor.version}:${descriptor.url}`
  }
}

export const modelManager = new ModelManager()

async function readResponseBuffer(response: Response, onProgress?: (progress: ModelLoadProgress) => void) {
  const totalHeader = response.headers.get('content-length')
  const total = totalHeader ? Number(totalHeader) : null
  const displayTotal = normalizedDisplayTotal(total)

  if (!response.body) {
    const buffer = await response.arrayBuffer()
    onProgress?.({
      phase: 'download',
      loaded: buffer.byteLength,
      total: buffer.byteLength,
      displayLoaded: buffer.byteLength,
      displayTotal: buffer.byteLength,
    })
    return buffer
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let loaded = 0

  while (true) {
    const { done, value } = await reader.read()

    if (done) {
      break
    }

    chunks.push(value)
    loaded += value.byteLength
    onProgress?.({
      phase: 'download',
      loaded,
      total: Number.isFinite(total) ? total : null,
      displayLoaded: displayTotal ? Math.min(loaded, displayTotal) : loaded,
      displayTotal,
    })
  }

  const output = new Uint8Array(loaded)
  let offset = 0

  for (const chunk of chunks) {
    output.set(chunk, offset)
    offset += chunk.byteLength
  }

  return output.buffer
}

function normalizedDisplayTotal(total: number | null) {
  if (!total || !Number.isFinite(total)) {
    return null
  }

  // Some CDNs/service workers report inflated transfer totals for streamed ONNX responses.
  // Keep the user-facing progress bounded to the actual model scale instead of showing 400MB+.
  return total > 160 * 1024 * 1024 ? null : total
}
