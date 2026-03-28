# Change: Add node focus via chat links

## Why
The chat panel renders EntityCard and PathSummary primitives that reference graph nodes, but clicking them does nothing. Users have no direct way to navigate the 3D graph to a node they read about in the chat — the two surfaces are visually disconnected.

## What Changes
- Add `FocusNodeEvent` to the AGUI event union (`type: "FOCUS_NODE"`, payload `{ uri, label }`)
- `EntityCard` and `PathSummary` chips dispatch `FOCUS_NODE` onto `aguiBus` when clicked
- `GraphCanvas` handles `FOCUS_NODE` by flying the camera to that node's current simulation position

## Impact
- Affected specs: `agui-protocol`, `graph-visualization`, `agent-ui-primitives`
- Affected code: `frontend/src/lib/agui.ts`, `frontend/src/components/graph/GraphCanvas.tsx`, `frontend/src/components/primitives/EntityCard.tsx`, `frontend/src/components/primitives/PathSummary.tsx`
- No backend changes required — `FOCUS_NODE` is a frontend-only event dispatched by UI interactions
