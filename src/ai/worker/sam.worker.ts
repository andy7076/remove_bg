self.addEventListener('message', () => {
  self.postMessage({
    type: 'error',
    message: 'SAM2 worker is registered for the refine stage and is not invoked in phase one.',
  })
})
