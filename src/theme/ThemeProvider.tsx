'use client'

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import {
  THEME_STORAGE_KEY,
  applyTheme,
  resolveInitialTheme,
  resolveTheme,
  writeLocalStorage,
  type ResolvedTheme,
  type ThemeMode,
} from '@/settings/appSettings'

type ThemeContextValue = {
  mode: ThemeMode
  resolvedTheme: ResolvedTheme
  setMode: (mode: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [mode, setModeState] = useState<ThemeMode>('system')
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('dark')

  const applyMode = useCallback((nextMode: ThemeMode) => {
    const nextResolved = resolveTheme(nextMode)
    applyTheme(nextMode, nextResolved)
    setModeState(nextMode)
    setResolvedTheme(nextResolved)
  }, [])

  useLayoutEffect(() => {
    const initial = resolveInitialTheme()
    applyTheme(initial.mode, initial.resolvedTheme)
    setModeState(initial.mode)
    setResolvedTheme(initial.resolvedTheme)
  }, [])

  useEffect(() => {
    if (mode !== 'system') {
      return
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      const nextResolved = media.matches ? 'dark' : 'light'
      applyTheme('system', nextResolved)
      setResolvedTheme(nextResolved)
    }

    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [mode])

  const setMode = useCallback((nextMode: ThemeMode) => {
    writeLocalStorage(THEME_STORAGE_KEY, nextMode)
    applyMode(nextMode)
  }, [applyMode])

  const value = useMemo(
    () => ({
      mode,
      resolvedTheme,
      setMode,
    }),
    [mode, resolvedTheme, setMode],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider.')
  }

  return context
}
