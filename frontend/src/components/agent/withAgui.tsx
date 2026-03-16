'use client'

import { useEffect, useState, type ComponentType } from 'react'
import { aguiBus, type AguiEvent } from '@/lib/agui'

export interface WithAguiProps {
  aguiEvents: AguiEvent[]
  latestEvent: AguiEvent | null
}

/**
 * Wraps any component and injects AGUI event state.
 * Events arrive via the module-level aguiBus (fired by AguiEventListener).
 * A RESET event clears aguiEvents and sets latestEvent to null.
 */
export function withAgui<P extends WithAguiProps>(
  Component: ComponentType<P>
): ComponentType<Omit<P, keyof WithAguiProps>> {
  function AguiWrapper(props: Omit<P, keyof WithAguiProps>) {
    const [aguiEvents, setAguiEvents] = useState<AguiEvent[]>([])
    const [latestEvent, setLatestEvent] = useState<AguiEvent | null>(null)

    useEffect(() => {
      const bus = aguiBus
      if (!bus) return

      const handler = (e: Event) => {
        const event = (e as CustomEvent<AguiEvent>).detail
        if (event.type === 'RESET') {
          setAguiEvents([])
          setLatestEvent(null)
        } else {
          setAguiEvents(prev => [...prev, event])
          setLatestEvent(event)
        }
      }

      bus.addEventListener('agui', handler)
      return () => bus.removeEventListener('agui', handler)
    }, [])

    return (
      <Component
        {...(props as unknown as P)}
        aguiEvents={aguiEvents}
        latestEvent={latestEvent}
      />
    )
  }

  AguiWrapper.displayName = `withAgui(${Component.displayName ?? Component.name})`
  return AguiWrapper
}
