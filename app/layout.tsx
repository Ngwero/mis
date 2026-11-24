import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'CoopMIS', template: '%s · CoopMIS' },
  description: 'Management information system for producer cooperatives.',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
