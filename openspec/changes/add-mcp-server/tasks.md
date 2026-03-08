## 1. Tool Implementations

- [ ] 1.1 Implement `query_graph(sparql: str) → list[dict]` in `backend/mcp/tools.py` — delegates to `GraphStore.query()`, applies confidential filter
- [ ] 1.2 Implement `get_entity(uri: str) → dict` — fetches all triples for subject URI, applies confidential filter
- [ ] 1.3 Implement `traverse(uri: str, predicate: str) → list[str]` — returns target URIs for one-hop outgoing edges
- [ ] 1.4 Implement `find_path(from_uri: str, to_uri: str) → list[dict]` — BFS over graph up to 6 hops, returns ordered `{uri, label}` list

## 2. Pydantic Schemas

- [ ] 2.1 Define input/output Pydantic v2 models for all four tools in `backend/mcp/tools.py`
- [ ] 2.2 Add SELECT-only guard to `query_graph` input validator (reuse `_WRITE_KEYWORDS` from `main.py`)

## 3. MCP Endpoint

- [ ] 3.1 Register all four tools with the MCP server instance in `backend/mcp/tools.py`
- [ ] 3.2 Mount MCP server at `POST /api/mcp` in `backend/main.py`
- [ ] 3.3 Confirm CORS middleware covers `/api/mcp` (already applied globally — verify)

## 4. Tests

- [ ] 4.1 Unit test: `query_graph` returns expected rows for era seed data
- [ ] 4.2 Unit test: `query_graph` rejects write queries
- [ ] 4.3 Unit test: `get_entity` returns summary but not detail for confidential project
- [ ] 4.4 Unit test: `traverse` follows `involvedConcept` edges from a known project
- [ ] 4.5 Unit test: `find_path` returns correct path between `era_lego` and `era_agentic`
- [ ] 4.6 Integration test: `POST /api/mcp` with `get_entity` payload returns valid MCP response
