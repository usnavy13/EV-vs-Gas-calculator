import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'EV vs Gas Calculator',
  description: 'Comprehensive calculator to compare costs between electric vehicles and gas-powered cars',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

