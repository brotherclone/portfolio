# Change: Add Graph Visualization

## Why

The primary navigation surface of the portfolio is a 3D force-directed graph. Visitors explore 28 years of work spatially — node size, color, shape, and opacity encode meaning from the ontology. The graph also responds to AGUI events from the agent, animating paths and highlighting nodes as the agent reasons.

## What Changes

- Implement `GraphCanvas` component in `frontend/src/components/graph/` using `react-force-graph-3d`
- Encode node visual properties from `gw:nodeWeight`, `gw:category`, entity type
- Implement click → detail panel, hover → tooltip
- Wrap `GraphCanvas` with `withAgui()` to respond to `HIGHLIGHT_NODES`, `ANIMATE_PATH`, `RESET`
- Resolve open question from AGUI spec: `ANIMATE_PATH` payload carries an ordered `nodes: Array<{uri, label}>` sequence; graph infers edges from adjacent pairs
- Implement `DetailPanel` component in `frontend/src/components/detail/`
- Add Next.js app shell and install `react-force-graph-3d`
- Mobile fallback: 2D force graph when `window.innerWidth < 768`

## Impact

- Affected specs: `graph-visualization` (new)
- Affected code: `frontend/src/components/graph/`, `frontend/src/components/detail/`, `frontend/src/app/`, `frontend/package.json`
- New dependencies: `react-force-graph-3d`, `react-force-graph` (2D fallback), `next@15`, `react`, `react-dom`
- Resolves open question in `add-agui-layer` design.md: `ANIMATE_PATH` node sequence format
