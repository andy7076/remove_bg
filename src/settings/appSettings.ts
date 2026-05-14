import { MESSAGES, type Locale, isLocale } from '@/i18n/messages'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export const LOCALE_STORAGE_KEY = 'abg-locale'
export const THEME_STORAGE_KEY = 'abg-theme'

export function resolveInitialLocale(): Locale {
  if (typeof window === 'undefined') {
    return 'en'
  }

  const stored = readLocalStorage(LOCALE_STORAGE_KEY)
  if (isLocale(stored)) {
    return stored
  }

  const candidates = [navigator.language, ...(navigator.languages ?? [])].filter(Boolean)
  const detected = candidates.find((value) => value.toLowerCase().startsWith('zh'))
  return detected ? 'zh' : 'en'
}

export function resolveInitialTheme(): { mode: ThemeMode; resolvedTheme: ResolvedTheme } {
  if (typeof window === 'undefined') {
    return { mode: 'system', resolvedTheme: 'dark' }
  }

  const dataset = document.documentElement.dataset
  const datasetMode = dataset.themeMode
  const stored = readLocalStorage(THEME_STORAGE_KEY)
  const mode = isThemeMode(datasetMode) ? datasetMode : isThemeMode(stored) ? stored : 'system'
  const resolvedTheme = dataset.theme === 'light' || dataset.theme === 'dark' ? dataset.theme : resolveTheme(mode)
  return { mode, resolvedTheme }
}

export function resolveStoredTheme(): { mode: ThemeMode; resolvedTheme: ResolvedTheme } {
  if (typeof window === 'undefined') {
    return { mode: 'system', resolvedTheme: 'dark' }
  }

  const stored = readLocalStorage(THEME_STORAGE_KEY)
  const mode = isThemeMode(stored) ? stored : 'system'
  return { mode, resolvedTheme: resolveTheme(mode) }
}

export function applyLocale(locale: Locale) {
  document.documentElement.lang = locale
  document.documentElement.dataset.locale = locale
  document.title = MESSAGES[locale].brand
}

export function applyTheme(mode: ThemeMode, resolvedTheme = resolveTheme(mode)) {
  document.documentElement.dataset.themeMode = mode
  document.documentElement.dataset.theme = resolvedTheme
  document.documentElement.style.colorScheme = resolvedTheme
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'light' || mode === 'dark') {
    return mode
  }

  if (typeof window === 'undefined') {
    return 'dark'
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function readLocalStorage(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeLocalStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage can be unavailable in restricted browser modes.
  }
}

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system'
}
