# mcp-server Specification

## Purpose
TBD - created by archiving change add-mcp-server. Update Purpose after archive.
## Requirements
### Requirement: query_graph Tool
The MCP server SHALL expose a `query_graph` tool that accepts a SPARQL SELECT string and returns matching rows as a list of binding dicts. Non-SELECT queries MUST be rejected. Confidential filtering MUST suppress `gw:detail` values on subjects where `gw:confidential true`.

#### Scenario: Valid SELECT query
- **WHEN** `query_graph` is called with a valid SPARQL SELECT string
- **THEN** it returns a list of binding dicts corresponding to the query results

#### Scenario: Write query rejected
- **WHEN** `query_graph` is called with an INSERT, DELETE, or other write operation
- **THEN** the tool raises a validation error before executing against the store

#### Scenario: Confidential subject
- **WHEN** a result row includes a subject with `gw:confidential true`
- **THEN** `gw:detail` is absent from that row and `gw:summary` remains present

---

### Requirement: get_entity Tool
The MCP server SHALL expose a `get_entity` tool that accepts an entity URI string and returns all non-confidential properties and outgoing edges for that entity as a dict.

#### Scenario: Known entity
- **WHEN** `get_entity` is called with a valid entity URI (e.g. `gwi:proj_oracle_ontology`)
- **THEN** it returns a dict with `uri`, `type`, `label`, `summary`, and all outgoing relationship targets

#### Scenario: Confidential entity
- **WHEN** the entity has `gw:confidential true`
- **THEN** `gw:detail` is absent; `gw:summary`, type, label, and edges are present

#### Scenario: Unknown entity
- **WHEN** the URI matches no subject in the store
- **THEN** the tool returns an empty dict

---

### Requirement: traverse Tool
The MCP server SHALL expose a `traverse` tool that accepts an entity URI and a predicate URI (or local name) and returns the list of target entity URIs reachable in one hop.

#### Scenario: Outgoing edges exist
- **WHEN** `traverse` is called with `(gwi:proj_lego_digital, gw:involvedConcept)`
- **THEN** it returns a list containing the URIs of all linked Concept nodes

#### Scenario: No matching edges
- **WHEN** no triples match the subject + predicate
- **THEN** the tool returns an empty list

---

### Requirement: find_path Tool
The MCP server SHALL expose a `find_path` tool that accepts two entity URIs and returns the shortest connecting path as an ordered list of `{uri, label}` dicts. If no path exists within a reasonable depth limit (≤ 6 hops), the tool returns an empty list.

#### Scenario: Path exists
- **WHEN** `find_path` is called with `(gwi:era_lego, gwi:era_agentic)`
- **THEN** it returns an ordered list of node dicts tracing the connection through concept nodes

#### Scenario: No path within depth limit
- **WHEN** no path connects the two URIs within 6 hops
- **THEN** the tool returns an empty list

---

### Requirement: MCP Endpoint
The FastAPI app SHALL mount the MCP server at `POST /api/mcp` and expose all four tools. The endpoint MUST apply the same CORS policy as `/api/graph` (Vercel origin + localhost:3000).

#### Scenario: Tool invocation via HTTP
- **WHEN** a POST request is made to `/api/mcp` with a valid MCP tool-call payload
- **THEN** the response contains the tool result in MCP response format

#### Scenario: Unknown tool
- **WHEN** the payload references a tool name not in `{query_graph, get_entity, traverse, find_path}`
- **THEN** the server returns a 404 or MCP error response

