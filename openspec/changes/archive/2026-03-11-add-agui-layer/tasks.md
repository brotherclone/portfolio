## 1. Frontend — Event Protocol

- [x] 1.1 Define AGUI event types in `frontend/src/lib/agui.ts`: `HighlightNodesEvent`, `AnimatePathEvent`, `StreamTextEvent`, `ResetEvent`, `AguiEvent` union
- [x] 1.2 Implement `AguiEventListener` — SSE connection to `/api/agent`, typed event dispatch, retry on drop (3 attempts, exponential backoff)
- [x] 1.3 Update `AguiEventListener` to accept and pass `session_id` in the POST body

## 2. Frontend — Component Factory

- [x] 2.1 Implement `withAgui(Component)` HOC in `frontend/src/components/agent/withAgui.tsx` — injects `aguiEvents` and `latestEvent` props via module-level `aguiBus`
- [x] 2.2 Clear `aguiEvents` on `RESET` event
- [x] 2.3 Export `withAgui` from `frontend/src/components/agent/index.ts`
- [x] 2.4 Implement `useSession()` hook in `frontend/src/lib/useSession.ts` — generates `crypto.randomUUID()` once per page load, returns stable `session_id`

## 3. Backend — LangGraph Agent

- [x] 3.1 Add `langgraph`, `langchain-anthropic`, `langchain-core` to `backend/pyproject.toml`
- [x] 3.2 Implement `StateGraph` in `backend/agent/graph_agent.py` with nodes: `call_tools`, `synthesise`, `emit_reset`
- [x] 3.3 Implement MCP tool stubs (`query_graph`, `get_entity`, `traverse`, `find_path`) in `backend/mcp/tools.py` backed by the existing `GraphStore`
- [x] 3.4 Emit `HIGHLIGHT_NODES` (URIs) after `find_path` / `traverse` tool results
- [x] 3.5 Emit `ANIMATE_PATH` (`nodes: [{uri, label}]`) after `find_path` returns an ordered path
- [x] 3.6 Emit `STREAM_TEXT` chunks during synthesis node
- [x] 3.7 Emit `RESET` on turn completion
- [x] 3.8 Wire `MemorySaver` checkpointer keyed by `session_id` (`thread_id`) for multi-turn memory

## 4. Backend — Streaming Endpoint

- [x] 4.1 Implement `POST /api/agent` SSE endpoint in `backend/main.py` using `StreamingResponse`
- [x] 4.2 Validate request body (`message: str` required, `session_id: str` required — 422 on empty/missing)
- [x] 4.3 Stream AGUI events as `data: <json>\n\n` SSE format until agent emits `RESET`
- [x] 4.4 Update CORS middleware to allow `POST` from frontend origin

## 5. Tests

- [x] 5.1 Unit test: `AguiEventListener` dispatches typed events from mock SSE responses
- [x] 5.2 Unit test: `withAgui` accumulates events in `aguiEvents` and clears on `RESET`
- [x] 5.3 Unit test: agent emits `HIGHLIGHT_NODES` before `STREAM_TEXT` for a `find_path` query
- [x] 5.4 Unit test: confidential entity — agent synthesis contains no `gw:detail` content
- [x] 5.5 Integration test: `POST /api/agent` streams valid SSE and closes after `RESET`
