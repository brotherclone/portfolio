# chat-panel Specification

## Purpose
A floating chat panel anchored to the bottom-left of the viewport, positioned beneath the intro title text. Visitors type a message; the panel streams the agent's response (text + inline primitives) in real time via the AGUI event bus.

## ADDED Requirements

### Requirement: ChatPanel component
The system SHALL implement `frontend/src/components/chat/ChatPanel.tsx` — a React component wrapped with `withAgui()` that manages the full conversation turn lifecycle: capturing user input, instantiating `AguiEventListener`, displaying the streaming response, and rendering inline primitives.

`ChatPanel` SHALL use `useSession()` to maintain a stable `session_id` across turns. On submit it SHALL create a new `AguiEventListener(message, sessionId)`, call `.start()`, and call `.stop()` on the previous listener if one is still active.

#### Scenario: User submits a message
- **WHEN** the user types a message and presses Enter or clicks Send
- **THEN** a new `AguiEventListener` is created and `.start()` is called
- **AND** the input field is cleared and disabled until `RESET` is received

#### Scenario: Input disabled during streaming
- **WHEN** the agent is streaming a response
- **THEN** the input field and send button are disabled

#### Scenario: Input re-enabled after reset
- **WHEN** the agent emits `RESET`
- **THEN** the input field is re-enabled and focused

#### Scenario: Empty message rejected
- **WHEN** the user submits an empty or whitespace-only message
- **THEN** no `AguiEventListener` is created and the input field is not cleared

---

## ADDED Requirements

### Requirement: Streaming text display
`ChatPanel` SHALL accumulate `STREAM_TEXT` payloads into a display buffer and render them progressively. The response area SHALL scroll to the bottom as new text arrives.

#### Scenario: Text streams in real time
- **WHEN** `STREAM_TEXT` events arrive
- **THEN** each chunk is appended to the response display without a full re-render of prior text

#### Scenario: New message clears previous response
- **WHEN** the user submits a new message
- **THEN** the previous response (text + primitives) is cleared before the new stream begins

---

## ADDED Requirements

### Requirement: Inline primitive rendering
`ChatPanel` SHALL render `RENDER_ENTITY_CARD` and `RENDER_PATH_SUMMARY` events as typed `ResponseItem` entries in the response list, interspersed with text in emission order. `STREAM_TEXT` events append to the last text item (or create a new one). Each `RENDER_*` event appends a new primitive item.

#### Scenario: EntityCard appears inline
- **WHEN** a `RENDER_ENTITY_CARD` event arrives mid-stream
- **THEN** an `EntityCard` primitive is rendered in the response area at the current position

#### Scenario: PathSummary appears inline
- **WHEN** a `RENDER_PATH_SUMMARY` event arrives
- **THEN** a `PathSummary` primitive is rendered in the response area

#### Scenario: Mixed text and primitives
- **WHEN** the agent emits `STREAM_TEXT`, then `RENDER_ENTITY_CARD`, then more `STREAM_TEXT`
- **THEN** the response area shows: [text chunk 1] [EntityCard] [text chunk 2] in order

---

## ADDED Requirements

### Requirement: Panel layout and positioning
`ChatPanel` SHALL be a fixed overlay anchored to the bottom-left of the viewport via CSS. It SHALL have a maximum width of `28rem` and a maximum height of `60vh` with `overflow-y: auto` on the response area. The panel SHALL use `var(--color-surface)` background, `backdrop-filter: blur`, and `var(--color-border)` border — consistent with `DetailPanel` aesthetics.

#### Scenario: Panel does not obscure graph interaction
- **WHEN** the chat panel is visible
- **THEN** the graph canvas receives pointer events outside the panel bounds

#### Scenario: Panel scrolls when response overflows
- **WHEN** the agent response exceeds the panel height
- **THEN** the response area scrolls independently without affecting the page layout
