let opencvPromise: Promise<typeof import('@techstark/opencv-js')> | null = null

export function loadOpenCv() {
  if (!opencvPromise) {
    opencvPromise = import('@techstark/opencv-js')
  }

  return opencvPromise
}
