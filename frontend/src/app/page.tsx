'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { ChatPanel } from '@/components/chat/ChatPanel'

const GraphCanvas = dynamic(
  () => import('@/components/graph/GraphCanvas'),
  {
    ssr: false,
    loading: () => (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--color-text-muted)' }}>
        Loading graph…
      </div>
    ),
  }
)

export default function HomePage() {
  return (
    <main
      style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}
      aria-label="Knowledge graph — click any node to explore"
    >
      <Suspense>
        <GraphCanvas />
      </Suspense>
      <div style={{
        position: 'absolute',
        bottom: '2rem',
        left: '2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        maxWidth: '28rem',
      }}>
        <div style={{ pointerEvents: 'none', paddingLeft: '0.25rem' }}>
          <p style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.2 }}>
            Gabriel Walsh
          </p>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
            Creative technologist. Experience architect.
          </p>
        </div>
        <ChatPanel />
      </div>
    </main>
  )
}
