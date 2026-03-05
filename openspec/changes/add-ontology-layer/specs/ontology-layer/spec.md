## ADDED Requirements

### Requirement: LinkML Schema as Single Source of Truth
The system SHALL maintain a single LinkML YAML schema at `schema/portfolio.yml` that defines all entity types, properties, and relationships. All downstream artifacts (OWL/TTL, Pydantic models, JSON-LD context, TypeScript interfaces) MUST be generated from this schema via the LinkML toolchain. Hand-editing generated artifacts is prohibited.

#### Scenario: Schema change propagates to all artifacts
- **WHEN** `schema/portfolio.yml` is modified
- **THEN** running `scripts/generate.py` produces updated `portfolio.ttl`, `entities.py`, `context.jsonld`, and `types.ts` that reflect the change

#### Scenario: Generated TTL is valid RDF
- **WHEN** `scripts/generate.py` completes
- **THEN** `portfolio.ttl` can be loaded by pyoxigraph without parse errors

---

### Requirement: Entity Type Coverage
The schema SHALL define the following classes: `Project`, `Skill`, `Concept`, `Organization`, `Artifact`, `Era`, `Domain`. Each class MUST have a `rdfs:label` and `rdfs:comment`.

#### Scenario: All entity types queryable via SPARQL
- **WHEN** the Oxigraph store is loaded with `portfolio.ttl`
- **THEN** a SPARQL query `SELECT ?s WHERE { ?s a gw:<EntityType> }` returns results for each of the seven entity types

---

### Requirement: Property Coverage
The schema SHALL define the following datatype properties: `summary`, `detail`, `confidential`, `startYear`, `endYear`, `depthYears`, `nodeWeight`, `nodeColor`, `category`, `url`, `mediaType`, `engagementType`. The schema SHALL define the following object properties: `usedSkill`, `involvedConcept`, `workedAt`, `deliveredFor`, `producedArtifact`, `ledTo`, `informedBy`, `evidencedBy`, `partOfEra`, `inDomain`, `relatedTo`, `taughtAt`, `collaboratedWith`.

`gw:workedAt` (Project → Organization) SHALL represent the employing organization — who paid the salary. `gw:deliveredFor` (Project → Organization) SHALL represent the client organization — who the work product was for. These MAY be the same organization (direct employment) or different (agency/consulting engagement). `gw:engagementType` SHALL accept the values `"direct"`, `"embedded"`, `"consulting"`, or `"freelance"`.

#### Scenario: Relationship traversal via SPARQL
- **WHEN** querying for paths between instances
- **THEN** SPARQL property path expressions (`gw:ledTo+`, `gw:involvedConcept/gw:ledTo*`) resolve correctly over the loaded graph

#### Scenario: Agency project — employer and client both queryable
- **WHEN** a project has `gw:workedAt gwi:org_threespot` and `gw:deliveredFor gwi:org_rwj` and `gw:engagementType "embedded"`
- **THEN** a SPARQL query for all organizations connected to that project returns both Threespot and RWJ Foundation
- **AND** the engagement type is retrievable as a literal on the project node

#### Scenario: Direct employment project — workedAt only
- **WHEN** a project has `gw:workedAt gwi:org_oracle` and no `gw:deliveredFor` triple
- **THEN** a SPARQL query for the project's employer returns Oracle
- **AND** the absence of `gw:deliveredFor` is not treated as an error

---

### Requirement: Confidentiality Gating
The system SHALL enforce that any entity with `gw:confidential true` has its `gw:detail` value withheld from all API responses. The entity's existence (node), relationships (edges), and `gw:summary` value SHALL remain visible in all responses.

#### Scenario: Confidential project — detail withheld
- **WHEN** `/api/graph` returns results including a project with `gw:confidential true`
- **THEN** the response contains the project's URI, label, summary, and all relationship edges
- **AND** the response does NOT contain any `gw:detail` value for that project

#### Scenario: Non-confidential project — detail present
- **WHEN** `/api/graph` returns results including a project with `gw:confidential false` (or no confidential flag)
- **THEN** the response contains the project's `gw:detail` value if one exists in the store

