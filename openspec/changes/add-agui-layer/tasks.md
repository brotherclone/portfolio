## 1. Frontend — Event Protocol

- [ ] 1.1 Add `@ag-ui-protocol/client` to `frontend/package.json`
- [ ] 1.2 Define AGUI event types in `frontend/src/lib/agui.ts`: `HighlightNodesEvent`, `AnimatePathEvent`, `StreamTextEvent`, `ResetEvent`, `AguiEvent` union
- [ ] 1.3 Implement `AguiEventListener` — SSE connection to `/api/agent`, typed event dispatch, retry on drop (3 attempts, exponential backoff), `subscribe` / `unsubscribe`

## 2. Frontend — Component Factory

- [ ] 2.1 Implement `withAgui(Component)` HOC in `frontend/src/components/agent/withAgui.tsx` — injects `aguiEvents` and `latestEvent` props
- [ ] 2.2 Clear `aguiEvents` on `RESET` event
- [ ] 2.3 Export `withAgui` from `frontend/src/components/agent/index.ts`

## 3. Backend — LangGraph Agent

- [ ] 3.1 Add `langgraph` to `backend/pyproject.toml`
- [ ] 3.2 Implement `StateGraph` in `backend/agent/graph_agent.py` with nodes: `tool_call`, `synthesise`, `emit_reset`
- [ ] 3.3 Wire MCP tools (`query_graph`, `get_entity`, `traverse`, `find_path`) as tool nodes
- [ ] 3.4 Emit `HIGHLIGHT_NODES` after `find_path` / `traverse` tool results
- [ ] 3.5 Emit `STREAM_TEXT` chunks during synthesis node
- [ ] 3.6 Emit `RESET` on turn completion

## 4. Backend — Streaming Endpoint

- [ ] 4.1 Implement `POST /api/agent` SSE endpoint in `backend/main.py` using `StreamingResponse`
- [ ] 4.2 Validate request body (`message: str` required, 422 on empty/missing)
- [ ] 4.3 Stream AGUI events as `data: <json>\n\n` SSE format until `RESET`

## 5. Tests

- [ ] 5.1 Unit test: `AguiEventListener` dispatches typed events from mock SSE responses
- [ ] 5.2 Unit test: `withAgui` accumulates events in `aguiEvents` and clears on `RESET`
- [ ] 5.3 Unit test: agent emits `HIGHLIGHT_NODES` before `STREAM_TEXT` for a `find_path` query
- [ ] 5.4 Unit test: confidential entity — agent synthesis contains no `gw:detail` content
- [ ] 5.5 Integration test: `POST /api/agent` streams valid SSE and closes after `RESET`
