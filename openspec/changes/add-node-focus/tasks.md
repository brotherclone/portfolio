# Tasks: add-node-focus

## 1. Protocol

### [ ] Task 1.1 — Add FocusNodeEvent to agui.ts
Add `FocusNodeEvent` type `{ type: 'FOCUS_NODE'; payload: { uri: string; label: string } }` to `frontend/src/lib/agui.ts` and include it in the `AguiEvent` union.

**Validates:** agui-protocol Requirement: FocusNodeEvent

---

## 2. Graph — Camera Focus

### [ ] Task 2.1 — Handle FOCUS_NODE in GraphCanvas
In `GraphCanvas.tsx`:
- Extend `graphRef` type to include `cameraPosition(pos: object, lookAt: object, duration: number): void`
- In the `latestEvent` effect, handle `FOCUS_NODE`: find the node by URI in `graphData.nodes`, guard on `x !== undefined`, call `graphRef.current.cameraPosition({ x, y, z: z + 200 }, { x, y, z }, 800)`

**Validates:** graph-visualization Requirement: AGUI — Focus Node

---

## 3. Primitives — Click Dispatch

### [ ] Task 3.1 — EntityCard dispatches FOCUS_NODE on click
In `EntityCard.tsx`, wrap the card root in a button or add `onClick` that calls `dispatchAguiEvent({ type: 'FOCUS_NODE', payload: { uri, label } })`. Add `cursor: pointer` to `EntityCard.module.css`.

**Validates:** agent-ui-primitives Requirement: EntityCard primitive (click scenario)

### [ ] Task 3.2 — PathSummary chips dispatch FOCUS_NODE on click
In `PathSummary.tsx`, make each chip a `<button>` (or add `onClick` to the chip element) that calls `dispatchAguiEvent({ type: 'FOCUS_NODE', payload: { uri: node.uri, label: node.label } })`. Add `cursor: pointer` to chip styles.

**Validates:** agent-ui-primitives Requirement: PathSummary primitive (chip click scenario)

---

## 4. Tests

### [ ] Task 4.1 — Unit: FocusNodeEvent type narrowing
Extend `agui.test.ts` with a FOCUS_NODE narrowing scenario.

### [ ] Task 4.2 — Unit: EntityCard and PathSummary click dispatch
Extend `primitives.test.ts`: simulate click on EntityCard and a PathSummary chip, assert `dispatchAguiEvent` is called with correct FOCUS_NODE payload.

---

## Dependencies / Sequencing
- Task 1.1 must complete before 2.1, 3.1, 3.2 (all depend on the new event type)
- Tasks 2.1, 3.1, 3.2 can run in parallel after 1.1
- Tasks 4.1 depends on 1.1; 4.2 depends on 3.1 and 3.2
