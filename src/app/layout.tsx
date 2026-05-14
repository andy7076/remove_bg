import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI Background Remover Editor',
  description: 'Local WebGPU background removal editor with mask based refinement.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
