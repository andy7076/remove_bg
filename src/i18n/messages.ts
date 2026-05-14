export type Locale = 'en' | 'zh'

export type ModelFriendlyName = 'BiRefNet'

type StatusFormat = {
  idle: string
  readingImage: string
  preparingModel: (model: string) => string
  modelCacheHit: string
  modelStored: string
  downloading: (loaded: string, total: string | null) => string
  inferenceRunning: string
  previewGenerating: string
  done: string
  exporting: string
  exported: string
  error: string
}

type Copy = {
  brand: string
  localeName: string
  introTitle: string
  introDescription: string
  upload: {
    idle: string
    dragging: string
    hint: string
    button: string
  }
  trust: {
    noUpload: string
    webgpu: string
    cache: string
  }
  actions: {
    chooseImage: string
    rerun: string
    download: string
  }
  preview: {
    waitingTitle: string
    processingTitle: string
    readyTitle: string
    waitingSubtitle: string
    processingBadge: string
    placeholderTitle: string
    placeholderSubtitle: string
  }
  process: {
    label: string
    waiting: string
    ready: string
    running: string
    error: string
    modelCache: string
  }
  steps: {
    decode: { label: string; detail: string }
    model: { label: string; detail: string }
    inference: { label: string; detail: string }
    preview: { label: string; detail: string }
  }
  status: StatusFormat
  errors: {
    unsupportedImage: string
    imageDecodeFailed: string
    inferenceFailed: string
    exportFailed: string
  }
}

export const MESSAGES: Record<Locale, Copy> = {
  en: {
    brand: 'AI Background Remover Editor',
    localeName: 'English',
    introTitle: 'Local AI background removal. Your image never leaves the browser.',
    introDescription:
      'Upload an image. The model downloads to local cache, runs in a Web Worker with WebGPU, and returns a preview before you decide to download.',
    upload: {
      idle: 'Upload image to start',
      dragging: 'Drop image to start',
      hint: 'PNG, JPG, and WebP are supported. You can also drag and drop here.',
      button: 'Choose image',
    },
    trust: {
      noUpload: 'No image upload',
      webgpu: 'WebGPU inference',
      cache: 'Local model cache',
    },
    actions: {
      chooseImage: 'Choose image',
      rerun: 'Re-cutout',
      download: 'Download PNG',
    },
    preview: {
      waitingTitle: 'Waiting for image',
      processingTitle: 'Processing preview',
      readyTitle: 'Preview result',
      waitingSubtitle: 'Upload a file to see the transparent background result here.',
      processingBadge: 'Local processing',
      placeholderTitle: 'Upload a photo to begin',
      placeholderSubtitle: 'The preview will appear here after local AI processing finishes.',
    },
    process: {
      label: 'Processing status',
      waiting: 'Waiting',
      ready: 'Done',
      running: 'Running',
      error: 'Needs attention',
      modelCache: 'Model cache',
    },
    steps: {
      decode: {
        label: 'Read image',
        detail: 'Decode the source file in browser memory',
      },
      model: {
        label: 'Load local model',
        detail: 'Read from IndexedDB or download BiRefNet',
      },
      inference: {
        label: 'AI cutout',
        detail: 'Run WebGPU inference in a Web Worker',
      },
      preview: {
        label: 'Build preview',
        detail: 'Composite original texture and alpha mask',
      },
    },
    status: {
      idle: 'Choose an image. All processing happens locally in your browser.',
      readingImage: 'Reading the image. The file is never uploaded.',
      preparingModel: (model) =>
        `Preparing ${model}. The first run downloads the model and caches it in IndexedDB.`,
      modelCacheHit: 'Model loaded from local IndexedDB cache.',
      modelStored: 'Model cached locally for offline reuse.',
      downloading: (loaded, total) =>
        total ? `Downloading local AI model: ${loaded} / ${total}` : `Downloading local AI model: ${loaded}`,
      inferenceRunning: 'Model is ready. Running WebGPU inference inside a Web Worker.',
      previewGenerating: 'Generating transparent preview.',
      done: 'Cutout complete. Review the result and download when ready.',
      exporting: 'Exporting transparent PNG.',
      exported: 'Transparent PNG exported.',
      error: 'Processing failed.',
    },
    errors: {
      unsupportedImage: 'Please choose a PNG, JPG, or WebP image.',
      imageDecodeFailed: 'Image decoding failed.',
      inferenceFailed: 'BiRefNet inference failed.',
      exportFailed: 'PNG export failed.',
    },
  },
  zh: {
    brand: 'AI Background Remover Editor',
    localeName: '中文',
    introTitle: '本地 AI 抠图，图片不离开浏览器。',
    introDescription:
      '上传图片后，模型会下载到本地缓存，并在 Web Worker 中使用 WebGPU 生成预览结果，确认后再下载透明 PNG。',
    upload: {
      idle: '上传图片开始抠图',
      dragging: '拖放图片开始抠图',
      hint: '支持 PNG、JPG、WebP。也可以直接拖到这里。',
      button: '选择图片',
    },
    trust: {
      noUpload: '不上传原图',
      webgpu: 'WebGPU 推理',
      cache: '模型本地缓存',
    },
    actions: {
      chooseImage: '选择图片',
      rerun: '重新抠图',
      download: '下载 PNG',
    },
    preview: {
      waitingTitle: '等待图片',
      processingTitle: '处理中预览',
      readyTitle: '预览结果',
      waitingSubtitle: '上传文件后，这里会显示透明背景效果。',
      processingBadge: '本地处理中',
      placeholderTitle: '上传图片后开始',
      placeholderSubtitle: '本地 AI 处理结束后，预览会在这里显示。',
    },
    process: {
      label: '处理状态',
      waiting: '等待',
      ready: '完成',
      running: '运行中',
      error: '需要处理',
      modelCache: '模型缓存',
    },
    steps: {
      decode: {
        label: '读取图片',
        detail: '在浏览器内解码原始文件',
      },
      model: {
        label: '准备本地模型',
        detail: '从 IndexedDB 读取或下载 BiRefNet',
      },
      inference: {
        label: 'AI 抠图',
        detail: '在 Web Worker 中运行 WebGPU 推理',
      },
      preview: {
        label: '生成预览',
        detail: '合成原图 texture 与 alpha mask',
      },
    },
    status: {
      idle: '请选择一张图片，所有处理都会在你的浏览器本地完成。',
      readingImage: '正在读取图片，文件不会上传到服务器。',
      preparingModel: (model) => `正在准备 ${model}，首次使用会下载并缓存到 IndexedDB。`,
      modelCacheHit: '已从本地 IndexedDB 读取模型缓存。',
      modelStored: '模型已保存到本地缓存，后续可直接离线使用。',
      downloading: (loaded, total) =>
        total ? `正在下载本地 AI 模型：${loaded} / ${total}` : `正在下载本地 AI 模型：${loaded}`,
      inferenceRunning: '模型已就绪，正在 Web Worker 中执行 WebGPU 推理。',
      previewGenerating: '正在生成透明背景预览。',
      done: '抠图完成。确认预览效果后可以下载透明 PNG。',
      exporting: '正在导出透明 PNG。',
      exported: '透明 PNG 已导出。',
      error: '处理失败。',
    },
    errors: {
      unsupportedImage: '请选择 PNG、JPG 或 WebP 图片。',
      imageDecodeFailed: '图片解码失败。',
      inferenceFailed: 'BiRefNet 推理失败。',
      exportFailed: 'PNG 导出失败。',
    },
  },
}

export function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'zh'
}
