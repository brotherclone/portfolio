# agui-agent — spec delta

## MODIFIED Requirements

### Requirement: LangGraph Agent — render event emission
`backend/agent/graph_agent.py` SHALL emit `RENDER_ENTITY_CARD` after an `on_tool_end` event for `get_entity` when the tool returns a non-empty result dict with a `label` field. It SHALL apply the same confidentiality gate as the MCP `get_entity` tool — `detail` is omitted if the entity has `gw:confidential true`.

`backend/agent/graph_agent.py` SHALL emit `RENDER_PATH_SUMMARY` after an `on_tool_end` event for `find_path` when the result is a non-empty ordered path — in addition to the already-required `ANIMATE_PATH` emission. The `RENDER_PATH_SUMMARY` event SHALL carry the same `nodes: [{uri, label}]` list as `ANIMATE_PATH`.

#### Scenario: get_entity emits EntityCard
- **WHEN** the agent calls `get_entity` and receives a result with a `label`
- **THEN** it emits `RENDER_ENTITY_CARD` before synthesising the text response
- **AND** the payload includes `uri`, `label`, `type`, `summary`, and `detail` only if the entity is not confidential

#### Scenario: get_entity empty result suppresses card
- **WHEN** the agent calls `get_entity` and receives an empty dict
- **THEN** no `RENDER_ENTITY_CARD` event is emitted

#### Scenario: find_path emits both ANIMATE_PATH and RENDER_PATH_SUMMARY
- **WHEN** the agent calls `find_path` and receives a non-empty ordered path
- **THEN** it emits `ANIMATE_PATH` followed by `RENDER_PATH_SUMMARY` (both with the same node list)

#### Scenario: find_path empty result suppresses render
- **WHEN** the agent calls `find_path` and receives an empty list
- **THEN** neither `ANIMATE_PATH` nor `RENDER_PATH_SUMMARY` is emitted
