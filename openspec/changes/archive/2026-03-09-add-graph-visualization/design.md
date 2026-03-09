# Design: Add Graph Visualization

## Context

The graph canvas is the primary UI surface of the portfolio. It must:
- Load a pre-built JSON-LD snapshot (`frontend/public/graph.jsonld`) at startup — no SPARQL round-trip on first paint
- Encode ontology properties visually so topology communicates career narrative without reading labels
- Respond to live AGUI events from the agent, animating the graph as the agent reasons
- Degrade gracefully to 2D on mobile

Key constraints from the rest of the stack:
- JSON-LD data shape comes from `scripts/generate.py` → `context.jsonld` (ontology-layer spec)
- TypeScript types come from `gen-typescript` → `types.ts` (ontology-layer spec)
- AGUI events arrive from `withAgui()` HOC (add-agui-layer spec); `GraphCanvas` is a consumer, not the producer
- `gw:confidential` gating is enforced at build time in `graph.jsonld` — frontend never sees `gw:detail` for confidential nodes

---

## Goals / Non-Goals

**Goals:**
- Render all entities and edges as a 3D force-directed graph using `react-force-graph-3d`
- Encode `nodeWeight`, `category`, entity type, and era recency as visual properties without runtime SPARQL
- Support click (detail panel) and hover (tooltip) interactions
- Respond to `HIGHLIGHT_NODES`, `ANIMATE_PATH`, and `RESET` events from `withAgui()`
- 2D fallback for `window.innerWidth < 768`

**Non-Goals:**
- Real-time graph mutation (nodes/edges are static at build time)
- Server-side rendering of the canvas (WebGL is client-only; use `dynamic(() => import(...), { ssr: false })`)
- Custom physics engine (use `react-force-graph-3d` defaults with minor config tweaks)
- Graph filtering or search UI (Phase 5)

---

## Decisions

### 1. Data Loading — Static JSON-LD, No Runtime SPARQL

**Decision:** `GraphCanvas` fetches `graph.jsonld` at mount via `fetch('/graph.jsonld')` and parses it into the `{ nodes, links }` shape `react-force-graph-3d` expects. No SPARQL call on the critical path.

**Why:** The ontology-layer spec already produces `frontend/public/graph.jsonld` at build time with confidentiality filtering applied. A static fetch is zero-latency on Vercel's CDN vs. a Railway round-trip.

**JSON-LD → graph data transformation:**
```
graph.jsonld @graph array
  → for each item with @type: extract as node { id: @id, type, label, summary, nodeWeight, category, confidential, era }
  → for each relationship property (ledTo, usedSkill, etc.): extract as link { source, target, rel }
```
This transform runs once at mount and is memoised. Types come from the generated `types.ts`.

---

### 2. Node Visual Encoding — Three.js Custom Object

**Decision:** Use `react-force-graph-3d`'s `nodeThreeObject` prop to return custom `THREE.Mesh` instances per node. This gives full control over geometry, material, and shader properties.

**Size:** Map `node.nodeWeight` (0–1 float, or fallback: normalise `depthYears` over the max in the dataset) to a scale factor `0.5 + nodeWeight * 1.5` applied to the base geometry.

**Shape → geometry:**
| Entity type | THREE geometry |
|---|---|
| `Concept` | `SphereGeometry(1, 16, 16)` |
| `Project` | `BoxGeometry(1.4, 1.4, 1.4)` |
| `Organization` | `TorusGeometry(0.8, 0.3, 8, 16)` |
| `Artifact` | `OctahedronGeometry(1)` (star-like; true star requires custom geometry, defer) |
| `Skill` | `SphereGeometry(0.8, 8, 8)` (low-poly to distinguish from Concept) |
| `Era` / `Domain` | `CylinderGeometry(0.7, 0.7, 1.2, 6)` |

**Color → `MeshStandardMaterial` color:**
| `gw:category` | Hex |
|---|---|
| `design` | `#E8845A` (warm amber-orange) |
| `development` | `#5A8FE8` (cool blue) |
| `strategy` | `#A0A0B0` (neutral slate) |
| `artifact` | `#D4AF37` (gold) |
| _(fallback)_ | `#888888` |

**Opacity → material `transparent: true, opacity`:** Era recency drives opacity. Assign era index 0–4 (earlyWeb→agentic) → opacity `0.45 + eraIndex * 0.13` (range ~0.45–0.97). Nodes without an era get `opacity: 1.0`.

---

### 3. Edge Visual Encoding — `linkColor` and `linkWidth`

**Decision:** Use `react-force-graph-3d`'s `linkColor` and `linkWidth` props (functions over link objects). No custom Three.js objects needed for edges in V1.

| Relationship | Color | Width |
|---|---|---|
| `ledTo` | `#E8845A` (warm) | 2 |
| `evidencedBy` | `#5A8FE8` (cool) | 1.5 |
| `partOfEra` | `#A0A0B0` (neutral) | 1 |
| _(all others)_ | `#555566` | 1 |

