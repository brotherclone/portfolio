// JSON-LD predicate constants
const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
const RDFS_LABEL = 'http://www.w3.org/2000/01/rdf-schema#label'
const GW = 'https://gabrielwalsh.com/ontology#'

// Era ordering for opacity (earlyWeb=0 → agentic=4)
const ERA_ORDER: Record<string, number> = {
  era_earlyWeb: 0,
  era_lego: 1,
  era_agency: 2,
  era_international: 3,
  era_agentic: 4,
}

// These types appear only as edge metadata, not as rendered nodes
const FILTERED_TYPES = new Set(['Era', 'Domain'])

// Relationship predicates that become graph edges
const RELATIONSHIP_PREDS = new Set([
  `${GW}ledTo`,
  `${GW}evidencedBy`,
  `${GW}usedSkill`,
  `${GW}involvedConcept`,
  `${GW}workedAt`,
  `${GW}deliveredFor`,
  `${GW}producedArtifact`,
  `${GW}taughtAt`,
  `${GW}informedBy`,
  `${GW}relatedTo`,
  `${GW}inDomain`,
  `${GW}collaboratedWith`,
  `${GW}partOfEra`,
])

export type EntityType = 'Project' | 'Skill' | 'Concept' | 'Organization' | 'Artifact' | string

export interface GraphNode {
  id: string
  type: EntityType
  label: string
  summary: string
  detail?: string
  confidential: boolean
  /** Raw 0–1 weight from ontology; 0 if absent (use depthYears fallback) */
  nodeWeight: number
  /** Years of practice for Skill nodes */
  depthYears?: number
  category: string
  /** URI of the era this node belongs to, or null */
  era: string | null
  url?: string
}

export interface GraphLink {
  source: string
  target: string
  rel: string
}

export interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
  /** Max depthYears across all nodes, for normalisation */
  maxDepthYears: number
}

// ---------------------------------------------------------------------------
// Pure encoding helpers — tested in graphTransform.test.ts
// ---------------------------------------------------------------------------

/** Compute visual size scale factor from raw ontology values. */
export function getNodeSize(nodeWeight: number, depthYears?: number, maxDepthYears = 30): number {
  if (nodeWeight > 0) return 0.5 + nodeWeight * 1.5
  if (depthYears !== undefined && depthYears > 0) {
    return 0.5 + (depthYears / maxDepthYears) * 1.5
  }
  return 0.5
}

/** Compute opacity from era URI (or null → fully opaque). */
export function getNodeOpacity(eraUri: string | null): number {
  if (!eraUri) return 1.0
  const eraId = eraUri.split('#').pop() ?? eraUri
  const idx = ERA_ORDER[eraId]
  if (idx === undefined) return 1.0
  return 0.45 + idx * 0.13
}

/** Infer sequential edges from an ordered ANIMATE_PATH node list. */
export function inferPathEdges(
  nodes: Array<{ uri: string; label: string }>
): Array<{ source: string; target: string }> {
  const edges: Array<{ source: string; target: string }> = []
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({ source: nodes[i].uri, target: nodes[i + 1].uri })
  }
  return edges
}

/** Compute which nodes are highlighted vs dimmed given a HIGHLIGHT_NODES event. */
export function computeHighlightState(
  highlightedUris: string[],
  allNodeIds: string[]
): { highlighted: Set<string>; dimmed: Set<string> } {
  const highlighted = new Set(highlightedUris)
  const dimmed = new Set(allNodeIds.filter(id => !highlighted.has(id)))
  return { highlighted, dimmed }
}

// ---------------------------------------------------------------------------
// Raw value extraction from JSON-LD entry values
// ---------------------------------------------------------------------------

function extractValue(val: unknown): string | number | boolean | null {
  if (val === null || val === undefined) return null
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return val
  if (typeof val === 'object') {
    const v = val as Record<string, unknown>
    if ('@value' in v) {
      const raw = v['@value']
      const type = v['@type'] as string | undefined
      if (
        type === 'http://www.w3.org/2001/XMLSchema#decimal' ||
        type === 'http://www.w3.org/2001/XMLSchema#float' ||
        type === 'http://www.w3.org/2001/XMLSchema#integer'
      ) {
        return parseFloat(raw as string)
      }
      if (type === 'http://www.w3.org/2001/XMLSchema#boolean') {
        return raw === 'true'
      }
      return raw as string | number | boolean
    }
    if ('@id' in v) return v['@id'] as string
  }
  return null
}

