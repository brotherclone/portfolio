import type { Metadata } from 'next'
import '@/styles/tokens.css'

export const metadata: Metadata = {
  title: 'Gabriel Walsh — Portfolio',
  description: '28 years of creative technology, experience design, and agentic architecture — navigated as a knowledge graph.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: 'var(--color-bg)', color: 'var(--color-text)', fontFamily: 'system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
