## ADDED Requirements

### Requirement: Graph Canvas
The system SHALL render all portfolio entities and relationships as a 3D force-directed graph using `react-force-graph-3d`. The graph MUST load entity data from the static JSON-LD artifact at startup and apply visual encoding from ontology properties.

#### Scenario: Initial load
- **WHEN** the page loads
- **THEN** all entities appear as nodes and all relationships appear as edges within 3 seconds on a modern connection

#### Scenario: Mobile fallback
- **WHEN** `window.innerWidth < 768`
- **THEN** the 2D `react-force-graph` renderer is used in place of the 3D WebGL renderer

---

### Requirement: Node Visual Encoding
The system SHALL encode ontology properties as visual node attributes. `gw:nodeWeight` (or `gw:depthYears` normalised) drives node size. `gw:category` drives node color. Entity type drives node shape. Era recency drives node opacity.

#### Scenario: Skill node sizing
- **WHEN** a Skill node has `gw:depthYears 25`
- **THEN** it renders visibly larger than a Skill node with `gw:depthYears 1`

#### Scenario: Category color mapping
- **WHEN** a node has `gw:category "design"`
- **THEN** it renders in the warm palette; `"development"` renders in the cool palette; `"strategy"` in neutral; `"artifact"` in gold

#### Scenario: Entity type shape
- **WHEN** nodes are rendered
- **THEN** Concept nodes use sphere geometry, Project nodes use box, Organization nodes use ring/torus, Artifact nodes use star

#### Scenario: Era opacity
- **WHEN** a Project is `partOfEra gwi:era_earlyWeb`
- **THEN** its opacity is visibly lower than a Project in `gwi:era_agentic`; neither is fully transparent

---

### Requirement: Edge Visual Encoding
The system SHALL encode relationship type as edge color and thickness. Causal edges (`ledTo`) are visually distinct from evidential (`evidencedBy`) and temporal (`partOfEra`) edges.

#### Scenario: Relationship type color
- **WHEN** edges are rendered
- **THEN** `ledTo` edges, `evidencedBy` edges, and `partOfEra` edges each render in a distinct color

---

### Requirement: Node Interaction — Click
The system SHALL open a `DetailPanel` when a node is clicked. The panel SHALL display the entity's `label`, `summary`, and any showable artifact link. For confidential entities `gw:detail` MUST NOT appear.

#### Scenario: Click non-confidential node
- **WHEN** a user clicks a Project node with `gw:confidential false`
- **THEN** the detail panel opens showing `label`, `summary`, and `detail`

#### Scenario: Click confidential node
- **WHEN** a user clicks a Project node with `gw:confidential true`
- **THEN** the detail panel shows `label` and `summary` only; no `detail` content is rendered

#### Scenario: Close panel
- **WHEN** the user clicks outside the panel or presses Escape
- **THEN** the detail panel closes

---

### Requirement: Node Interaction — Hover
The system SHALL show a tooltip on node hover displaying the entity `label` and one-line `summary`.

#### Scenario: Hover tooltip
- **WHEN** the cursor rests over a node for 300ms
- **THEN** a tooltip appears with the node label and truncated summary

---

### Requirement: AGUI — Highlight Nodes
The graph SHALL respond to `HIGHLIGHT_NODES` AGUI events by visually emphasising the listed node URIs and dimming all others.

#### Scenario: Highlight event received
- **WHEN** the agent emits `HIGHLIGHT_NODES` with a list of URIs
- **THEN** those nodes pulse or increase in brightness; non-listed nodes drop to reduced opacity

#### Scenario: Reset clears highlight
- **WHEN** a `RESET` event is received
- **THEN** all nodes return to their default visual state

---

### Requirement: AGUI — Animate Path
The graph SHALL respond to `ANIMATE_PATH` AGUI events by animating a directional pulse along the edges connecting the ordered node sequence. The `ANIMATE_PATH` payload carries `nodes: Array<{uri: string, label: string}>` as an ordered list; edges are inferred from adjacent pairs.

#### Scenario: Path animation
- **WHEN** the agent emits `ANIMATE_PATH` with an ordered node sequence
- **THEN** a directional pulse travels along the inferred edges in sequence, visible within one animation frame

#### Scenario: Reset clears animation
- **WHEN** a `RESET` event is received
- **THEN** all path animations stop and edges return to default state
