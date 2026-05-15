import { runSegmentationInference, type SegmentationInferenceInput } from './inference'

type SegmentRequest = SegmentationInferenceInput & {
  id: string
  type: 'segment'
}

self.addEventListener('message', (event: MessageEvent<SegmentRequest>) => {
  if (event.data.type !== 'segment') {
    return
  }

  runSegmentationInference(event.data)
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
        message: error instanceof Error ? error.message : 'Segmentation inference failed.',
      })
    })
})
