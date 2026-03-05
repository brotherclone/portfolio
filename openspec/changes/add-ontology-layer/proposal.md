# Change: Add Ontology Layer

## Why

The portfolio's knowledge graph is the product. Nothing else can be built — visualization, MCP server, AGUI agent — until the ontology schema, RDF generation pipeline, and SPARQL query layer exist. This is Phase 1.

## What Changes

- Define the LinkML YAML schema as the single source of truth for all entity types, properties, and relationships
- Generate `portfolio.ttl` (OWL), `entities.py` (Pydantic v2), `context.jsonld`, and `types.ts` from the schema via the LinkML toolchain
- Load the TTL into a pyoxigraph in-memory store at FastAPI startup
- Expose `/api/graph` as a SPARQL query endpoint returning JSON-LD
- Enforce the `gw:confidential` gate at the API layer — `gw:detail` withheld, node + edges + `gw:summary` always returned

## Impact

- Affected specs: `ontology-layer` (new capability)
- Affected code: `schema/portfolio.yml` (LinkML source), `backend/store/oxigraph.py`, `backend/main.py`, `scripts/generate.py`
- Downstream: graph-visualization, mcp-server, agui-agent all depend on this landing first
