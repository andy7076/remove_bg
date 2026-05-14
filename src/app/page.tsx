'use client'

import { EditorShell } from '@/components/EditorShell'
import { RegisterServiceWorker } from '@/components/RegisterServiceWorker'
import { LocaleProvider } from '@/i18n/LocaleProvider'
import { SettingsBootstrap } from '@/settings/SettingsBootstrap'
import { ThemeProvider } from '@/theme/ThemeProvider'

export default function Home() {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <SettingsBootstrap />
        <RegisterServiceWorker />
        <EditorShell />
      </LocaleProvider>
    </ThemeProvider>
  )
}
