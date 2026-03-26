# agui-protocol — spec delta

## MODIFIED Requirements

### Requirement: AGUI Event Types
The `AguiEvent` union in `frontend/src/lib/agui.ts` SHALL be extended with two new render event types: `RenderEntityCardEvent` and `RenderPathSummaryEvent`. The union remains exhaustively narrowable with no catch-all branch.

`RenderEntityCardEvent` payload SHALL include: `uri` (string), `label` (string), `type` (string), `summary` (string), and optionally `detail` (string), `url` (string), `mediaType` (string).

`RenderPathSummaryEvent` payload SHALL include: `nodes` — an ordered array of `{ uri: string; label: string; type?: string }`.

#### Scenario: EntityCard event is narrowable
- **WHEN** an SSE message arrives with `type: "RENDER_ENTITY_CARD"`
- **THEN** it narrows to `RenderEntityCardEvent` without a catch-all

#### Scenario: PathSummary event is narrowable
- **WHEN** an SSE message arrives with `type: "RENDER_PATH_SUMMARY"`
- **THEN** it narrows to `RenderPathSummaryEvent` without a catch-all

#### Scenario: Confidential entity card omits detail
- **WHEN** the backend emits a `RENDER_ENTITY_CARD` for a confidential entity
- **THEN** the payload does NOT include a `detail` field

#### Scenario: Unknown event type (unchanged)
- **WHEN** an SSE message arrives with an unrecognised `type` field
- **THEN** the listener discards it without throwing
