'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

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
        maxWidth: '32rem',
        color: 'var(--color-text-muted)',
        fontSize: '0.875rem',
        lineHeight: 1.6,
        pointerEvents: 'none',
      }}>
        {/* TODO: replace with final copy — voice ref: "What isn't experience?" */}
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
      </div>
    </main>
  )
}
