'use client'

import { Check, Languages } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocale } from '@/i18n/LocaleProvider'

export function LocaleSwitcher() {
  const { locale, setLocale } = useLocale()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

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

  function chooseLocale(nextLocale: 'zh' | 'en') {
    setLocale(nextLocale)
    setOpen(false)
  }

  return (
    <div className="menu-control" ref={rootRef}>
      <button
        type="button"
        className="icon-menu-trigger"
        aria-label="Language"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
        title="Language"
      >
        <Languages size={17} />
      </button>
      {open && (
        <div className="control-menu" role="menu">
          <button type="button" role="menuitemradio" aria-checked={locale === 'zh'} onClick={() => chooseLocale('zh')}>
            <span>中文</span>
            {locale === 'zh' && <Check size={15} />}
          </button>
          <button type="button" role="menuitemradio" aria-checked={locale === 'en'} onClick={() => chooseLocale('en')}>
            <span>English</span>
            {locale === 'en' && <Check size={15} />}
          </button>
        </div>
      )}
    </div>
  )
}
