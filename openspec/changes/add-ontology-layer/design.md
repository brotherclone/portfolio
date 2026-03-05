# Design: Ontology Layer

## Context

The portfolio schema must be:
- Human-authorable (YAML, not raw Turtle)
- Machine-generatable (Pydantic, TypeScript, OWL, JSON-LD context from one source)
- Queryable at runtime via SPARQL 1.1 without a JVM or external DB
- NDA-safe by construction — confidentiality enforced at the data model level, not in application logic

Stakeholders: sole author (Gabriel Walsh). No multi-tenancy, no auth in Phase 1.

## Goals / Non-Goals

**Goals:**
- Single LinkML YAML → generates all downstream artifacts
- Oxigraph embedded in FastAPI process (no external RDF service)
- `/api/graph` accepts SPARQL SELECT queries, returns JSON-LD
- `gw:confidential true` causes `gw:detail` to be stripped from all responses
- Schema covers: Project, Skill, Concept, Organization, Artifact, Era, Domain + all relationship properties

**Non-Goals:**
- Persistent Oxigraph store (V1 is in-memory — TTL reloaded at startup)
- Authentication / access control beyond confidentiality flag
- SPARQL UPDATE (read-only endpoint)
- GraphDB compatibility (future option, not a Phase 1 requirement)
- Full OWL inference (schema validates structure, not full DL reasoning)

## Decisions

**LinkML over raw TTL authoring**
LinkML YAML generates TTL + Pydantic + JSON-LD + TS types from a single schema. Editing raw Turtle by hand would produce schema drift across layers. LinkML enforces one source of truth.

**pyoxigraph over graphdb / rdflib in-memory**
pyoxigraph embeds in the FastAPI process with no JVM dependency, supports full SPARQL 1.1, and is fast for the data scale of one person's career. rdflib is slower and has incomplete SPARQL 1.1 support. GraphDB remains a local dev option but is not a Phase 1 dependency.

**`gw:workedAt` vs `gw:deliveredFor` — employer/client distinction**
Agency and consulting engagements require separating the billing relationship from the work-product relationship. `gw:workedAt` is the employing organization (Threespot, Huge). `gw:deliveredFor` is the client (RWJ Foundation, AXA Investments). `gw:engagementType` (`"direct"` | `"embedded"` | `"consulting"` | `"freelance"`) characterizes the engagement. Direct employment projects omit `gw:deliveredFor`. Both org nodes appear in the graph, both are traversable by the agent when answering questions about sector or client experience.

**`gw:confidential` gates `gw:detail` only**
Nodes always appear in graph responses. Edges always appear. `gw:summary` always appears. Only `gw:detail` is withheld. This is enforced in the API response serializer, not in SPARQL queries — the store holds full data, the API strips it.

**Static JSON-LD build artifact vs. live SPARQL**
`/api/graph` exposes a live SPARQL endpoint. The frontend also gets a static JSON-LD snapshot at build time (materialized by `scripts/generate.py`) for initial render performance. The live endpoint is used for agent queries.

## Architecture

```
schema/portfolio.yml  (LinkML YAML — source of truth)
    │
    ├─ scripts/generate.py ──► portfolio.ttl     (OWL/RDFS + instance data)
    │                    ──► entities.py         (Pydantic v2)
    │                    ──► context.jsonld      (JSON-LD context)
    │                    ──► types.ts            (TypeScript interfaces)
    │
    └─ backend/store/oxigraph.py
           ├─ loads portfolio.ttl at startup (pyoxigraph Store)
           └─ exposes query(sparql: str) → list[dict]

backend/main.py
    └─ GET /api/graph?q=<sparql>
           ├─ calls oxigraph.query(q)
           ├─ strips gw:detail from results where gw:confidential = true
           └─ returns JSON-LD
```

## Risks / Trade-offs

- **In-memory store** → cold start reloads all data. Acceptable for portfolio scale; migrate to `Store("./portfolio.db")` if needed.
- **SPARQL injection** → `/api/graph` is public read-only. Mitigate by limiting to SELECT queries and validating query strings server-side.
- **LinkML toolchain fragility** → pin `linkml` version in `scripts/pyproject.toml`. Regenerate artifacts in CI on schema change.

## Migration Plan

No migration needed (greenfield). If moving to persistent Oxigraph later: replace `Store()` with `Store("./portfolio.db")` in `backend/store/oxigraph.py` — no API changes.

## Open Questions

- Confirm LinkML `gen-typescript` output shape matches what react-force-graph-3d needs, or write a custom transformer
- Decide initial set of `gwi:concept_*` nodes for concept graph — these are the "soul" and should be complete before Phase 2
- MCP exposure scope: public `/api/mcp` vs. local Claude Desktop only (Phase 3 decision, but schema should support both)
