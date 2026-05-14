import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'AI Background Remover Editor | Local AI Cutout Tool',
    template: '%s | AI Background Remover Editor',
  },
  description:
    'Remove image backgrounds locally in your browser with WebGPU AI. Upload PNG, JPG, or WebP files, preview transparent cutouts, and download PNG results without sending images to a server.',
  applicationName: 'AI Background Remover Editor',
  keywords: [
    'AI background remover',
    'remove background',
    'transparent PNG',
    'local AI cutout',
    'WebGPU image editor',
    '在线抠图',
    'AI 抠图',
    '背景移除',
    '透明背景',
  ],
  authors: [{ name: 'AI Background Remover Editor' }],
  creator: 'AI Background Remover Editor',
  publisher: 'AI Background Remover Editor',
  category: 'Photo Editing',
  alternates: {
    canonical: '/',
    languages: {
      en: '/',
      'zh-CN': '/',
    },
  },
  openGraph: {
    title: 'AI Background Remover Editor',
    description:
      'A local AI background remover that keeps your images in the browser and exports transparent PNG results.',
    url: '/',
    siteName: 'AI Background Remover Editor',
    locale: 'en_US',
    alternateLocale: ['zh_CN'],
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'AI Background Remover Editor',
    description: 'Remove backgrounds locally with WebGPU AI and download transparent PNG cutouts.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  manifest: '/manifest.json',
}

const initialSettingsScript = `
(() => {
  try {
    const localeKey = 'abg-locale';
    const themeKey = 'abg-theme';
    const html = document.documentElement;
    const readStorage = (key) => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    };
    const isLocale = (value) => value === 'en' || value === 'zh';
    const storedLocale = readStorage(localeKey);
    const languages = [navigator.language, ...(navigator.languages || [])].filter(Boolean);
    const detectedLocale = languages.some((value) => value.toLowerCase().startsWith('zh')) ? 'zh' : 'en';
    const locale = isLocale(storedLocale) ? storedLocale : detectedLocale;
    const storedTheme = readStorage(themeKey);
    const mode = storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system' ? storedTheme : 'system';
    const resolvedTheme = mode === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : mode;

    html.dataset.detectedLocale = locale;
    html.lang = locale;
    html.dataset.themeMode = mode;
    html.dataset.theme = resolvedTheme;
    html.style.colorScheme = resolvedTheme;
  } catch {
    document.documentElement.dataset.appReady = 'true';
  }
})();
`

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'AI Background Remover Editor',
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'Any',
  inLanguage: ['en', 'zh-CN'],
  description:
    'Remove image backgrounds locally in the browser with WebGPU AI and export transparent PNG results.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  featureList: [
    'Local browser image processing',
    'WebGPU AI background removal',
    'Transparent PNG export',
    'PNG, JPG, and WebP input support',
  ],
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-locale="en" data-detected-locale="en" data-theme="dark" data-theme-mode="system" data-app-ready="false" suppressHydrationWarning>
      <head>
        <Script id="initial-settings" strategy="beforeInteractive">
          {initialSettingsScript}
        </Script>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5316621182787661"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