// ---------------------------------------------------------------------------
// Main transform
// ---------------------------------------------------------------------------

export function transformGraphData(jsonld: { '@graph': Record<string, unknown>[] }): GraphData {
  // Group all flat JSON-LD entries by @id
  const byId = new Map<string, Record<string, unknown[]>>()
  for (const entry of jsonld['@graph']) {
    const id = entry['@id'] as string
    if (!id) continue
    if (!byId.has(id)) byId.set(id, {})
    const bucket = byId.get(id)!
    for (const [key, val] of Object.entries(entry)) {
      if (key === '@id') continue
      if (!bucket[key]) bucket[key] = []
      bucket[key].push(val)
    }
  }

  // Determine which IDs are renderable nodes (excludes Era, Domain, untyped)
  const nodeIds = new Set<string>()
  for (const [id, props] of byId) {
    const typeVal = props[RDF_TYPE]?.[0]
    const typeUri = typeVal ? (extractValue(typeVal) as string) : null
    const entityType = typeUri ? (typeUri.split('#').pop() ?? '') : ''
    if (entityType && !FILTERED_TYPES.has(entityType)) nodeIds.add(id)
  }

  // Find max depthYears for Skill size normalisation
  let maxDepthYears = 1
  for (const [, props] of byId) {
    const dy = extractValue(props[`${GW}depthYears`]?.[0])
    if (typeof dy === 'number' && dy > maxDepthYears) maxDepthYears = dy
  }

  const nodes: GraphNode[] = []
  const links: GraphLink[] = []

  for (const [id, props] of byId) {
    if (!nodeIds.has(id)) continue

    const typeVal = props[RDF_TYPE]?.[0]
    const typeUri = typeVal ? (extractValue(typeVal) as string) : null
    const entityType = typeUri ? (typeUri.split('#').pop() ?? '') : ''

    const label = (extractValue(props[RDFS_LABEL]?.[0]) as string) ?? id.split('#').pop() ?? id
    const summary = (extractValue(props[`${GW}summary`]?.[0]) as string) ?? ''
    const detail = extractValue(props[`${GW}detail`]?.[0]) as string | undefined
    const category = (extractValue(props[`${GW}category`]?.[0]) as string) ?? ''
    const nodeWeightRaw = extractValue(props[`${GW}nodeWeight`]?.[0])
    const depthYearsRaw = extractValue(props[`${GW}depthYears`]?.[0])
    const nodeWeight = typeof nodeWeightRaw === 'number' ? nodeWeightRaw : 0
    const depthYears = typeof depthYearsRaw === 'number' ? depthYearsRaw : undefined
    const confidentialRaw = extractValue(props[`${GW}confidential`]?.[0])
    const confidential = confidentialRaw === true || confidentialRaw === 'true'
    const partOfEraVals = props[`${GW}partOfEra`] ?? []
    const eraUri = partOfEraVals.length > 0 ? (extractValue(partOfEraVals[0]) as string) : null
    const url = extractValue(props[`${GW}url`]?.[0]) as string | undefined

    nodes.push({
      id,
      type: entityType,
      label,
      summary,
      detail: confidential ? undefined : detail,
      confidential,
      nodeWeight,
      depthYears,
      category,
      era: eraUri,
      url,
    })

    // Extract relationship edges
    for (const pred of RELATIONSHIP_PREDS) {
      const vals = props[pred] ?? []
      const rel = pred.split('#').pop() ?? pred
      for (const val of vals) {
        const targetId = extractValue(val) as string
        if (targetId && targetId.startsWith('http')) {
          links.push({ source: id, target: targetId, rel })
        }
      }
    }
  }

  // Only keep links where both endpoints are rendered nodes
  const filteredLinks = links.filter(l => nodeIds.has(l.source) && nodeIds.has(l.target))

  return { nodes, links: filteredLinks, maxDepthYears }
}