#### Scenario: Confidential node visible in graph topology
- **WHEN** a graph query fetches all nodes and edges
- **THEN** a confidential project node appears in the result
- **AND** its edges to Concept, Skill, Era, and Organization nodes appear in the result

---

### Requirement: Oxigraph In-Memory Store
The system SHALL load `portfolio.ttl` into a pyoxigraph in-memory `Store` at FastAPI application startup. The store SHALL support SPARQL 1.1 SELECT queries. No external RDF service SHALL be required to run the application.

#### Scenario: Store loads on startup
- **WHEN** the FastAPI application starts
- **THEN** the pyoxigraph store is populated with all triples from `portfolio.ttl`
- **AND** the `/api/graph` endpoint is ready to serve queries within the startup sequence

#### Scenario: In-memory store survives request lifecycle
- **WHEN** multiple concurrent requests hit `/api/graph`
- **THEN** each request reads from the same shared store instance without data loss or corruption

---

### Requirement: SPARQL Query Endpoint
The system SHALL expose `GET /api/graph?q=<sparql>` as a read-only SPARQL SELECT endpoint. The endpoint MUST return results as JSON-LD (`Content-Type: application/ld+json`). Non-SELECT query types (UPDATE, INSERT, DELETE, CONSTRUCT, ASK) SHALL be rejected with a 400 error. The endpoint MUST allow cross-origin requests from the configured Vercel frontend origin and `http://localhost:3000`.

#### Scenario: Valid SELECT query returns JSON-LD
- **WHEN** `GET /api/graph?q=SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 10`
- **THEN** response status is 200
- **AND** `Content-Type` is `application/ld+json`
- **AND** response body is valid JSON-LD

#### Scenario: Non-SELECT query rejected
- **WHEN** `GET /api/graph?q=INSERT DATA { <ex:a> <ex:b> <ex:c> }`
- **THEN** response status is 400
- **AND** response body contains an error message explaining only SELECT queries are permitted

#### Scenario: CORS allows frontend origin
- **WHEN** a preflight OPTIONS request arrives from the Vercel frontend domain
- **THEN** response includes appropriate `Access-Control-Allow-Origin` header

---

### Requirement: Seed Instance Data
The schema SHALL include seed instance data for all five career Eras and the core Concept graph nodes. Eras: `era_earlyWeb` (1997–2000), `era_lego` (2000–2010), `era_agency` (2010–2017), `era_international` (2017–2021), `era_agentic` (2021–present). Concept nodes SHALL include at minimum: `concept_experienceIntegration`, `concept_ontologyDesign`, `concept_agenticArchitecture`, `concept_physicalDigital`, `concept_contentModeling`, `concept_spatialComputing`, `concept_creativeProduction` — with `gw:ledTo` and `gw:informedBy` edges connecting them.

#### Scenario: Era nodes queryable
- **WHEN** SPARQL queries `SELECT ?era WHERE { ?era a gw:Era }`
- **THEN** exactly 5 results are returned, one per career era

#### Scenario: Concept graph traversable
- **WHEN** SPARQL queries a path from `gwi:concept_experienceIntegration` via `gw:ledTo*`
- **THEN** the path reaches `gwi:concept_agenticArchitecture` through intermediate concept nodes

---

### Requirement: Static JSON-LD Build Artifact
The generation pipeline SHALL output a static JSON-LD snapshot of the full graph (post-confidentiality filtering) to `frontend/public/graph.jsonld`. This file is consumed by the Next.js frontend at build time for initial graph render performance. The file SHALL be regenerated whenever `schema/portfolio.yml` changes.

#### Scenario: Static snapshot excludes confidential detail
- **WHEN** `scripts/generate.py` produces `frontend/public/graph.jsonld`
- **THEN** the file does not contain any `gw:detail` values for entities where `gw:confidential true`

#### Scenario: Static snapshot is valid JSON-LD
- **WHEN** `frontend/public/graph.jsonld` is consumed by a JSON-LD parser
- **THEN** it parses without errors and contains all non-confidential entity data
