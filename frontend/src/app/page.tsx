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
    <main style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Suspense>
        <GraphCanvas />
      </Suspense>
    </main>
  )
}
