## Context

The portfolio agent traverses the knowledge graph and answers questions conversationally while simultaneously driving the 3D graph visualization. Two systems need to stay in sync in real time: the chat panel (streaming text) and the graph (node highlights, path animations). AG-UI protocol is the event layer that decouples them.

## Goals / Non-Goals

- Goals: typed event protocol, SSE streaming from LangGraph agent, frontend component factory that makes any component AGUI-aware, graph viz and chat UI both subscribing to same stream
- Non-Goals: WebSocket (SSE is sufficient for V1 unidirectional flow), persistent conversation history, multi-turn memory beyond a single session

## Decisions

- **SSE over WebSocket** — agent-to-client is unidirectional; SSE is simpler, works over HTTP/2, no upgrade handshake. Revisit if bidirectional agent feedback is needed.
- **LangGraph StateGraph** — gives explicit node-level control over when AGUI events fire (emit `HIGHLIGHT_NODES` after `find_path` tool node returns, emit `STREAM_TEXT` in synthesis node). More predictable than vanilla LangChain expression language for event timing.
- **`withAgui()` HOC factory** — decouples AGUI subscription logic from component rendering. Graph viz and chat panel both wrap with `withAgui()` and receive a typed `AguiEvent[]` prop; each component decides how to respond. Avoids a global event bus or context threading.
- **Single SSE stream per conversation turn** — one `POST /api/agent` per user message; stream closes when agent completes. No persistent connection between turns.

## Risks / Trade-offs

- SSE requires reconnect logic on the client if the connection drops mid-stream → mitigate with `EventSource` retry and a `RESET` event to clear stale state
- LangGraph tool node ordering must match AGUI event semantics (highlight before text) → enforce via explicit node sequencing in the graph definition

## Open Questions

- Should `ANIMATE_PATH` carry full node+edge sequence or just node URIs? (Depends on what graph viz needs — defer to graph viz spec)
- Session ID / conversation threading across multiple turns?
