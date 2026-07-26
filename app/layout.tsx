import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Workout Program Builder',
  description: 'Design a one-week repeating workout program',
  manifest: '/site.webmanifest',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">{children}</body>
    </html>
  )
}
