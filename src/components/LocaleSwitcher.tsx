'use client'

import { Languages } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleProvider'

export function LocaleSwitcher() {
  const { locale, setLocale } = useLocale()

  return (
    <div className="locale-switcher" role="group" aria-label="Language switcher">
      <Languages size={16} />
      <button type="button" data-active={locale === 'zh'} onClick={() => setLocale('zh')} aria-pressed={locale === 'zh'}>
        中文
      </button>
      <button type="button" data-active={locale === 'en'} onClick={() => setLocale('en')} aria-pressed={locale === 'en'}>
        EN
      </button>
    </div>
  )
}
