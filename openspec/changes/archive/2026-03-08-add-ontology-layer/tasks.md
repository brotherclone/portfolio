# Tasks: Add Ontology Layer

## 1. LinkML Schema

- [x] 1.1 Author `schema/portfolio.yml` — define all classes: Project, Skill, Concept, Organization, Artifact, Era, Domain
- [x] 1.2 Define all datatype properties: summary, detail, confidential, startYear, endYear, depthYears, nodeWeight, nodeColor, category, url, mediaType
- [x] 1.3 Define all object properties: usedSkill, involvedConcept, workedAt, deliveredFor, producedArtifact, ledTo, informedBy, evidencedBy, partOfEra, inDomain, relatedTo, taughtAt, collaboratedWith
- [x] 1.3a Define datatype property: engagementType (values: "direct" | "embedded" | "consulting" | "freelance"); add to Project
- [x] 1.4 Add seed instance data for all 5 Eras and core Concept graph nodes (`gwi:concept_*`)
- [x] 1.5 Add seed instance data for key Organizations, Skills, Projects (skeleton — full population is Phase 5)

## 2. Generation Pipeline

- [x] 2.1 Write `scripts/generate.py` — runs LinkML generators, outputs TTL, Pydantic, JSON-LD context, TypeScript types
- [x] 2.2 Pin `linkml` version in `scripts/pyproject.toml`
- [x] 2.3 Validate generated `portfolio.ttl` parses correctly with pyoxigraph
- [x] 2.4 Validate generated `entities.py` imports cleanly with Pydantic v2
- [x] 2.5 Output static JSON-LD snapshot to `frontend/public/graph.jsonld` for build-time use

## 3. Oxigraph Store

- [x] 3.1 Implement `backend/store/oxigraph.py` — `load(ttl_path)` and `query(sparql: str) → list[dict]`
- [x] 3.2 Wire startup event in `backend/main.py` to load `portfolio.ttl` into Oxigraph
- [x] 3.3 Handle `gw:confidential` stripping in query response serializer — remove `gw:detail` values from any result rows where the subject has `gw:confidential true`

## 4. SPARQL Endpoint

- [x] 4.1 Implement `GET /api/graph?q=<sparql>` in `backend/main.py`
- [x] 4.2 Validate incoming queries are SELECT-only (no UPDATE/INSERT/DELETE)
- [x] 4.3 Return results as JSON-LD (Content-Type: application/ld+json)
- [x] 4.4 Add CORS middleware allowing Vercel frontend origin + localhost:3000

## 5. Tests

- [x] 5.1 Unit test: schema generates valid TTL (pyoxigraph can load without error)
- [x] 5.2 Unit test: SPARQL SELECT over era + concept seed data returns expected rows
- [x] 5.3 Unit test: confidential project — `gw:detail` absent from response, `gw:summary` present, edges visible
- [x] 5.4 Integration test: `GET /api/graph?q=SELECT * WHERE {?s a gw:Era}` returns 5 results
