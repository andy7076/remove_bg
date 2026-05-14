export type ModelName = 'birefnet' | 'sam2Encoder' | 'sam2Decoder' | 'modnet'

export type ModelDescriptor = {
  name: ModelName
  url: string
  version: string
  inputSize: number
}

export const MODEL_REGISTRY: Record<ModelName, ModelDescriptor> = {
  birefnet: {
    name: 'birefnet',
    url:
      process.env.NEXT_PUBLIC_BIREFNET_MODEL_URL ??
      'https://huggingface.co/studioludens/birefnet-lite-512/resolve/main/onnx/model_fp16.onnx',
    version: process.env.NEXT_PUBLIC_BIREFNET_MODEL_VERSION ?? 'latest',
    inputSize: 512,
  },
  sam2Encoder: {
    name: 'sam2Encoder',
    url:
      process.env.NEXT_PUBLIC_SAM2_ENCODER_MODEL_URL ??
      'https://huggingface.co/SharpAI/sam2-hiera-tiny-onnx/resolve/main/encoder.onnx',
    version: process.env.NEXT_PUBLIC_SAM2_ENCODER_MODEL_VERSION ?? 'latest',
    inputSize: 1024,
  },
  sam2Decoder: {
    name: 'sam2Decoder',
    url:
      process.env.NEXT_PUBLIC_SAM2_DECODER_MODEL_URL ??
      'https://huggingface.co/SharpAI/sam2-hiera-tiny-onnx/resolve/main/decoder.onnx',
    version: process.env.NEXT_PUBLIC_SAM2_DECODER_MODEL_VERSION ?? 'latest',
    inputSize: 1024,
  },
  modnet: {
    name: 'modnet',
    url:
      process.env.NEXT_PUBLIC_MODNET_MODEL_URL ??
      'https://huggingface.co/onnx-community/modnet/resolve/main/modnet_fp16.onnx',
    version: process.env.NEXT_PUBLIC_MODNET_MODEL_VERSION ?? 'latest',
    inputSize: 512,
  },
}