---

### 4. AGUI Integration — State Overlay, Not Re-render

**Decision:** AGUI state (highlighted URIs, animated path) is stored in a `useRef`-backed set, not in React state, to avoid forcing a full graph re-render on every agent event. Visual updates are applied by mutating `nodeThreeObject` materials directly via the graph's `nodeThreeObjectExtend: true` approach or by iterating the `graphRef.current` internal node list.

**Highlight:**
- On `HIGHLIGHT_NODES`: set `highlightedUris` ref, call `graphRef.current.refresh()` — the `nodeThreeObject` callback reads the ref and adjusts emissive intensity.
- Non-highlighted nodes: `material.opacity = 0.15`, `material.emissiveIntensity = 0`.
- Highlighted nodes: `material.emissiveIntensity = 0.6`, pulse via a `requestAnimationFrame` loop incrementing a sine wave.

**Animate Path:**
- On `ANIMATE_PATH` with `nodes: Array<{uri, label}>`: infer edges from adjacent pairs `[nodes[i].uri, nodes[i+1].uri]`.
- Use `linkDirectionalParticles` and `linkDirectionalParticleSpeed` props (reactive to state) to render particles only on matched edges.
- Store matched edge set in a ref; call `graphRef.current.refresh()`.

**Reset:**
- Clear `highlightedUris` ref, clear animated edges ref, cancel animation frame loop, call `graphRef.current.refresh()`.

---

### 5. Detail Panel — Portalled Overlay

**Decision:** `DetailPanel` is a React portal (`ReactDOM.createPortal`) appended to `document.body`, not a sibling of `GraphCanvas`. This avoids WebGL z-index stacking issues.

**Data flow:** `GraphCanvas` maintains `selectedNode: GraphNode | null` state. On click, it sets the node; `DetailPanel` receives it as a prop and renders.

**Confidentiality:** `DetailPanel` checks `node.confidential`. If true, render `label` + `summary` only. Never conditionally fetch — the `detail` field is simply absent from `graph.jsonld` for confidential nodes (enforced at build time), so the check is a safety belt.

**Close:** Escape keydown listener + click on backdrop overlay div.

---

### 6. Mobile Fallback — Dynamic Import Gate

**Decision:** Use Next.js `dynamic()` with `ssr: false` for both renderers. Check `window.innerWidth < 768` inside the component after mount (in a `useEffect` with no deps) and render either `ForceGraph3D` or `ForceGraph2D` from their respective packages.

```tsx
const [use2D, setUse2D] = useState(false)
useEffect(() => { setUse2D(window.innerWidth < 768) }, [])
```

The `react-force-graph` (2D) and `react-force-graph-3d` (3D) packages share the same props API — the same node/link encoding functions apply to both.

---

### 7. SSR / Next.js App Router

**Decision:** `GraphCanvas` is a Client Component (`'use client'`). The `page.tsx` RSC shell renders a `<Suspense>` boundary with a loading skeleton, then lazy-loads `GraphCanvas` via `dynamic(..., { ssr: false })`. This keeps the RSC shell fast and avoids hydration errors from WebGL.

---

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| `react-force-graph-3d` ships its own Three.js; version conflict with any other Three.js import | Import Three.js only through `react-force-graph-3d`'s re-export in V1; evaluate deduplication if needed |
| `nodeThreeObject` called on every tick when `nodeThreeObjectExtend: true` | Memoize mesh creation per node ID; return cached mesh, mutate material in place |
| Path animation particles limited to `react-force-graph-3d` built-ins — may look coarse | Acceptable for V1; custom shader particles in Phase 5 if needed |
| JSON-LD transform logic is untested until graph data exists | Write unit tests against a fixture subset of `graph.jsonld` (task 6.1–6.5) |
| Mobile `window.innerWidth` check fires after first paint, causing flash | Acceptable trade-off vs. SSR complexity; can add a CSS media query skeleton as a polish pass |

---

## Open Questions

- [x] **Color tokens** — define palette in `frontend/src/styles/tokens.css` as CSS custom properties (`--color-warm`, `--color-cool`, etc.). Read them once at module load via `getComputedStyle(document.documentElement)` and pass the resolved hex strings to Three.js materials. This keeps colors themeable without runtime CSS var reads per frame.
- [x] **Artifact shape** — `OctahedronGeometry(1)` is sufficient; no custom star geometry.
- [x] **Highlight pulse** — animate `material.emissiveIntensity` (sine wave, not scale); avoids physics disruption from size changes.
- [x] **Era / Domain nodes** — do NOT render as nodes. `partOfEra` and `inDomain` relationships encode as edge color/style only; Era and Domain instances are filtered out of the nodes array during the JSON-LD transform.
