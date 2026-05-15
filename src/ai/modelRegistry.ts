export type SelectableSegmentationModelName = 'birefnet' | 'silueta' | 'modnet'
export type SegmentationModelName = SelectableSegmentationModelName
export type ModelName = SegmentationModelName | 'sam2Encoder' | 'sam2Decoder'

export type ModelNormalization = {
  mean: readonly [number, number, number]
  std: readonly [number, number, number]
}

export type ModelDescriptor = {
  name: ModelName
  displayName: string
  url: string
  version: string
  inputSize: number
  normalization: ModelNormalization
}

const IMAGENET_NORMALIZATION: ModelNormalization = {
  mean: [0.485, 0.456, 0.406],
  std: [0.229, 0.224, 0.225],
}

const CENTERED_NORMALIZATION: ModelNormalization = {
  mean: [0.5, 0.5, 0.5],
  std: [0.5, 0.5, 0.5],
}

export const MODEL_REGISTRY: Record<ModelName, ModelDescriptor> = {
  silueta: {
    name: 'silueta',
    displayName: 'Silueta',
    url: process.env.NEXT_PUBLIC_SILUETA_MODEL_URL ?? 'https://huggingface.co/jellybox/silueta/resolve/main/silueta_320.onnx',
    version: process.env.NEXT_PUBLIC_SILUETA_MODEL_VERSION ?? 'latest',
    inputSize: 320,
    normalization: IMAGENET_NORMALIZATION,
  },
  birefnet: {
    name: 'birefnet',
    displayName: 'BiRefNet_lite',
    url:
      process.env.NEXT_PUBLIC_BIREFNET_MODEL_URL ??
      'https://huggingface.co/studioludens/birefnet-lite-512/resolve/main/onnx/model_fp16.onnx',
    version: process.env.NEXT_PUBLIC_BIREFNET_MODEL_VERSION ?? 'latest',
    inputSize: 512,
    normalization: IMAGENET_NORMALIZATION,
  },
  sam2Encoder: {
    name: 'sam2Encoder',
    displayName: 'SAM2 encoder',
    url:
      process.env.NEXT_PUBLIC_SAM2_ENCODER_MODEL_URL ??
      'https://huggingface.co/SharpAI/sam2-hiera-tiny-onnx/resolve/main/encoder.onnx',
    version: process.env.NEXT_PUBLIC_SAM2_ENCODER_MODEL_VERSION ?? 'latest',
    inputSize: 1024,
    normalization: IMAGENET_NORMALIZATION,
  },
  sam2Decoder: {
    name: 'sam2Decoder',
    displayName: 'SAM2 decoder',
    url:
      process.env.NEXT_PUBLIC_SAM2_DECODER_MODEL_URL ??
      'https://huggingface.co/SharpAI/sam2-hiera-tiny-onnx/resolve/main/decoder.onnx',
    version: process.env.NEXT_PUBLIC_SAM2_DECODER_MODEL_VERSION ?? 'latest',
    inputSize: 1024,
    normalization: IMAGENET_NORMALIZATION,
  },
  modnet: {
    name: 'modnet',
    displayName: 'MODNet',
    url:
      process.env.NEXT_PUBLIC_MODNET_MODEL_URL ??
      'https://huggingface.co/Xenova/modnet/resolve/main/onnx/model_fp16.onnx',
    version: process.env.NEXT_PUBLIC_MODNET_MODEL_VERSION ?? 'latest',
    inputSize: 256,
    normalization: CENTERED_NORMALIZATION,
  },
}

export const SEGMENTATION_MODELS: readonly SelectableSegmentationModelName[] = ['birefnet', 'silueta', 'modnet']
