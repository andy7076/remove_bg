'use client'

import { EditorShell } from '@/components/EditorShell'
import { RegisterServiceWorker } from '@/components/RegisterServiceWorker'
import { LocaleProvider } from '@/i18n/LocaleProvider'

export default function Home() {
  return (
    <LocaleProvider>
      <RegisterServiceWorker />
      <EditorShell />
    </LocaleProvider>
  )
}
