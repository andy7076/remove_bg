'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { MESSAGES, type Locale, isLocale } from '@/i18n/messages'

type LocaleContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  ready: boolean
}

const LOCALE_STORAGE_KEY = 'abg-locale'
const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [locale, setLocaleState] = useState<Locale>('en')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const resolved = resolveInitialLocale()
    setLocaleState(resolved)
    document.documentElement.lang = resolved
    document.title = MESSAGES[resolved].brand
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) {
      return
    }

    document.documentElement.lang = locale
    document.title = MESSAGES[locale].brand
    localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  }, [locale, ready])

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale)
  }, [])

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      ready,
    }),
    [locale, setLocale, ready],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const context = useContext(LocaleContext)

  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider.')
  }

  return context
}

function resolveInitialLocale(): Locale {
  if (typeof window === 'undefined') {
    return 'en'
  }

  const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
  if (isLocale(stored)) {
    return stored
  }

  const candidates = [navigator.language, ...(navigator.languages ?? [])].filter(Boolean)
  const detected = candidates.find((value) => value.toLowerCase().startsWith('zh'))
  return detected ? 'zh' : 'en'
}
