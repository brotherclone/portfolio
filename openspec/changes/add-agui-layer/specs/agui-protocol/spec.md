## ADDED Requirements

### Requirement: AGUI Event Types
The system SHALL define a typed AGUI event protocol in `frontend/src/lib/agui.ts` covering all events the agent can emit. Every event MUST have a `type` discriminant and a typed `payload`.

#### Scenario: Event union is exhaustive
- **WHEN** the frontend receives an SSE message
- **THEN** it can be narrowed to one of `HighlightNodesEvent | AnimatePathEvent | StreamTextEvent | ResetEvent` without a catch-all branch

#### Scenario: Unknown event type
- **WHEN** an SSE message arrives with an unrecognised `type` field
- **THEN** the listener discards it without throwing

---

### Requirement: AguiEventListener
The system SHALL implement `AguiEventListener` in `frontend/src/lib/agui.ts` — a class or function that opens an SSE connection to `/api/agent`, parses incoming events into the typed union, and exposes a subscription interface (`subscribe(handler)` / `unsubscribe()`).

#### Scenario: Successful connection
- **WHEN** `AguiEventListener` is initialised with a user message payload
- **THEN** it opens an SSE connection and begins emitting typed events to all subscribers

#### Scenario: Connection drop and retry
- **WHEN** the SSE connection closes unexpectedly before a `ResetEvent` is received
- **THEN** the listener retries with exponential backoff up to 3 attempts before emitting an error

#### Scenario: Clean teardown
- **WHEN** `unsubscribe()` is called
- **THEN** the SSE connection is closed and no further events are delivered

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
