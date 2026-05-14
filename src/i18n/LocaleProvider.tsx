'use client'

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import type { Locale } from '@/i18n/messages'
import {
  LOCALE_STORAGE_KEY,
  applyLocale,
  resolveInitialLocale,
  writeLocalStorage,
} from '@/settings/appSettings'

type LocaleContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [locale, setLocaleState] = useState<Locale>('en')

  useLayoutEffect(() => {
    setLocaleState(resolveInitialLocale())
  }, [])

  useEffect(() => {
    applyLocale(locale)
    writeLocalStorage(LOCALE_STORAGE_KEY, locale)
  }, [locale])

  const setLocale = useCallback((nextLocale: Locale) => {
    applyLocale(nextLocale)
    writeLocalStorage(LOCALE_STORAGE_KEY, nextLocale)
    setLocaleState(nextLocale)
  }, [])

  const value = useMemo(
    () => ({
      locale,
      setLocale,
    }),
    [locale, setLocale],
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
