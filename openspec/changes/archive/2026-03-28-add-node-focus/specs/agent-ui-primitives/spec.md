## MODIFIED Requirements

### Requirement: EntityCard primitive
The system SHALL implement `frontend/src/components/primitives/EntityCard.tsx`. It SHALL accept a `RenderEntityCardEvent['payload']` as its props and render: entity type (small label), entity label (heading), summary (body text), optional detail (body text, below a divider), and an optional link or audio player when `url` and `mediaType` are present. Styling SHALL use CSS Modules with `var(--color-*)` tokens.

The entire card SHALL be interactive: clicking it SHALL dispatch a `FOCUS_NODE` event onto `aguiBus` with the card's `uri` and `label`. The card SHALL show a pointer cursor on hover to indicate interactivity.

#### Scenario: Non-confidential entity with detail
- **WHEN** `EntityCard` receives a payload with `detail` and `url`
- **THEN** it renders label, summary, detail, and a link or audio player

#### Scenario: Confidential entity without detail
- **WHEN** `EntityCard` receives a payload without a `detail` field
- **THEN** it renders label and summary only; no detail section is shown

#### Scenario: Audio media type
- **WHEN** `mediaType` is `"audio"` and `url` is present
- **THEN** an `<audio>` element is rendered with controls

#### Scenario: Click dispatches FOCUS_NODE
- **WHEN** the user clicks an `EntityCard`
- **THEN** a `FOCUS_NODE` event is dispatched onto `aguiBus` with the card's `uri` and `label`

### Requirement: PathSummary primitive
The system SHALL implement `frontend/src/components/primitives/PathSummary.tsx`. It SHALL accept a `RenderPathSummaryEvent['payload']` as its props and render the `nodes` array as a horizontal sequence of chips separated by arrow glyphs (`→`). Each chip shows the node label. Chips SHALL use entity-type colour hints from `var(--color-*)` tokens where `type` is available. When the node list overflows the panel width, it SHALL wrap to multiple lines.

Each chip SHALL be interactive: clicking it SHALL dispatch a `FOCUS_NODE` event onto `aguiBus` with that node's `uri` and `label`. Chips SHALL show a pointer cursor on hover.

#### Scenario: Two-node path
- **WHEN** `PathSummary` receives `nodes: [{uri, label: "LEGO"}, {uri, label: "Agentic Architecture"}]`
- **THEN** it renders "LEGO → Agentic Architecture"

#### Scenario: Multi-node path wraps gracefully
- **WHEN** `PathSummary` receives more than 4 nodes
- **THEN** the chips wrap to a new line rather than overflow the panel

#### Scenario: Chip click dispatches FOCUS_NODE
- **WHEN** the user clicks a chip in `PathSummary`
- **THEN** a `FOCUS_NODE` event is dispatched onto `aguiBus` with that node's `uri` and `label`
