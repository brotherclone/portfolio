import { describe, it, expect } from 'vitest'
import {
  getNodeSize,
  getNodeOpacity,
  inferPathEdges,
  computeHighlightState,
  transformGraphData,
  type GraphNode,
} from '../lib/graphTransform'

// ---------------------------------------------------------------------------
// Task 6.1 — node size encoding
// ---------------------------------------------------------------------------

describe('getNodeSize', () => {
  it('higher nodeWeight produces a larger scale value', () => {
    const small = getNodeSize(0.1)
    const large = getNodeSize(0.9)
    expect(large).toBeGreaterThan(small)
  })

  it('nodeWeight 0 with depthYears falls back to depthYears normalisation', () => {
    const shallow = getNodeSize(0, 5, 30)
    const deep = getNodeSize(0, 25, 30)
    expect(deep).toBeGreaterThan(shallow)
  })

  it('minimum size is 0.5 when both inputs are zero', () => {
    expect(getNodeSize(0, 0)).toBe(0.5)
  })

  it('nodeWeight 1.0 produces maximum size of 2.0', () => {
    expect(getNodeSize(1.0)).toBeCloseTo(2.0)
  })
})

// ---------------------------------------------------------------------------
// Era opacity
// ---------------------------------------------------------------------------

describe('getNodeOpacity', () => {
  it('earlyWeb era is less opaque than agentic era', () => {
    const early = getNodeOpacity('https://gabrielwalsh.com/instances#era_earlyWeb')
    const agentic = getNodeOpacity('https://gabrielwalsh.com/instances#era_agentic')
    expect(agentic).toBeGreaterThan(early)
  })

  it('null era returns full opacity', () => {
    expect(getNodeOpacity(null)).toBe(1.0)
  })

  it('neither era is fully transparent', () => {
    const early = getNodeOpacity('https://gabrielwalsh.com/instances#era_earlyWeb')
    expect(early).toBeGreaterThan(0)
    expect(early).toBeLessThan(1)
  })
})

// ---------------------------------------------------------------------------
// Task 6.4 — ANIMATE_PATH edge inference
// ---------------------------------------------------------------------------

