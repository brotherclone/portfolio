## ADDED Requirements

### Requirement: FocusNodeEvent
The system SHALL add `FocusNodeEvent` to the `AguiEvent` union in `frontend/src/lib/agui.ts`. Its payload SHALL be `{ uri: string; label: string }`. It SHALL be dispatched exclusively from the frontend (never emitted by the backend agent) when the user clicks a node reference in the chat panel.

#### Scenario: FocusNodeEvent is narrowable
- **WHEN** an event on `aguiBus` has `type: "FOCUS_NODE"`
- **THEN** it narrows to `FocusNodeEvent` with `payload.uri` and `payload.label` accessible

#### Scenario: Event union remains exhaustive
- **WHEN** `FocusNodeEvent` is added to the union
- **THEN** all existing switch/discriminant type guards continue to compile without a catch-all
