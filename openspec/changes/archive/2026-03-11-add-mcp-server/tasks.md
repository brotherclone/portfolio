## 1. Tool Implementations

- [x] 1.1 Implement `query_graph(sparql: str) → list[dict]` in `backend/mcp/tools.py` — delegates to `GraphStore.query()`, applies confidential filter
- [x] 1.2 Implement `get_entity(uri: str) → list[dict]` — fetches all triples for subject URI, applies confidential filter (BIND ?s so _is_detail_leak fires correctly)
- [x] 1.3 Implement `traverse(uri: str, predicate: str) → list[str]` — returns target URIs for one-hop outgoing edges
- [x] 1.4 Implement `find_path(from_uri: str, to_uri: str) → list[dict]` — BFS over graph up to 6 hops, returns ordered `{uri, label}` list

## 2. Pydantic Schemas

- [x] 2.1 Define input/output Pydantic v2 models for all four tools in `backend/mcp/tools.py`
- [x] 2.2 Add SELECT-only guard to `query_graph` input validator (reuse `_WRITE_KEYWORDS` from `main.py`)

## 3. MCP Endpoint

- [x] 3.1 Register all four tools with the MCP server instance in `backend/mcp/tools.py`
- [x] 3.2 Mount MCP server at `POST /api/mcp` in `backend/main.py`
- [x] 3.3 Confirm CORS middleware covers `/api/mcp` (already applied globally — verified)

## 4. Tests

- [x] 4.1 Unit test: `query_graph` returns expected rows for era seed data
- [x] 4.2 Unit test: `query_graph` rejects write queries
- [x] 4.3 Unit test: `get_entity` returns summary but not detail for confidential project
- [x] 4.4 Unit test: `traverse` follows `involvedConcept` edges from a known project
- [x] 4.5 Unit test: `find_path` returns correct path between two connected concepts (era nodes have no outgoing IRI edges; used concept_experienceIntegration → concept_agenticArchitecture)
- [x] 4.6 Integration test: `POST /api/mcp` with `get_entity` payload returns valid MCP response
