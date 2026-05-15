'use client'

import { Check, Monitor, Moon, Sun } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
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
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const copy = MESSAGES[locale].theme
  const ActiveIcon = OPTIONS.find((option) => option.mode === mode)?.icon ?? Monitor

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  function chooseMode(nextMode: ThemeMode) {
    setMode(nextMode)
    setOpen(false)
  }

  return (
    <div className="menu-control" ref={rootRef}>
      <button
        type="button"
        className="icon-menu-trigger"
        aria-label={copy.label}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
        title={copy.label}
      >
        <ActiveIcon size={17} />
      </button>
      {open && (
        <div className="control-menu theme-menu" role="menu">
          {OPTIONS.map((option) => {
            const Icon = option.icon
            const label = copy[option.mode]

            return (
              <button
                type="button"
                role="menuitemradio"
                aria-checked={mode === option.mode}
                onClick={() => chooseMode(option.mode)}
                key={option.mode}
              >
                <Icon size={15} />
                <span>{label}</span>
                {mode === option.mode && <Check size={15} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
