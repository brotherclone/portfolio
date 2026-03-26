# Tasks: add-chat-interface

## Frontend — Protocol

### [x] Task 1.1 — Extend AGUI event types
Add `RenderEntityCardEvent` and `RenderPathSummaryEvent` to `frontend/src/lib/agui.ts` and extend the `AguiEvent` union. Also updated `AguiEventListener` to use `NEXT_PUBLIC_API_URL` for the agent endpoint.

**Validates:** agui-protocol Requirement: AGUI Event Types (new scenarios)

---

## Frontend — Primitives

### [x] Task 2.1 — Implement `EntityCard`
Created `frontend/src/components/primitives/EntityCard.tsx` and `EntityCard.module.css`. Renders type label, heading, summary, optional detail, optional link/audio. Props typed from `RenderEntityCardEvent['payload']`.

**Validates:** agent-ui-primitives Requirement: EntityCard primitive

### [x] Task 2.2 — Implement `PathSummary`
Created `frontend/src/components/primitives/PathSummary.tsx` and `PathSummary.module.css`. Renders chip sequence with `→` separators, wraps on overflow. Props typed from `RenderPathSummaryEvent['payload']`.

**Validates:** agent-ui-primitives Requirement: PathSummary primitive

### [x] Task 2.3 — Primitives barrel export
Created `frontend/src/components/primitives/index.ts` exporting `EntityCard` and `PathSummary`.

**Validates:** agent-ui-primitives Requirement: Primitive exports

---

## Frontend — Chat Panel

### [x] Task 3.1 — Implement `ChatPanel`
Created `frontend/src/components/chat/ChatPanel.tsx`.
- Subscribes directly to `aguiBus` (no `withAgui()` HOC needed — ChatPanel manages its own bus subscription)
- `useSession()` for stable session ID
- Input field + Send button; disabled during streaming
- `AguiEventListener` lifecycle (create on submit, stop previous)
- `ResponseItem[]` state model interleaving text and primitives
- `STREAM_TEXT` appends to last text item or creates one
- `RENDER_ENTITY_CARD` / `RENDER_PATH_SUMMARY` append typed primitive items
- `RESET` re-enables input and focuses it

**Validates:** chat-panel Requirements: ChatPanel component, Streaming text display, Inline primitive rendering

### [x] Task 3.2 — ChatPanel layout and CSS
Fixed overlay via container in `page.tsx`, `width: min(28rem, ...)`, `max-height: 40vh` on response area with scroll. Backdrop blur, surface color, border — matching DetailPanel aesthetic.

**Validates:** chat-panel Requirement: Panel layout and positioning

---

## Frontend — Page

### [x] Task 4.1 — Update `page.tsx`
Replaced lorem ipsum with real intro copy (Gabriel Walsh / Creative technologist. Experience architect.). Rendered `ChatPanel` in the same bottom-left float container, below the intro text.

**Validates:** chat-panel Requirement: Panel layout and positioning

---

## Backend — Agent

### [x] Task 5.1 — Emit `RENDER_ENTITY_CARD` after `get_entity`
Extended `on_tool_end` handler in `graph_agent.py`. Added `_extract_entity_card()` helper. Confidentiality gate applied — `detail` omitted when `confidential` is truthy.

**Validates:** agui-agent Requirement: LangGraph Agent — render event emission (get_entity scenarios)

### [x] Task 5.2 — Emit `RENDER_PATH_SUMMARY` after `find_path`
After emitting `ANIMATE_PATH`, also yields `RENDER_PATH_SUMMARY` with the same node list.

**Validates:** agui-agent Requirement: LangGraph Agent — render event emission (find_path scenarios)

---

## Tests

### [x] Task 6.1 — Unit: new AGUI event types
Extended `agui.test.ts` with RENDER_ENTITY_CARD and RENDER_PATH_SUMMARY scenarios. All 42 tests pass.

### [x] Task 6.2 — Unit: EntityCard payload logic
Added `primitives.test.ts` — confidentiality gate, audio mediaType, detail presence/absence.

### [x] Task 6.3 — Unit: ChatPanel response model
Added ResponseItem model tests in `primitives.test.ts` — text appending, primitive insertion, mixed ordering, RESET clearing. All pass.

---

## Dependencies / Sequencing

- Task 1.1 must complete before 2.1, 2.2, 3.1 (they depend on the new event types)
- Tasks 2.1–2.3 can run in parallel
- Task 3.1 depends on 2.3 (primitives barrel), 1.1 (event types)
- Task 3.2 can run in parallel with 3.1
- Task 4.1 depends on 3.1, 3.2
- Tasks 5.1–5.2 are independent of frontend tasks
- Task 6.1 depends on 1.1; 6.2 on 2.1; 6.3 on 3.1
