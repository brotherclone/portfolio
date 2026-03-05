# Project Context

## Purpose

A live knowledge graph portfolio for Gabriel Walsh — Creative Technologist / Experience Designer.

The site *is* the work. Instead of screenshot galleries, the portfolio is built with the same ontology/agent infrastructure that defines the last several years of professional practice, applied to documenting 28 years of career history. Visitors navigate visually (3D force-directed graph) or conversationally (AGUI chat agent that traverses the graph and answers questions about the work).

**Core insight:** Graph topology is the artifact. NDA-covered work appears as nodes with summary-only narratives; their edges to concepts, skills, and eras tell the full story without exposing any confidential artifact.

**Audiences:**
- Job search (senior IC / principal / architect roles)
- Consulting / freelance authority signal
- Speaking, writing, community inbound

---

## Tech Stack

**Frontend (Vercel)**
- Next.js 15 App Router (RSC shell, API routes, streaming)
- react-force-graph-3d — WebGL / Three.js force-directed 3D graph
- AG-UI protocol — streaming UI events from agent to graph
- CSS Modules + custom properties

**Backend (Railway)**
- Python / FastAPI
- pyoxigraph — in-memory RDF store, SPARQL 1.1, loads TTL at startup
- linkml-store — unified storage interface (Oxigraph + ChromaDB backends)
- ChromaDB — semantic/vector layer for LangChain similarity retrieval
- LangChain — agent orchestration, MCP tool calls, AGUI streaming
- Pydantic v2 — entity validation (generated from LinkML schema)

**Ontology**
- LinkML YAML — single source of truth; generates everything
- `gen-owl` → `portfolio.ttl` → loaded into Oxigraph
- `gen-pydantic` → `entities.py` → FastAPI + LangChain
- `gen-jsonld-context` → `context.jsonld` → Next.js graph viz
- `gen-typescript` → `types.ts` → Next.js components

**DNS / CDN**
- Cloudflare (DNS + CDN, migrating from Heroku)

---

## Ontology Namespaces

```turtle
@prefix gw:   <https://gabrielwalsh.com/ontology#> .
@prefix gwi:  <https://gabrielwalsh.com/instances#> .
```

**Entity types:** `Project`, `Skill`, `Concept`, `Organization`, `Artifact`, `Era`, `Domain`

**Key properties:**
- `gw:summary` — NDA-safe narrative, always shown
- `gw:detail` — full detail, withheld if `gw:confidential true`
- `gw:confidential` — boolean; controls agent surface area, never hides node existence
- `gw:nodeWeight`, `gw:nodeColor`, `gw:category` — visual encoding hints

**Relationship properties:**
`usedSkill`, `involvedConcept`, `workedAt`, `producedArtifact`, `ledTo`, `informedBy`, `evidencedBy`, `partOfEra`, `inDomain`, `relatedTo`, `taughtAt`, `collaboratedWith`

---

## Project Conventions

### Code Style
- TypeScript on the frontend (Next.js); Python on the backend (FastAPI)
- Zod for runtime entity validation on TS side (mirrors Pydantic on Python side)
- LinkML YAML is the single source of truth for all entity schemas
- CSS Modules + custom properties only — no CSS-in-JS, no Tailwind

### Architecture Patterns
- Ontology-first: schema changes start in LinkML YAML, everything else is generated
- `gw:confidential` flag gates `gw:detail` only — nodes and edges are always visible
- Agent uses only `gw:summary` + relationship traversal for confidential projects
- AGUI events (HIGHLIGHT_NODES, ANIMATE_PATH, STREAM_TEXT) bridge agent to graph viz
- No database dependency in V1: static JSON-LD artifact at build time, in-memory SPARQL at runtime

### Testing Strategy
- SPARQL queries validated against Oxigraph in unit tests
- Zod / Pydantic entity shapes tested against example graph fixtures
- AGUI event stream tested with mock MCP tool responses

### Git Workflow
- Main branch: `main` (production)
- Feature branches from `develop`
- OpenSpec proposals reviewed and approved before implementation begins
- Archive change after deployment to production

---

## Domain Context

### Career Eras (Instance Data Anchors)
| Era | Years | gwi: ID |
|---|---|---|
| Early Web | 1997–2000 | `era_earlyWeb` |
| The LEGO Decade | 2000–2010 | `era_lego` |
| Agency & Enterprise | 2010–2017 | `era_agency` |
| International Product | 2017–2021 | `era_international` |
| Agentic Architecture | 2021–present | `era_agentic` |

### Concept Graph (Thematic Layer)
```
experience-integration
    ├─ledTo─► content-modeling → ontology-design → agentic-architecture
    └─ledTo─► physical-digital-integration → spatial-computing (emerging)

creative-production (parallel track)
    └─evidencedBy─► earthly-frames (artifact)
                    portfolio-site (artifact)
```

### Primary Owned Artifacts
- **portfolio-site** — this site itself (code, public)
- **earthly-frames** — original music / electronic / ambient (audio, public)

### NDA Pattern
Confidential projects (e.g., Oracle work):
- Node visible in graph
- Edges to concepts/skills/eras fully visible and traversable
- `gw:summary` shown (NDA-safe narrative)
- `gw:detail` withheld
- Agent answers from summary + traversal only

---

## Important Constraints

- NDA coverage on enterprise and intelligence community work — content model must enforce `gw:confidential` gating at agent and API layer
- No confidential screenshots or artifact content ever exposed, even in API responses
- Graph topology itself is considered public (the relationships are the evidence)
- Accessibility: WCAG gap identified vs. UX Architect archetype — needs explicit pass in Phase 5
- TypeScript signal gap vs. Design Engineers — TS usage on frontend should be prominent

---

## External Dependencies

| Service | Purpose | Tier |
|---|---|---|
| Vercel | Next.js hosting, edge streaming | Free |
| Railway | FastAPI + Oxigraph + ChromaDB | ~$5/mo Starter |
| Cloudflare | DNS + CDN | Free |
| LinkML | Schema generation toolchain | OSS |
| react-force-graph-3d | 3D WebGL graph viz | OSS |
| AG-UI protocol | Agent→UI streaming | OSS |
| LangChain | Agent orchestration | OSS |
| pyoxigraph | Embedded RDF/SPARQL store | OSS |

---

## Implementation Phases

| Phase | Capability | Est. |
|---|---|---|
| 1 | Ontology & Graph API (LinkML → TTL → Oxigraph → SPARQL endpoint) | 2–3 wks |
| 2 | Graph Visualization (react-force-graph-3d, encoding, interaction) | 1–2 wks |
| 3 | MCP Server (query_graph, get_entity, traverse, find_path) | 1 wk |
| 4 | AGUI Agent (LangChain, streaming, chat UI, graph animation bridge) | 1–2 wks |
| 5 | Content & Polish (full ontology population, Earthly Frames, accessibility) | ongoing |

## Open Questions

- [ ] Fill out LinkML YAML schema (start here — everything derives from this)
- [ ] 3D graph aesthetics: reference sites, mood, color palette
- [ ] Draft concept graph in full (`gwi:concept_*` nodes are the soul)
- [ ] Enumerate owned artifacts beyond Earthly Frames
- [ ] MCP exposure scope — public endpoint vs. local Claude Desktop only
- [ ] Accessibility strategy (WCAG gap identified in competitive analysis)
- [ ] TypeScript on resume? (identified gap)
