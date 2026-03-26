import { describe, it, expect } from 'vitest'
import type { RenderEntityCardEvent, RenderPathSummaryEvent, AguiEvent } from '../lib/agui'

// ---------------------------------------------------------------------------
// Task 6.2 — EntityCard logic (confidentiality gate, payload shape)
// ---------------------------------------------------------------------------

function getEntityCardDisplayFields(payload: RenderEntityCardEvent['payload']) {
  return {
    label: payload.label,
    summary: payload.summary,
    detail: payload.detail,
    url: payload.url,
    mediaType: payload.mediaType,
  }
}

describe('EntityCard payload — confidentiality gate', () => {
  it('non-confidential card includes detail', () => {
    const payload: RenderEntityCardEvent['payload'] = {
      uri: 'gwi:proj_a',
      label: 'Project A',
      type: 'Project',
      summary: 'Summary text',
      detail: 'Full detail text',
    }
    const { detail } = getEntityCardDisplayFields(payload)
    expect(detail).toBe('Full detail text')
  })

  it('confidential card has no detail field', () => {
    // Backend omits detail for confidential entities — payload simply lacks the field
    const payload: RenderEntityCardEvent['payload'] = {
      uri: 'gwi:proj_confidential',
      label: 'Confidential Project',
      type: 'Project',
      summary: 'NDA-safe summary',
    }
    const { detail } = getEntityCardDisplayFields(payload)
    expect(detail).toBeUndefined()
  })

  it('audio mediaType is represented in payload', () => {
    const payload: RenderEntityCardEvent['payload'] = {
      uri: 'gwi:artifact_earthly',
      label: 'Earthly Frames',
      type: 'Artifact',
      summary: 'Original music',
      url: 'https://example.com/track.mp3',
      mediaType: 'audio',
    }
    expect(payload.mediaType).toBe('audio')
    expect(payload.url).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// Task 6.3 — ChatPanel ResponseItem model logic
// ---------------------------------------------------------------------------

type TextItem = { kind: 'text'; text: string }
type EntityCardItem = { kind: 'entity-card'; payload: RenderEntityCardEvent['payload'] }
type PathSummaryItem = { kind: 'path-summary'; payload: RenderPathSummaryEvent['payload'] }
type ResponseItem = TextItem | EntityCardItem | PathSummaryItem

function applyEvent(items: ResponseItem[], event: AguiEvent): ResponseItem[] {
  if (event.type === 'STREAM_TEXT') {
    const chunk = event.payload.text
    const last = items[items.length - 1]
    if (last?.kind === 'text') {
      return [...items.slice(0, -1), { kind: 'text', text: last.text + chunk }]
    }
    return [...items, { kind: 'text', text: chunk }]
  }
  if (event.type === 'RENDER_ENTITY_CARD') {
    return [...items, { kind: 'entity-card', payload: event.payload }]
  }
  if (event.type === 'RENDER_PATH_SUMMARY') {
    return [...items, { kind: 'path-summary', payload: event.payload }]
  }
  if (event.type === 'RESET') {
    return []
  }
  return items
}

const entityPayload: RenderEntityCardEvent['payload'] = {
  uri: 'gwi:proj_a', label: 'A', type: 'Project', summary: 'Summary',
}
const pathPayload: RenderPathSummaryEvent['payload'] = {
  nodes: [{ uri: 'gwi:a', label: 'A' }, { uri: 'gwi:b', label: 'B' }],
}

describe('ChatPanel ResponseItem model', () => {
  it('STREAM_TEXT appends to last text item', () => {
    let items: ResponseItem[] = []
    items = applyEvent(items, { type: 'STREAM_TEXT', payload: { text: 'Hello' } })
    items = applyEvent(items, { type: 'STREAM_TEXT', payload: { text: ' world' } })
    expect(items).toHaveLength(1)
    expect((items[0] as TextItem).text).toBe('Hello world')
  })

  it('STREAM_TEXT creates new text item after a primitive', () => {
    let items: ResponseItem[] = []
    items = applyEvent(items, { type: 'STREAM_TEXT', payload: { text: 'Before' } })
    items = applyEvent(items, { type: 'RENDER_ENTITY_CARD', payload: entityPayload })
    items = applyEvent(items, { type: 'STREAM_TEXT', payload: { text: 'After' } })
    expect(items).toHaveLength(3)
    expect(items[0].kind).toBe('text')
    expect(items[1].kind).toBe('entity-card')
    expect(items[2].kind).toBe('text')
    expect((items[2] as TextItem).text).toBe('After')
  })

  it('RENDER_ENTITY_CARD appends a primitive item', () => {
    let items: ResponseItem[] = []
    items = applyEvent(items, { type: 'RENDER_ENTITY_CARD', payload: entityPayload })
    expect(items).toHaveLength(1)
    expect(items[0].kind).toBe('entity-card')
  })

  it('RENDER_PATH_SUMMARY appends a primitive item', () => {
    let items: ResponseItem[] = []
    items = applyEvent(items, { type: 'RENDER_PATH_SUMMARY', payload: pathPayload })
    expect(items).toHaveLength(1)
    expect(items[0].kind).toBe('path-summary')
  })

  it('mixed events produce correct interleaved order', () => {
    let items: ResponseItem[] = []
    items = applyEvent(items, { type: 'STREAM_TEXT', payload: { text: 'First' } })
    items = applyEvent(items, { type: 'RENDER_ENTITY_CARD', payload: entityPayload })
    items = applyEvent(items, { type: 'RENDER_PATH_SUMMARY', payload: pathPayload })
    items = applyEvent(items, { type: 'STREAM_TEXT', payload: { text: 'Last' } })
    expect(items.map(i => i.kind)).toEqual(['text', 'entity-card', 'path-summary', 'text'])
  })

  it('RESET clears all items', () => {
    let items: ResponseItem[] = []
    items = applyEvent(items, { type: 'STREAM_TEXT', payload: { text: 'Hello' } })
    items = applyEvent(items, { type: 'RENDER_ENTITY_CARD', payload: entityPayload })
    items = applyEvent(items, { type: 'RESET' })
    expect(items).toHaveLength(0)
  })
})
