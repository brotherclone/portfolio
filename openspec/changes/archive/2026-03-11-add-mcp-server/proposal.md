# Change: Add MCP Server

## Why

The portfolio agent needs structured, reusable tools to traverse the knowledge graph — finding entities, following edges, and computing paths between nodes. Exposing these as MCP tools makes the graph queryable by the LangChain agent and optionally by external MCP clients (Claude Desktop, etc.).

## What Changes

- Implement four MCP tools in `backend/mcp/tools.py`: `query_graph`, `get_entity`, `traverse`, `find_path`
- Mount MCP server at `POST /api/mcp` in `backend/main.py`
- Wire tools to the existing `GraphStore` (Oxigraph) instance
- Apply `gw:confidential` filtering in all tool responses (suppress `gw:detail` on confidential subjects)
- Add Pydantic v2 input/output schemas for each tool
- Test all four tools with fixture graph data

## Impact

- Affected specs: `mcp-server` (new capability)
- Affected code: `backend/mcp/tools.py`, `backend/main.py`, `backend/tests/`
