import type { Metadata } from 'next'
import { Fraunces, Source_Sans_3 } from 'next/font/google'
import './globals.css'

const sans = Source_Sans_3({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })
const display = Fraunces({ subsets: ['latin'], variable: '--font-display', display: 'swap' })

export const metadata: Metadata = {
  title: { default: 'CoopMIS', template: '%s · CoopMIS' },
  description: 'Management information system for producer cooperatives.',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  )
}
