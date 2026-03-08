## 1. Instance Data — Projects

- [ ] 1.1 Add at least two Early Web era projects to `schema/instances.yml` with `summary`, `detail`, era/skill/concept edges
- [ ] 1.2 Populate `detail` field for `proj_lego`
- [ ] 1.3 Populate `detail` field for `proj_adobe`
- [ ] 1.4 Populate `detail` field for `proj_threespot_rwj`
- [ ] 1.5 Populate `detail` field for `proj_huge_axa`
- [ ] 1.6 Populate `detail` field for `proj_moleskine`
- [ ] 1.7 Populate `detail` field for `proj_teaching`
- [ ] 1.8 Confirm `proj_oracle` has no `detail` field (confidential — summary only)

## 2. Instance Data — Artifacts

- [ ] 2.1 Add `url` and `detail` to `artifact_earthly_frames`
- [ ] 2.2 Add at least two additional Artifact instances with `mediaType`, `summary`, `detail`, and `evidencedBy` edges

## 3. Earthly Frames Audio Player

- [ ] 3.1 Implement inline audio player in `DetailPanel` when `mediaType === "audio"` and `url` is present
- [ ] 3.2 Confirm no audio element rendered for non-audio artifacts

## 4. Agent Persona

- [ ] 4.1 Write system prompt for `graph_agent.py`: first-person, graph-grounded, explicit confidential constraint
- [ ] 4.2 Test: out-of-graph question returns graceful "not in graph" response
- [ ] 4.3 Test: confidential project question uses summary + traversal only

## 5. Homepage Copy

- [ ] 5.1 Write ≤ 3-sentence framing statement for `frontend/src/app/page.tsx`
- [ ] 5.2 Confirm copy is visible before graph canvas initialises

## 6. Accessibility

- [ ] 6.1 Audit all interactive elements for keyboard navigability — detail panel open/close, chat input submit
- [ ] 6.2 Add `aria-label` to graph canvas controls and node interaction handlers
- [ ] 6.3 Verify colour contrast ≥ 4.5:1 on all text elements
- [ ] 6.4 Add visible focus indicators to all focusable elements

## 7. Regenerate Pipeline

- [ ] 7.1 Run `scripts/generate.py` after all instance data additions to regenerate `portfolio.ttl` and `frontend/public/graph.jsonld`
- [ ] 7.2 Confirm all new instances appear in SPARQL query results
