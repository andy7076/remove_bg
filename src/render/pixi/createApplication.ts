import { Application } from 'pixi.js'

export async function createPixiApplication(host: HTMLElement) {
  const app = new Application()
  await app.init({
    resizeTo: host,
    antialias: true,
    backgroundAlpha: 0,
    preference: 'webgpu',
  })
  return app
}
