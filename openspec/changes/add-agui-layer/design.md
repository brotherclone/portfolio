## Context

The portfolio agent traverses the knowledge graph and answers questions conversationally while simultaneously driving the 3D graph visualization. Two systems need to stay in sync in real time: the chat panel (streaming text) and the graph (node highlights, path animations). AG-UI protocol is the event layer that decouples them.

## Goals / Non-Goals

- Goals: typed event protocol, SSE streaming from LangGraph agent, frontend component factory that makes any component AGUI-aware, graph viz and chat UI both subscribing to same stream, multi-turn conversation memory within a session
- Non-Goals: WebSocket (SSE is sufficient for V1 unidirectional flow), persistent conversation history across browser sessions

## Decisions

- **SSE over WebSocket** — agent-to-client is unidirectional; SSE is simpler, works over HTTP/2, no upgrade handshake. Revisit if bidirectional agent feedback is needed.

- **LangGraph StateGraph** — gives explicit node-level control over when AGUI events fire (emit `HIGHLIGHT_NODES` after `find_path` tool node returns, emit `STREAM_TEXT` in synthesis node). More predictable than vanilla LangChain expression language for event timing.

- **`withAgui()` HOC factory with module-level event bus** — the HOC wraps any component and injects `aguiEvents: AguiEvent[]` and `latestEvent: AguiEvent | null`. Internally it subscribes to a module-level `aguiBus` (`EventTarget`) that `AguiEventListener` publishes onto. This keeps components decoupled from the SSE transport while allowing multiple wrapped components (graph canvas, chat panel) to share the same stream without prop drilling or context providers.

- **Single SSE stream per conversation turn** — one `POST /api/agent` per user message; stream closes when agent emits `RESET`. No persistent connection between turns.

- **Session ID for multi-turn memory** — a UUID `session_id` is generated client-side on first message and stored in component state for the lifetime of the page. It is passed in every `POST /api/agent` body alongside `message`. The backend uses it as the LangGraph `thread_id` for `MemorySaver` checkpointing, enabling the agent to reference prior turns within a session. Sessions are in-memory only — they do not survive a backend restart, which is acceptable for V1.

  - Request body: `{ "message": string, "session_id": string }`
  - Frontend generates: `crypto.randomUUID()` on first send, stored in `useRef`
  - Backend stores: LangGraph `MemorySaver` keyed by `thread_id = session_id`

- **`ANIMATE_PATH` payload** — resolved by graph viz spec: carries `nodes: Array<{uri: string, label: string}>` as an ordered list; the frontend infers edges from adjacent pairs. The backend emits this after a `find_path` or `traverse` call returns a node sequence.

## Risks / Trade-offs

- SSE requires reconnect logic on the client if the connection drops mid-stream → mitigate with exponential backoff retry (3 attempts) and a `RESET` event to clear stale state
- LangGraph tool node ordering must match AGUI event semantics (highlight before text) → enforce via explicit node sequencing in the graph definition
- `MemorySaver` is in-process only — Railway restarts clear all session state → acceptable for V1; upgrade to `SqliteSaver` in a later phase if persistence is needed

## Open Questions

- [x] `ANIMATE_PATH` payload shape — `nodes: Array<{uri, label}>`, edges inferred from adjacent pairs (resolved in graph-visualization spec)
- [x] Session ID / multi-turn — yes, enable via `session_id` in request body + LangGraph `MemorySaver` (resolved above)
