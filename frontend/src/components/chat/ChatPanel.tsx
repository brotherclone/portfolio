'use client'

import { useEffect, useRef, useState } from 'react'
import { AguiEventListener, aguiBus, type AguiEvent, type RenderEntityCardEvent, type RenderPathSummaryEvent, type BlockPayload } from '@/lib/agui'
import { useSession } from '@/lib/useSession'
import { EntityCard } from '@/components/primitives/EntityCard'
import { PathSummary } from '@/components/primitives/PathSummary'
import { Block } from '@/components/primitives/Block'
import styles from './ChatPanel.module.scss'

// ---------------------------------------------------------------------------
// Response item model — text chunks and primitives interleaved in order
// ---------------------------------------------------------------------------

type TextItem = { kind: 'text'; text: string }
type EntityCardItem = { kind: 'entity-card'; payload: RenderEntityCardEvent['payload'] }
type PathSummaryItem = { kind: 'path-summary'; payload: RenderPathSummaryEvent['payload'] }
type BlockItem = { kind: 'block'; payload: BlockPayload }
type ResponseItem = TextItem | EntityCardItem | PathSummaryItem | BlockItem

// ---------------------------------------------------------------------------
// ChatPanel
// ---------------------------------------------------------------------------

export function ChatPanel() {
  const sessionId = useSession()
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [items, setItems] = useState<ResponseItem[]>([])
  const listenerRef = useRef<AguiEventListener | null>(null)
  const responseEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Subscribe to aguiBus
  useEffect(() => {
    const bus = aguiBus
    if (!bus) return

    const handler = (e: Event) => {
      const event = (e as CustomEvent<AguiEvent>).detail

      if (event.type === 'STREAM_TEXT') {
        const chunk = event.payload.text
        setItems(prev => {
          const last = prev[prev.length - 1]
          if (last?.kind === 'text') {
            return [...prev.slice(0, -1), { kind: 'text', text: last.text + chunk }]
          }
          return [...prev, { kind: 'text', text: chunk }]
        })
      } else if (event.type === 'RENDER_ENTITY_CARD') {
        setItems(prev => [...prev, { kind: 'entity-card', payload: event.payload }])
      } else if (event.type === 'RENDER_PATH_SUMMARY') {
        setItems(prev => [...prev, { kind: 'path-summary', payload: event.payload }])
      } else if (event.type === 'RENDER_BLOCK') {
        setItems(prev => [...prev, { kind: 'block', payload: event.payload }])
      } else if (event.type === 'RESET') {
        setStreaming(false)
        setTimeout(() => inputRef.current?.focus(), 0)
      }
    }

    bus.addEventListener('agui', handler)
    return () => bus.removeEventListener('agui', handler)
  }, [])

  // Scroll response area to bottom as items arrive
  useEffect(() => {
    responseEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [items])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const message = input.trim()
    if (!message) return

    // Stop any in-progress stream
    listenerRef.current?.stop()

    setItems([])
    setStreaming(true)
    setInput('')

    const listener = new AguiEventListener(message, sessionId)
    listenerRef.current = listener
    listener.start()
  }

  return (
    <div className={styles.panel}>
      {items.length > 0 && (
        <div className={styles.response}>
          {items.map((item, i) => {
            if (item.kind === 'text') {
              return <p key={i} className={styles.text}>{item.text}</p>
            }
            if (item.kind === 'entity-card') {
              return <EntityCard key={i} {...item.payload} />
            }
            if (item.kind === 'path-summary') {
              return <PathSummary key={i} {...item.payload} />
            }
            if (item.kind === 'block') {
              return <Block key={i} block={item.payload} />
            }
            return null
          })}
          <div ref={responseEndRef} />
        </div>
      )}
      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          className={styles.input}
          type="text"
          placeholder="Ask about the work…"
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={streaming}
          aria-label="Message"
        />
        <button
          className={styles.send}
          type="submit"
          disabled={streaming || !input.trim()}
          aria-label="Send"
        >
          →
        </button>
      </form>
    </div>
  )
}
