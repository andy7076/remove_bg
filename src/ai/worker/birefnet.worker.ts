import { runBirefNetInference } from './inference'

type SegmentRequest = {
  id: string
  type: 'segment'
  image: ImageBitmap
  model: ArrayBuffer
  inputSize: number
}

self.addEventListener('message', (event: MessageEvent<SegmentRequest>) => {
  if (event.data.type !== 'segment') {
    return
  }

  runBirefNetInference(event.data)
    .then((result) => {
      self.postMessage(
        {
          id: event.data.id,
          type: 'success',
          width: result.width,
          height: result.height,
          mask: result.mask.buffer,
        },
        [result.mask.buffer],
      )
    })
    .catch((error: unknown) => {
      self.postMessage({
        id: event.data.id,
        type: 'error',
        message: error instanceof Error ? error.message : 'BiRefNet inference failed.',
      })
    })
})
