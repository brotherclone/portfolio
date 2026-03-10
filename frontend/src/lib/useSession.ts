'use client'

import { useRef } from 'react'

export function useSession(): string {
  const id = useRef<string | null>(null)
  if (id.current === null) {
    id.current = crypto.randomUUID()
  }
  return id.current
}
