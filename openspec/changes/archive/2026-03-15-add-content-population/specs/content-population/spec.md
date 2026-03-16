## ADDED Requirements

### Requirement: Early Web Era Projects
The ontology SHALL include at least two Project instances in `gwi:era_earlyWeb` (1997–2000) with `summary` and `detail` fields populated and edges to relevant Skills and Concepts.

#### Scenario: Early Web project traversal
- **WHEN** the agent calls `traverse(gwi:era_earlyWeb, partOfEra)` (inverse)
- **THEN** at least two Project nodes are returned

#### Scenario: Early Web continuity path
- **WHEN** the agent calls `find_path(gwi:era_earlyWeb, gwi:era_agentic)`
- **THEN** a path exists through concept nodes connecting the two eras

---

### Requirement: Full Project Narratives
All non-confidential Project instances SHALL have a populated `detail` field containing a full NDA-safe narrative (problem, approach, outcome, scale). Confidential projects SHALL have `detail` absent and `summary` sufficient for agent traversal.

#### Scenario: Detail present on non-confidential project
- **WHEN** the agent calls `get_entity(gwi:proj_lego)`
- **THEN** the response includes a non-empty `detail` field

#### Scenario: Detail absent on confidential project
- **WHEN** the agent calls `get_entity(gwi:proj_oracle)`
- **THEN** `detail` is absent; `summary`, edges, and `label` are present

---

### Requirement: Earthly Frames Integration
The `gwi:artifact_earthly_frames` instance SHALL have a `url` populated and `detail` field describing the project. The `DetailPanel` SHALL render an inline audio player when the artifact `mediaType` is `audio` and a `url` is present.

#### Scenario: Audio player in detail panel
- **WHEN** the user clicks the Earthly Frames artifact node
- **THEN** the detail panel displays an audio player element alongside `summary` and `detail`

#### Scenario: Audio player absent for non-audio artifact
- **WHEN** the user clicks a `code` or `image` artifact node
- **THEN** no audio player element is rendered

---

### Requirement: Additional Artifacts
The ontology SHALL include at least two additional owned artifacts beyond `portfolio_site` and `earthly_frames`, each with `mediaType`, `summary`, `detail`, and `evidencedBy` edges from relevant Skills or Concepts.

#### Scenario: Artifact count
- **WHEN** a SPARQL query selects all instances of `gw:Artifact`
- **THEN** at least four results are returned

---

### Requirement: Agent Persona
The LangGraph agent SHALL use a defined system prompt that establishes a persona: knowledgeable, direct, first-person, never fabricates — answers only from graph data. The persona SHALL reference the `gw:confidential` constraint explicitly (never surface `gw:detail` for confidential projects).

#### Scenario: Out-of-graph question
- **WHEN** the user asks a question with no relevant graph nodes
- **THEN** the agent responds that it can only speak to what is in the graph, without fabricating

#### Scenario: Confidential project question
- **WHEN** the user asks for detail on `gwi:proj_oracle`
- **THEN** the agent answers using only `gw:summary` and relationship traversal; does not mention NDA'd specifics

---

### Requirement: Homepage Framing Copy
The Next.js page shell SHALL include a brief positioning statement (≤ 3 sentences) visible before the graph loads, introducing the portfolio concept and inviting both visual exploration and conversational use.

#### Scenario: Copy visible on load
- **WHEN** the page renders before the 3D graph initialises
- **THEN** the framing copy is visible and readable

---

### Requirement: Accessibility — WCAG AA
All interactive elements (node click, detail panel, chat input, tooltips) SHALL meet WCAG 2.1 AA requirements: keyboard navigability, sufficient colour contrast, focus indicators, screen reader labels on graph controls.

#### Scenario: Keyboard navigation
- **WHEN** a user navigates by keyboard only
- **THEN** they can open and close the detail panel and submit a chat message without using a pointer

#### Scenario: Colour contrast
- **WHEN** any text element is rendered
- **THEN** it meets a minimum 4.5:1 contrast ratio against its background
