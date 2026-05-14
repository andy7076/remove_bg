'use client'

import { useLayoutEffect } from 'react'
import {
  applyLocale,
  applyTheme,
  resolveInitialLocale,
  resolveStoredTheme,
} from '@/settings/appSettings'

export function SettingsBootstrap() {
  useLayoutEffect(() => {
    const locale = resolveInitialLocale()
    const theme = resolveStoredTheme()
    applyLocale(locale)
    applyTheme(theme.mode, theme.resolvedTheme)
    document.documentElement.dataset.appReady = 'true'
  }, [])

  return null
}
