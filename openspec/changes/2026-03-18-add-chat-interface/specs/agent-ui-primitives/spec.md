# agent-ui-primitives Specification

## Purpose
A small library of typed React components that the agent can "choose" to render via AGUI events. V1 ships two primitives: `EntityCard` and `PathSummary`. These establish the component pattern and token conventions for future primitives.

## ADDED Requirements

### Requirement: EntityCard primitive
The system SHALL implement `frontend/src/components/primitives/EntityCard.tsx`. It SHALL accept a `RenderEntityCardEvent['payload']` as its props and render: entity type (small label), entity label (heading), summary (body text), optional detail (body text, below a divider), and an optional link or audio player when `url` and `mediaType` are present. Styling SHALL use CSS Modules with `var(--color-*)` tokens.

#### Scenario: Non-confidential entity with detail
- **WHEN** `EntityCard` receives a payload with `detail` and `url`
- **THEN** it renders label, summary, detail, and a link or audio player

#### Scenario: Confidential entity without detail
- **WHEN** `EntityCard` receives a payload without a `detail` field
- **THEN** it renders label and summary only; no detail section is shown

#### Scenario: Audio media type
- **WHEN** `mediaType` is `"audio"` and `url` is present
- **THEN** an `<audio>` element is rendered with controls

---

## ADDED Requirements

### Requirement: PathSummary primitive
The system SHALL implement `frontend/src/components/primitives/PathSummary.tsx`. It SHALL accept a `RenderPathSummaryEvent['payload']` as its props and render the `nodes` array as a horizontal sequence of chips separated by arrow glyphs (`→`). Each chip shows the node label. Chips SHALL use entity-type colour hints from `var(--color-*)` tokens where `type` is available. When the node list overflows the panel width, it SHALL wrap to multiple lines.

#### Scenario: Two-node path
- **WHEN** `PathSummary` receives `nodes: [{uri, label: "LEGO"}, {uri, label: "Agentic Architecture"}]`
- **THEN** it renders "LEGO → Agentic Architecture"

#### Scenario: Multi-node path wraps gracefully
- **WHEN** `PathSummary` receives more than 4 nodes
- **THEN** the chips wrap to a new line rather than overflow the panel

---

## ADDED Requirements

### Requirement: Primitive exports
All primitives SHALL be exported from `frontend/src/components/primitives/index.ts` for import by `ChatPanel` and any future consumer.

#### Scenario: Named imports work
- **WHEN** a consumer imports `{ EntityCard, PathSummary } from '@/components/primitives'`
- **THEN** both components resolve without error
