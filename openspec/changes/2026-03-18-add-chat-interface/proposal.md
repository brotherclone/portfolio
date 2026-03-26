# Change: Add Chat Interface & Agent UI Primitives

## Why

The AGUI event pipeline is fully implemented on both backend and frontend — but nothing in the browser can trigger it. Visitors have no way to talk to the agent. This change adds the missing chat panel UI and extends the AGUI event protocol with "render" events that let the agent choose to surface structured component primitives (entity cards, path summaries) inline alongside its streamed text response.

## What Changes

**Frontend**
- Replace the lorem ipsum placeholder in `page.tsx` with real intro copy (title + tagline)
- Implement `ChatPanel` component — floating overlay anchored bottom-left, beneath the intro text; holds the input field, streaming text display, and inline rendered primitives; wrapped with `withAgui()`; manages `AguiEventListener` lifecycle; uses `useSession()` for session continuity
- Implement `EntityCard` primitive — compact card rendering an entity's type, label, summary, optional detail, and optional url/media
- Implement `PathSummary` primitive — horizontal node-chip chain visualising an ordered path
- Add `RENDER_ENTITY_CARD` and `RENDER_PATH_SUMMARY` event types to `frontend/src/lib/agui.ts` and extend `AguiEvent` union

**Backend**
- Update `backend/agent/graph_agent.py` to emit `RENDER_ENTITY_CARD` after `get_entity` tool returns a result
- Update `backend/agent/graph_agent.py` to emit `RENDER_PATH_SUMMARY` after `find_path` returns an ordered path (in addition to the existing `ANIMATE_PATH` emission)

## Impact

- Affected specs: `agui-protocol` (modified — new event types), `agui-agent` (modified — new emissions), `chat-panel` (new), `agent-ui-primitives` (new)
- Affected code: `frontend/src/lib/agui.ts`, `frontend/src/app/page.tsx`, `frontend/src/components/chat/`, `frontend/src/components/primitives/`, `backend/agent/graph_agent.py`
- No new dependencies required
