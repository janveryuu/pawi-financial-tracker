import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { StoreProvider } from '@/lib/store'
import { ThemeProvider } from '@/components/theme-provider'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

import { AuthProvider } from '@/lib/auth-context'

export const metadata: Metadata = {
  title: 'Pawi — Private, offline-first finance tracker',
  description:
    'Pawi helps you track every peso. Save smarter, slow and steady, with your friendly turtle finance companion.',
  generator: 'v0.app',
  icons: {
    icon: '/pawikan-logo.png',
    apple: '/pawikan-logo.png',
  },
  manifest: "/manifest.json",
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} bg-background`}
    >
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            <StoreProvider>
              {children}
              {process.env.NODE_ENV === 'production' && <Analytics />}
            </StoreProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