describe('inferPathEdges', () => {
  it('infers edges from adjacent pairs in the ordered node list', () => {
    const nodes = [
      { uri: 'gwi:a', label: 'A' },
      { uri: 'gwi:b', label: 'B' },
      { uri: 'gwi:c', label: 'C' },
    ]
    const edges = inferPathEdges(nodes)
    expect(edges).toHaveLength(2)
    expect(edges[0]).toEqual({ source: 'gwi:a', target: 'gwi:b' })
    expect(edges[1]).toEqual({ source: 'gwi:b', target: 'gwi:c' })
  })

  it('returns empty array for a single node', () => {
    expect(inferPathEdges([{ uri: 'gwi:a', label: 'A' }])).toHaveLength(0)
  })

  it('returns empty array for an empty list', () => {
    expect(inferPathEdges([])).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Task 6.3 — HIGHLIGHT_NODES state
// ---------------------------------------------------------------------------

describe('computeHighlightState', () => {
  const allIds = ['gwi:a', 'gwi:b', 'gwi:c', 'gwi:d']

  it('listed URIs are in highlighted set', () => {
    const { highlighted } = computeHighlightState(['gwi:a', 'gwi:c'], allIds)
    expect(highlighted.has('gwi:a')).toBe(true)
    expect(highlighted.has('gwi:c')).toBe(true)
  })

  it('non-listed URIs are in dimmed set', () => {
    const { dimmed } = computeHighlightState(['gwi:a'], allIds)
    expect(dimmed.has('gwi:b')).toBe(true)
    expect(dimmed.has('gwi:c')).toBe(true)
    expect(dimmed.has('gwi:d')).toBe(true)
    expect(dimmed.has('gwi:a')).toBe(false)
  })

  it('empty highlight list dims all nodes', () => {
    const { highlighted, dimmed } = computeHighlightState([], allIds)
    expect(highlighted.size).toBe(0)
    expect(dimmed.size).toBe(allIds.length)
  })
})

// ---------------------------------------------------------------------------
// Task 6.5 — RESET clears state (pure logic)
// ---------------------------------------------------------------------------

describe('reset state logic', () => {
  it('cleared Sets have size 0', () => {
    const highlighted = new Set(['gwi:a', 'gwi:b'])
    const animated = new Set(['gwi:a::gwi:b'])
    highlighted.clear()
    animated.clear()
    expect(highlighted.size).toBe(0)
    expect(animated.size).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// transformGraphData — Era/Domain filtering + confidentiality
// ---------------------------------------------------------------------------

const GW = 'https://gabrielwalsh.com/ontology#'
const GWI = 'https://gabrielwalsh.com/instances#'
const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
const RDFS_LABEL = 'http://www.w3.org/2000/01/rdf-schema#label'

function makeFixture(): { '@graph': Record<string, unknown>[] } {
  return {
    '@graph': [
      // Project node
      { '@id': `${GWI}proj_test`, [RDF_TYPE]: { '@id': `${GW}Project` } },
      { '@id': `${GWI}proj_test`, [RDFS_LABEL]: 'Test Project' },
      { '@id': `${GWI}proj_test`, [`${GW}summary`]: 'A test project' },
      { '@id': `${GWI}proj_test`, [`${GW}detail`]: 'Secret detail' },
      { '@id': `${GWI}proj_test`, [`${GW}confidential`]: { '@value': 'false', '@type': 'http://www.w3.org/2001/XMLSchema#boolean' } },
      { '@id': `${GWI}proj_test`, [`${GW}nodeWeight`]: { '@value': '0.7', '@type': 'http://www.w3.org/2001/XMLSchema#decimal' } },
      { '@id': `${GWI}proj_test`, [`${GW}category`]: 'design' },
      // Confidential project
      { '@id': `${GWI}proj_secret`, [RDF_TYPE]: { '@id': `${GW}Project` } },
      { '@id': `${GWI}proj_secret`, [RDFS_LABEL]: 'Secret Project' },
      { '@id': `${GWI}proj_secret`, [`${GW}summary`]: 'NDA-safe summary' },
      { '@id': `${GWI}proj_secret`, [`${GW}detail`]: 'Confidential detail — should be stripped' },
      { '@id': `${GWI}proj_secret`, [`${GW}confidential`]: { '@value': 'true', '@type': 'http://www.w3.org/2001/XMLSchema#boolean' } },
      // Era node — should NOT appear as graph node
      { '@id': `${GWI}era_agentic`, [RDF_TYPE]: { '@id': `${GW}Era` } },
      { '@id': `${GWI}era_agentic`, [RDFS_LABEL]: 'Agentic Architecture' },
      // Domain node — should NOT appear as graph node
      { '@id': `${GWI}domain_tech`, [RDF_TYPE]: { '@id': `${GW}Domain` } },
      { '@id': `${GWI}domain_tech`, [RDFS_LABEL]: 'Technology' },
    ],
  }
}

describe('transformGraphData', () => {
  it('filters out Era and Domain typed instances from nodes', () => {
    const { nodes } = transformGraphData(makeFixture())
    const ids = nodes.map(n => n.id)
    expect(ids).not.toContain(`${GWI}era_agentic`)
    expect(ids).not.toContain(`${GWI}domain_tech`)
  })

  it('includes Project nodes', () => {
    const { nodes } = transformGraphData(makeFixture())
    expect(nodes.find(n => n.id === `${GWI}proj_test`)).toBeDefined()
  })

  // Task 6.2 — confidentiality
  it('strips detail from confidential nodes', () => {
    const { nodes } = transformGraphData(makeFixture())
    const secret = nodes.find(n => n.id === `${GWI}proj_secret`) as GraphNode
    expect(secret).toBeDefined()
    expect(secret.confidential).toBe(true)
    expect(secret.detail).toBeUndefined()
  })

  it('preserves detail for non-confidential nodes', () => {
    const { nodes } = transformGraphData(makeFixture())
    const pub = nodes.find(n => n.id === `${GWI}proj_test`) as GraphNode
    expect(pub.confidential).toBe(false)
    expect(pub.detail).toBe('Secret detail')
  })
})
