# Design: Node focus via chat links

## Context
`react-force-graph-3d` exposes a `cameraPosition(position, lookAt, durationMs)` method on its ref. After the force simulation runs, each node object is mutated in place with `x`, `y`, `z` coordinates. `GraphCanvas` already holds a `graphRef` — we can call `graphRef.current.cameraPosition(...)` at any time to fly the camera.

`aguiBus` is a module-level `EventTarget` shared by all components. `ChatPanel` already dispatches and listens to events on it. `GraphCanvas` already handles `HIGHLIGHT_NODES`, `ANIMATE_PATH`, and `RESET` via the `withAgui` HOC.

## Goals / Non-Goals
- Goals: clicking a node reference in the chat flies the 3D graph camera to that node
- Non-Goals: auto-focus on `HIGHLIGHT_NODES`; backend emitting `FOCUS_NODE`; 2D renderer camera control (nodes are small, graph is flat — skip for now)

## Decisions

**Decision: `FOCUS_NODE` as a new AGUI event type**
- Keeps the primitives decoupled from `GraphCanvas` — they call `dispatchAguiEvent` without knowing anything about the graph
- Consistent with the existing event-bus pattern
- Alternatives considered: prop drilling an `onNodeFocus` callback down from `page.tsx` — rejected as it requires threading through `ChatPanel` → `EntityCard`/`PathSummary`, coupling unrelated layers

**Decision: frontend-only dispatch, no backend emission**
- `FOCUS_NODE` is a UI navigation intent, not an agent output
- Keeps the backend streaming protocol focused on data events

**Decision: node lookup by URI from `graphData.nodes`**
- `react-force-graph-3d` mutates node objects in place with simulation positions
- `graphData.nodes` already holds these references, so `nodes.find(n => n.id === uri)` gives us `{x, y, z}` without extra bookkeeping

**Decision: skip 2D renderer focus**
- `react-force-graph` 2D uses `centerAt(x, y, duration)` but the mobile 2D view is a fallback; adding focus there is low value for now

## Camera fly-to parameters
- Distance from node: `200` (camera orbits at ~200 units back from the target)
- Transition duration: `800ms`
- LookAt: the node's `{x, y, z}` position

## Risks / Trade-offs
- If the simulation hasn't settled when a click arrives, `x/y/z` may be `undefined` or near origin — guard with a nil check and silently skip
- `graphRef` is typed loosely (`{ refresh(): void }`) — extend the ref type to include `cameraPosition`
