'use client'

import { useEffect } from 'react'

export function RegisterServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return
    }

    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister()
        })
      })
      return
    }

    const canRegister = location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname)

    if (!canRegister) {
      return
    }

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // The app remains usable without offline caching.
    })
  }, [])

  return null
}
