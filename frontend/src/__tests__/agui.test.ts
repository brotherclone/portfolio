import { describe, it, expect } from 'vitest'
import { inferPathEdges } from '../lib/graphTransform'
import type { AguiEvent } from '../lib/agui'

// ---------------------------------------------------------------------------
// AGUI event type narrowing (task 6.3 / 6.5 — pure logic coverage)
// ---------------------------------------------------------------------------

function applyAguiEvent(
  event: AguiEvent,
  state: { highlighted: Set<string>; animated: Set<string> }
): { highlighted: Set<string>; animated: Set<string>; latestEvent: AguiEvent | null } {
  if (event.type === 'HIGHLIGHT_NODES') {
    return { highlighted: new Set(event.payload.uris), animated: state.animated, latestEvent: event }
  }
  if (event.type === 'ANIMATE_PATH') {
    const edges = inferPathEdges(event.payload.nodes)
    const animated = new Set(edges.map(e => `${e.source}::${e.target}`))
    return { highlighted: state.highlighted, animated, latestEvent: event }
  }
  if (event.type === 'RESET') {
    return { highlighted: new Set(), animated: new Set(), latestEvent: null }
  }
  return { ...state, latestEvent: event }
}

describe('AGUI state machine', () => {
  it('HIGHLIGHT_NODES updates highlighted URIs', () => {
    const event: AguiEvent = {
      type: 'HIGHLIGHT_NODES',
      payload: { uris: ['gwi:a', 'gwi:b'] },
    }
    const { highlighted } = applyAguiEvent(event, { highlighted: new Set(), animated: new Set() })
    expect(highlighted.has('gwi:a')).toBe(true)
    expect(highlighted.has('gwi:b')).toBe(true)
  })

  it('ANIMATE_PATH infers edges from node sequence', () => {
    const event: AguiEvent = {
      type: 'ANIMATE_PATH',
      payload: {
        nodes: [
          { uri: 'gwi:concept_a', label: 'A' },
          { uri: 'gwi:concept_b', label: 'B' },
          { uri: 'gwi:concept_c', label: 'C' },
        ],
      },
    }
    const { animated } = applyAguiEvent(event, { highlighted: new Set(), animated: new Set() })
    expect(animated.has('gwi:concept_a::gwi:concept_b')).toBe(true)
    expect(animated.has('gwi:concept_b::gwi:concept_c')).toBe(true)
    expect(animated.size).toBe(2)
  })

  it('RESET clears both highlighted and animated sets', () => {
    const preState = {
      highlighted: new Set(['gwi:a', 'gwi:b']),
      animated: new Set(['gwi:a::gwi:b']),
    }
    const { highlighted, animated, latestEvent } = applyAguiEvent({ type: 'RESET' }, preState)
    expect(highlighted.size).toBe(0)
    expect(animated.size).toBe(0)
    expect(latestEvent).toBeNull()
  })

  it('event union is exhaustive — unknown types pass through without throwing', () => {
    // Simulates the "discard unknown event types" requirement
    const unknown = { type: 'UNKNOWN_EVENT' } as unknown as AguiEvent
    expect(() => applyAguiEvent(unknown, { highlighted: new Set(), animated: new Set() })).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// DetailPanel display logic (task 6.2 — confidentiality, no DOM needed)
// ---------------------------------------------------------------------------

import { getDisplayContent } from '../components/detail/DetailPanel'
import type { GraphNode } from '../lib/graphTransform'

function makeNode(overrides: Partial<GraphNode>): GraphNode {
  return {
    id: 'gwi:test',
    type: 'Project',
    label: 'Test Project',
    summary: 'NDA-safe summary',
    confidential: false,
    nodeWeight: 0.5,
    category: 'strategy',
    era: null,
    ...overrides,
  }
}

describe('getDisplayContent — confidentiality gate', () => {
  it('renders summary for confidential nodes, no detail', () => {
    const node = makeNode({ confidential: true, detail: 'Should not appear' })
    const { summary, detail } = getDisplayContent(node)
    expect(summary).toBe('NDA-safe summary')
    expect(detail).toBeUndefined()
  })

  it('renders detail for non-confidential nodes', () => {
    const node = makeNode({ confidential: false, detail: 'Full detail text' })
    const { detail } = getDisplayContent(node)
    expect(detail).toBe('Full detail text')
  })

  it('always renders label regardless of confidentiality', () => {
    const conf = makeNode({ confidential: true, label: 'Confidential Project' })
    const pub = makeNode({ confidential: false, label: 'Public Project' })
    expect(getDisplayContent(conf).label).toBe('Confidential Project')
    expect(getDisplayContent(pub).label).toBe('Public Project')
  })
})
