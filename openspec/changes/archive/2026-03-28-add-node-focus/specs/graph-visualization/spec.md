## ADDED Requirements

### Requirement: AGUI — Focus Node
The graph SHALL respond to `FOCUS_NODE` AGUI events by flying the 3D camera to the target node's current simulation position. The camera SHALL transition smoothly over 800ms and come to rest approximately 200 units behind the node, looking directly at it. If the node URI is not found in `graphData` or its simulation position is not yet set, the event SHALL be silently ignored. Focus SHALL have no effect on the 2D mobile renderer.

#### Scenario: Camera flies to node
- **WHEN** a `FOCUS_NODE` event arrives with a URI present in the graph
- **THEN** the 3D camera animates to a position ~200 units from the node over ~800ms

#### Scenario: Unknown URI is ignored
- **WHEN** a `FOCUS_NODE` event arrives with a URI not present in `graphData.nodes`
- **THEN** the camera does not move and no error is thrown

#### Scenario: Node position not yet settled
- **WHEN** a `FOCUS_NODE` event arrives and the target node's `x` coordinate is `undefined`
- **THEN** the camera does not move and no error is thrown
