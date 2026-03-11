# agui-agent Specification

## Purpose
TBD - created by archiving change add-agui-layer. Update Purpose after archive.
## Requirements
### Requirement: LangGraph Agent
The system SHALL implement a LangGraph `StateGraph` agent in `backend/agent/graph_agent.py` with the four MCP tools (`query_graph`, `get_entity`, `traverse`, `find_path`) wired as tool nodes. The agent SHALL emit AGUI events at defined points in its reasoning cycle. The agent SHALL use a `MemorySaver` checkpointer keyed by `session_id` (as `thread_id`) to maintain conversation context across multiple turns within a session.

#### Scenario: Tool call emits graph event
- **WHEN** the agent calls `find_path` and receives a result
- **THEN** it emits a `HIGHLIGHT_NODES` event containing the returned URI list before synthesising the text response

#### Scenario: find_path emits animate path
- **WHEN** the agent calls `find_path` and the result is an ordered node sequence
- **THEN** it emits an `ANIMATE_PATH` event with `nodes: [{uri, label}]` before synthesising

#### Scenario: Synthesis emits stream text
- **WHEN** the agent enters the synthesis node
- **THEN** it emits one or more `STREAM_TEXT` events as the response is generated, each carrying a text chunk

#### Scenario: Turn completion emits reset
- **WHEN** the agent finishes a full reasoning turn
- **THEN** it emits a `RESET` event to signal stream end

#### Scenario: Confidential entity in path
- **WHEN** a tool result includes a confidential entity
- **THEN** the agent uses only `gw:summary` and relationship edges in its synthesis; `gw:detail` is never included in emitted text

---

### Requirement: AGUI Streaming Endpoint
The FastAPI app SHALL expose `POST /api/agent` as a Server-Sent Events endpoint. The request body MUST include a `message` string and a `session_id` string. The response MUST stream AGUI events as SSE messages until the agent emits `RESET`, then close the connection. The `session_id` is used as the LangGraph `thread_id` to enable multi-turn conversation memory within a session.

#### Scenario: Valid request initiates stream
- **WHEN** `POST /api/agent` is called with `{"message": "What connects LEGO to your current work?", "session_id": "<uuid>"}`
- **THEN** the response is `Content-Type: text/event-stream` and events begin streaming within 2 seconds

#### Scenario: Multi-turn context retained
- **WHEN** a second message is sent with the same `session_id`
- **THEN** the agent can reference content from the prior turn in its response

#### Scenario: Empty message rejected
- **WHEN** the request body has an empty or missing `message` field
- **THEN** the server returns HTTP 422 before opening the stream

#### Scenario: Missing session_id rejected
- **WHEN** the request body has a missing `session_id` field
- **THEN** the server returns HTTP 422 before opening the stream

#### Scenario: CORS policy applied
- **WHEN** a preflight request is made from the Vercel origin or localhost:3000
- **THEN** the endpoint responds with the correct CORS headers

