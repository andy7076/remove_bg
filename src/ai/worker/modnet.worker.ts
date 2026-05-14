self.addEventListener('message', () => {
  self.postMessage({
    type: 'error',
    message: 'MODNet worker is registered for the edge refine stage and is not invoked in phase one.',
  })
})
