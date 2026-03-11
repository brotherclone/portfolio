# Change: Add AGUI Layer

## Why

The portfolio's conversational interface requires a bidirectional bridge between a LangGraph agent (backend) and the graph visualization + chat UI (frontend). AG-UI protocol provides the streaming event model; this change wires the full stack — typed event protocol, frontend listener/factory, backend agent endpoint.

## What Changes

**Frontend**
- Define the typed AGUI event protocol in `frontend/src/lib/agui.ts` (`HIGHLIGHT_NODES`, `ANIMATE_PATH`, `STREAM_TEXT`, `RESET`)
- Implement `AguiEventListener` — connects to SSE stream, parses and dispatches typed events
- Implement `withAgui()` component factory — HOC that injects AGUI event stream props into any wrapped component (graph viz, chat panel)

**Backend**
- Implement `backend/agent/graph_agent.py` — LangGraph `StateGraph` agent with MCP tools (`query_graph`, `get_entity`, `traverse`, `find_path`) wired as tool nodes
- Implement `POST /api/agent` SSE endpoint in `backend/main.py` — streams AGUI events as Server-Sent Events
- Agent emits AGUI events at each reasoning step: node/path highlight events alongside streamed text

## Impact

- Affected specs: `agui-protocol` (new), `agui-agent` (new)
- Affected code: `frontend/src/lib/agui.ts`, `frontend/src/components/agent/`, `backend/agent/graph_agent.py`, `backend/main.py`
- New dependencies: `@ag-ui-protocol/client` (frontend), `langgraph` (backend)
