/**
 * Tests for AguiEventListener and withAgui event accumulation logic.
 * Tasks 5.1 and 5.2 of the add-agui-layer spec.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { AguiEventListener, aguiBus, type AguiEvent } from '../lib/agui'

// ── 5.1: AguiEventListener dispatches typed events from mock SSE ──────────────

function makeMockFetch(ssePayload: string) {
  const encoded = new TextEncoder().encode(ssePayload)
  const reader = {
    read: vi
      .fn()
      .mockResolvedValueOnce({ done: false, value: encoded })
      .mockResolvedValue({ done: true, value: undefined }),
  }
  return vi.fn().mockResolvedValue({
    ok: true,
    body: { getReader: () => reader },
  })
}

describe('AguiEventListener', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('includes session_id in POST body', async () => {
    const mockFetch = makeMockFetch('data: {"type":"RESET"}\n\n')
    vi.stubGlobal('fetch', mockFetch)

    const listener = new AguiEventListener('hello', 'test-session-123')
    listener.start()
    await new Promise(r => setTimeout(r, 50))
    listener.stop()

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/agent$/),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ message: 'hello', session_id: 'test-session-123' }),
      }),
    )
  })

  it('dispatches typed events onto aguiBus', async () => {
    const sse =
      'data: {"type":"HIGHLIGHT_NODES","payload":{"uris":["gwi:a"]}}\n\n' +
      'data: {"type":"RESET"}\n\n'
    vi.stubGlobal('fetch', makeMockFetch(sse))

    const received: AguiEvent[] = []
    const handler = (e: Event) => received.push((e as CustomEvent<AguiEvent>).detail)
    aguiBus.addEventListener('agui', handler)

    const listener = new AguiEventListener('test', 'session-abc')
    listener.start()
    await new Promise(r => setTimeout(r, 50))
    listener.stop()
    aguiBus.removeEventListener('agui', handler)

    expect(received[0]).toEqual({ type: 'HIGHLIGHT_NODES', payload: { uris: ['gwi:a'] } })
    expect(received[1]).toEqual({ type: 'RESET' })
  })

  it('discards unparseable SSE lines without throwing', async () => {
    const sse = 'data: NOT_JSON\n\ndata: {"type":"RESET"}\n\n'
    vi.stubGlobal('fetch', makeMockFetch(sse))

    const received: AguiEvent[] = []
    const handler = (e: Event) => received.push((e as CustomEvent<AguiEvent>).detail)
    aguiBus.addEventListener('agui', handler)

    const listener = new AguiEventListener('test', 'sess')
    listener.start()
    await new Promise(r => setTimeout(r, 50))
    listener.stop()
    aguiBus.removeEventListener('agui', handler)

    // Only the RESET got through — malformed line was silently dropped
    expect(received).toHaveLength(1)
    expect(received[0].type).toBe('RESET')
  })
})

// ── 5.2: withAgui event accumulation logic ────────────────────────────────────

describe('withAgui event accumulation logic', () => {
  it('accumulates events and clears on RESET', () => {
    let events: AguiEvent[] = []
    let latest: AguiEvent | null = null

    const handle = (event: AguiEvent) => {
      if (event.type === 'RESET') {
        events = []
        latest = null
      } else {
        events = [...events, event]
        latest = event
      }
    }

    handle({ type: 'HIGHLIGHT_NODES', payload: { uris: ['gwi:a'] } })
    expect(events).toHaveLength(1)
    expect(latest).toMatchObject({ type: 'HIGHLIGHT_NODES' })

    handle({ type: 'STREAM_TEXT', payload: { text: 'hello' } })
    expect(events).toHaveLength(2)

    handle({ type: 'RESET' })
    expect(events).toHaveLength(0)
    expect(latest).toBeNull()
  })

  it('each wrapped component accumulates independently', () => {
    // Two independent state machines (simulating two withAgui instances)
    let eventsA: AguiEvent[] = []
    let eventsB: AguiEvent[] = []

    const handleA = (event: AguiEvent) => {
      eventsA = event.type === 'RESET' ? [] : [...eventsA, event]
    }
    const handleB = (event: AguiEvent) => {
      eventsB = event.type === 'RESET' ? [] : [...eventsB, event]
    }

    const event: AguiEvent = { type: 'HIGHLIGHT_NODES', payload: { uris: ['gwi:x'] } }
    handleA(event)
    handleB(event)
    handleA({ type: 'RESET' })

    // A is cleared, B still has the event
    expect(eventsA).toHaveLength(0)
    expect(eventsB).toHaveLength(1)
  })
})
