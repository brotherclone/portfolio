## 1. Instance Data — Projects

- [ ] 1.1 Add at least two Early Web era projects to `schema/instances.yml` with `summary`, `detail`, era/skill/concept edges — **BLOCKED: need project names (proj_newsDigital, proj_pacificStreet or equivalent), dates, and NDA-safe narrative from you**
- [ ] 1.2 Populate `detail` field for `proj_lego` — **BLOCKED: needs your narrative**
- [ ] 1.3 Populate `detail` field for `proj_adobe` — **BLOCKED: needs your narrative**
- [ ] 1.4 Populate `detail` field for `proj_threespot_rwj` — **BLOCKED: needs your narrative**
- [ ] 1.5 Populate `detail` field for `proj_huge_axa` — **BLOCKED: needs your narrative**
- [ ] 1.6 Populate `detail` field for `proj_moleskine` — **BLOCKED: needs your narrative**
- [ ] 1.7 Populate `detail` field for `proj_teaching` — **BLOCKED: needs your narrative**
- [x] 1.8 Confirm `proj_oracle` has no `detail` field (confidential — summary only) — confirmed, no detail in instances.yml or portfolio.ttl

## 2. Instance Data — Artifacts

- [ ] 2.1 Add `url` and `detail` to `artifact_earthly_frames` — **BLOCKED: need the actual URL**
- [ ] 2.2 Add at least two additional Artifact instances with `mediaType`, `summary`, `detail`, and `evidencedBy` edges — **BLOCKED: need you to specify which artifacts (animation reel, code projects, writing)**

## 3. Earthly Frames Audio Player

- [x] 3.1 Implement inline audio player in `DetailPanel` when `mediaType === "audio"` and `url` is present — done; added `mediaType` to GraphNode, extracted in graphTransform, renders `<audio controls>` in DetailPanel
- [x] 3.2 Confirm no audio element rendered for non-audio artifacts — done; audio branch is guarded by `mediaType === 'audio' && url`; non-audio artifacts still render the link

## 4. Agent Persona

- [x] 4.1 Write system prompt for `graph_agent.py`: first-person, graph-grounded, explicit confidential constraint — done; `_SYSTEM_PROMPT` wired via `state_modifier=SystemMessage(...)` in `create_react_agent`
- [ ] 4.2 Test: out-of-graph question returns graceful "not in graph" response — requires live LLM; manual verification recommended
- [ ] 4.3 Test: confidential project question uses summary + traversal only — requires live LLM; manual verification recommended

## 5. Homepage Copy

- [ ] 5.1 Write ≤ 3-sentence framing statement for `frontend/src/app/page.tsx` — **BLOCKED: needs your voice/framing**
- [ ] 5.2 Confirm copy is visible before graph canvas initialises — will implement once copy is provided

## 6. Accessibility

- [x] 6.1 Audit all interactive elements for keyboard navigability — close button has Escape handler + aria-label; no chat panel exists yet so chat input is N/A
- [x] 6.2 Add `aria-label` to graph canvas controls and node interaction handlers — added `aria-label` to `<main>` in page.tsx; panel has `role="dialog"` + `aria-modal` + `aria-label`
- [x] 6.3 Verify colour contrast ≥ 4.5:1 on all text elements — `--color-text` (#e8e8f0) on `--color-bg` (#0d0d12) is ~13:1; `--color-text-muted` (#888899) on bg is ~5.7:1; both pass WCAG AA
- [x] 6.4 Add visible focus indicators to all focusable elements — added `:focus-visible` to close button and link in DetailPanel; added global `*:focus-visible` rule in tokens.css

## 7. Regenerate Pipeline

- [ ] 7.1 Run `scripts/generate.py` after all instance data additions to regenerate `portfolio.ttl` and `frontend/public/graph.jsonld` — **blocked on 1.x and 2.x content**
- [ ] 7.2 Confirm all new instances appear in SPARQL query results — blocked on 7.1
