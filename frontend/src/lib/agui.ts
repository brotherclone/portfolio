// ---------------------------------------------------------------------------
// AGUI event types
// ---------------------------------------------------------------------------

export type HighlightNodesEvent = {
  type: 'HIGHLIGHT_NODES'
  payload: { uris: string[] }
}

export type AnimatePathEvent = {
  type: 'ANIMATE_PATH'
  payload: { nodes: Array<{ uri: string; label: string }> }
}

export type StreamTextEvent = {
  type: 'STREAM_TEXT'
  payload: { text: string }
}

export type ResetEvent = {
  type: 'RESET'
  payload?: never
}

export type RenderEntityCardEvent = {
  type: 'RENDER_ENTITY_CARD'
  payload: {
    uri: string
    label: string
    type: string
    summary: string
    detail?: string
    url?: string
    mediaType?: string
  }
}

export type RenderPathSummaryEvent = {
  type: 'RENDER_PATH_SUMMARY'
  payload: {
    nodes: Array<{ uri: string; label: string; type?: string }>
  }
}

export type FocusNodeEvent = {
  type: 'FOCUS_NODE'
  payload: { uri: string; label: string }
}

export type BlockPayload =
  | { type: 'header'; text: string; level?: 1 | 2 | 3 }
  | { type: 'paragraph'; text: string }
  | { type: 'image'; src: string; caption?: string }
  | { type: 'button'; label: string; href: string }
  | { type: 'badge_row'; badges: string[] }

export type RenderBlockEvent = {
  type: 'RENDER_BLOCK'
  payload: BlockPayload
}

export type AguiEvent =
  | HighlightNodesEvent
  | AnimatePathEvent
  | StreamTextEvent
  | ResetEvent
  | RenderEntityCardEvent
  | RenderPathSummaryEvent
  | FocusNodeEvent
  | RenderBlockEvent

// ---------------------------------------------------------------------------
// Module-level event bus — withAgui subscribes; AguiEventListener publishes
// ---------------------------------------------------------------------------

export const aguiBus: EventTarget =
  typeof globalThis.EventTarget !== 'undefined' ? new EventTarget() : (null as unknown as EventTarget)

export function dispatchAguiEvent(event: AguiEvent): void {
  aguiBus?.dispatchEvent(new CustomEvent('agui', { detail: event }))
}

// ---------------------------------------------------------------------------
// AguiEventListener — opens SSE to /api/agent, fires events onto aguiBus
// ---------------------------------------------------------------------------

const MAX_RETRIES = 3

export class AguiEventListener {
  private controller: AbortController | null = null
  private retries = 0
  private message: string
  private sessionId: string

  constructor(message: string, sessionId: string) {
    this.message = message
    this.sessionId = sessionId
  }

  start(): void {
    this.retries = 0
    this.connect()
  }

  private connect(): void {
    this.controller = new AbortController()
    const { signal } = this.controller

    const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/$/, '')
    fetch(`${apiBase}/api/agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: this.message, session_id: this.sessionId }),
      signal,
    })
      .then(res => {
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        const pump = (): Promise<void> =>
          reader.read().then(({ done, value }) => {
            if (done) return
            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() ?? ''
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              const raw = line.slice(6).trim()
              if (!raw) continue
              try {
                const event = JSON.parse(raw) as AguiEvent
                dispatchAguiEvent(event)
                if (event.type === 'RESET') return
              } catch {
                // discard unparseable lines
              }
            }
            return pump()
          })

        return pump()
      })
      .catch(err => {
        if ((err as Error).name === 'AbortError') return
        if (this.retries < MAX_RETRIES) {
          this.retries++
          const delay = Math.pow(2, this.retries) * 500
          setTimeout(() => this.connect(), delay)
        } else {
          dispatchAguiEvent({ type: 'RESET' })
        }
      })
  }

  stop(): void {
    this.controller?.abort()
    this.controller = null
  }
}
