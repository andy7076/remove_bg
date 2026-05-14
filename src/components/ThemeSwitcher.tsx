'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleProvider'
import { MESSAGES } from '@/i18n/messages'
import type { ThemeMode } from '@/settings/appSettings'
import { useTheme } from '@/theme/ThemeProvider'

const OPTIONS: { mode: ThemeMode; icon: typeof Sun }[] = [
  { mode: 'light', icon: Sun },
  { mode: 'dark', icon: Moon },
  { mode: 'system', icon: Monitor },
]

export function ThemeSwitcher() {
  const { locale } = useLocale()
  const { mode, setMode } = useTheme()
  const copy = MESSAGES[locale].theme

  return (
    <div className="theme-switcher" role="group" aria-label={copy.label}>
      {OPTIONS.map((option) => {
        const Icon = option.icon
        const label = copy[option.mode]

        return (
          <button
            type="button"
            data-active={mode === option.mode}
            onClick={() => setMode(option.mode)}
            aria-label={label}
            aria-pressed={mode === option.mode}
            title={label}
            key={option.mode}
          >
            <Icon size={15} />
          </button>
        )
      })}
    </div>
  )
}
