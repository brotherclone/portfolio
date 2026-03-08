# Change: Add Content Population

## Why

The ontology skeleton is complete but Phase 5 content is sparse: the Early Web era has no projects, all project `detail` fields are empty, artifacts are minimal, and the agent has no persona or system prompt. This change fills the graph with the full career narrative and ships the portfolio-facing polish layer.

## What Changes

- Add missing Early Web era projects (`proj_newsDigital`, `proj_pacificStreet` or equivalent)
- Populate `detail` field for all non-confidential projects (full narrative, NDA-safe)
- Add additional owned artifacts (animation reel, code projects, writing)
- Populate Earthly Frames artifact with URL and `detail`; wire audio player into `DetailPanel`
- Define agent system prompt / persona in `backend/agent/graph_agent.py`
- Write homepage framing copy (portfolio shell, `frontend/src/app/page.tsx`)
- Accessibility pass: WCAG AA compliance on all interactive elements

## Impact

- Affected specs: `content-population` (new)
- Affected code: `schema/instances.yml`, `backend/agent/graph_agent.py`, `frontend/src/app/page.tsx`, `frontend/src/components/detail/DetailPanel.tsx`
- No schema changes — all additions are instance data within the existing LinkML model
