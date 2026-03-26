# agui-protocol Specification

## Purpose
Typed event protocol bridging the LangGraph backend agent to the frontend graph visualization and chat panel. All AGUI events are streamed as SSE from `POST /api/agent`.

## Requirements
### Requirement: AGUI Event Types
The system SHALL define a typed AGUI event protocol in `frontend/src/lib/agui.ts` covering all events the agent can emit. Every event MUST have a `type` discriminant and a typed `payload`. The union SHALL include: `HighlightNodesEvent`, `AnimatePathEvent`, `StreamTextEvent`, `ResetEvent`, `RenderEntityCardEvent`, `RenderPathSummaryEvent`.

`RenderEntityCardEvent` payload: `{ uri, label, type, summary, detail?, url?, mediaType? }`.
`RenderPathSummaryEvent` payload: `{ nodes: Array<{ uri, label, type? }> }`.

#### Scenario: Event union is exhaustive
- **WHEN** the frontend receives an SSE message
- **THEN** it can be narrowed to one of the six event types without a catch-all branch

#### Scenario: EntityCard event is narrowable
- **WHEN** an SSE message arrives with `type: "RENDER_ENTITY_CARD"`
- **THEN** it narrows to `RenderEntityCardEvent` without a catch-all

#### Scenario: PathSummary event is narrowable
- **WHEN** an SSE message arrives with `type: "RENDER_PATH_SUMMARY"`
- **THEN** it narrows to `RenderPathSummaryEvent` without a catch-all

#### Scenario: Confidential entity card omits detail
- **WHEN** the backend emits a `RENDER_ENTITY_CARD` for a confidential entity
- **THEN** the payload does NOT include a `detail` field

#### Scenario: Unknown event type
- **WHEN** an SSE message arrives with an unrecognised `type` field
- **THEN** the listener discards it without throwing

---

### Requirement: AguiEventListener
The system SHALL implement `AguiEventListener` in `frontend/src/lib/agui.ts` — a class that opens a fetch-based SSE connection to `POST /api/agent`, parses incoming events into the typed union, and publishes them onto the module-level `aguiBus`. It SHALL accept both a `message` string and a `session_id` string, passing both in the request body.

#### Scenario: Successful connection
- **WHEN** `AguiEventListener` is initialised with a message and session_id, then `start()` is called
- **THEN** it opens an SSE connection and begins dispatching typed events onto `aguiBus`

#### Scenario: Connection drop and retry
- **WHEN** the SSE connection closes unexpectedly before a `ResetEvent` is received
- **THEN** the listener retries with exponential backoff up to 3 attempts before emitting a `RESET` to signal failure

#### Scenario: Clean teardown
- **WHEN** `stop()` is called
- **THEN** the SSE connection is aborted and no further events are dispatched

---

### Requirement: Session Identity
The system SHALL implement a `useSession()` hook in `frontend/src/lib/useSession.ts` that generates a `session_id` (UUID v4) once per page load using `crypto.randomUUID()` and returns it stably for the component's lifetime. The `session_id` SHALL be passed to `AguiEventListener` on every conversation turn so the backend can maintain multi-turn context.

#### Scenario: Stable session across turns
- **WHEN** a user sends multiple messages in the same page session
- **THEN** each `AguiEventListener` call receives the same `session_id`

#### Scenario: New session on page load
- **WHEN** the page is reloaded
- **THEN** a new `session_id` is generated, starting a fresh conversation context on the backend

---

### Requirement: withAgui Component Factory
The system SHALL implement a `withAgui(Component)` HOC in `frontend/src/components/agent/` that wraps any React component and injects two props: `aguiEvents: AguiEvent[]` (accumulated event history for the current turn) and `latestEvent: AguiEvent | null`. The wrapped component re-renders on each new event.

#### Scenario: Graph component receives highlight event
- **WHEN** the agent emits a `HIGHLIGHT_NODES` event
- **THEN** the wrapped graph component re-renders with the new event in `aguiEvents` and `latestEvent` set

#### Scenario: Isolation between wrapped components
- **WHEN** two components are both wrapped with `withAgui()`
- **THEN** each receives the same event stream independently without shared mutable state

#### Scenario: Reset clears event history
- **WHEN** the agent emits a `RESET` event
- **THEN** `aguiEvents` is cleared to `[]` and `latestEvent` is `null` on next render

