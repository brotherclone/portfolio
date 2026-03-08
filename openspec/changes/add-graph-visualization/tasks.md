## 1. Dependencies & App Shell

- [ ] 1.1 Add `next@15`, `react`, `react-dom`, `react-force-graph-3d`, `react-force-graph` to `frontend/package.json`
- [ ] 1.2 Scaffold Next.js 15 App Router shell: `frontend/src/app/layout.tsx`, `frontend/src/app/page.tsx`
- [ ] 1.3 Configure `tsconfig.json` for Next.js paths

## 2. Graph Canvas

- [ ] 2.1 Implement `GraphCanvas` in `frontend/src/components/graph/GraphCanvas.tsx` — loads JSON-LD graph data, renders with `react-force-graph-3d`
- [ ] 2.2 Implement node size encoding: map `nodeWeight` (or normalised `depthYears`) to Three.js geometry scale
- [ ] 2.3 Implement node color encoding: `category` → palette token (`design`=warm, `development`=cool, `strategy`=neutral, `artifact`=gold)
- [ ] 2.4 Implement node shape encoding: entity type → geometry (`Concept`=sphere, `Project`=box, `Organization`=torus, `Artifact`=star)
- [ ] 2.5 Implement node opacity encoding: era recency → opacity (current=1.0, earliest≈0.5)
- [ ] 2.6 Implement edge color encoding: relationship type → distinct color per `ledTo`, `evidencedBy`, `partOfEra`
- [ ] 2.7 Implement mobile fallback: render `react-force-graph` (2D) when `window.innerWidth < 768`

## 3. Interaction

- [ ] 3.1 Implement click handler → open `DetailPanel` with entity data
- [ ] 3.2 Implement hover handler → show tooltip with `label` + truncated `summary` after 300ms
- [ ] 3.3 Implement close: Escape key + outside click dismisses `DetailPanel`

## 4. Detail Panel

- [ ] 4.1 Implement `DetailPanel` in `frontend/src/components/detail/DetailPanel.tsx`
- [ ] 4.2 Render `label`, `summary`, `detail` (if non-confidential), artifact link (if present)
- [ ] 4.3 Never render `detail` when `confidential: true`

## 5. AGUI Integration

- [ ] 5.1 Wrap `GraphCanvas` with `withAgui()` HOC
- [ ] 5.2 Respond to `HIGHLIGHT_NODES`: emphasise listed URIs, dim others
- [ ] 5.3 Respond to `ANIMATE_PATH`: animate directional pulse along inferred edge sequence
- [ ] 5.4 Respond to `RESET`: restore all nodes and edges to default visual state

## 6. Tests

- [ ] 6.1 Unit test: node size encoding — higher `nodeWeight` produces larger scale value
- [ ] 6.2 Unit test: confidential node — `DetailPanel` renders `summary` only, no `detail`
- [ ] 6.3 Unit test: `HIGHLIGHT_NODES` event — listed URIs flagged as highlighted, others dimmed
- [ ] 6.4 Unit test: `ANIMATE_PATH` payload — adjacent node pairs correctly inferred as edge sequence
- [ ] 6.5 Unit test: `RESET` event clears highlight and animation state
