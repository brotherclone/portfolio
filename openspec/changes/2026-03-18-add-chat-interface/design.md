## Context

The existing AGUI pipeline (`AguiEventListener` → `aguiBus` → `withAgui()` HOC → `GraphCanvas`) handles graph-side events (`HIGHLIGHT_NODES`, `ANIMATE_PATH`, `RESET`) flawlessly. What's missing is:

1. A UI surface where visitors can type a message
2. A display area where the agent's streaming text response appears
3. A way for the agent to surface richer structured data inline — not just prose but actual rendered components

The "component primitives" idea is the novel part of this change. The agent already retrieves rich entity data from the SPARQL store. Instead of flattening that into prose only, it can now emit typed render events so the frontend materialises a proper EntityCard or PathSummary right inside the chat panel.

## Goals / Non-Goals

- **Goals:** floating chat panel over the graph; input triggers `AguiEventListener`; streaming text appears in real time; agent can emit `RENDER_ENTITY_CARD` and `RENDER_PATH_SUMMARY` events that render component primitives inline; intro title copy replaces lorem ipsum
- **Non-Goals:** full conversation history persisted in UI (out of scope V1); markdown rendering in text responses (plain text only, V1); drag/resize of chat panel; mobile-optimised layout (acceptable V1 gap); agent-side explicit render tool calls (auto-emission on tool_end is sufficient for V1)

## Layout

The chat panel is a fixed overlay, anchored to the bottom-left of the viewport, floating above the graph canvas:

```
┌─────────────────────────────────────────────────────────────┐
│  [3D graph canvas — full viewport]                          │
│                                                             │
│  ┌──────────────────────────────┐                           │
│  │ Gabriel Walsh                │  ← intro title           │
│  │ Creative Technologist        │  ← tagline               │
│  ├──────────────────────────────┤                           │
│  │ [agent response stream]      │  ← ChatPanel response    │
│  │   [EntityCard]               │  ← inline primitive      │
│  │   [PathSummary]              │  ← inline primitive      │
│  ├──────────────────────────────┤                           │
│  │ [input field]  [→ send]      │  ← ChatPanel input       │
│  └──────────────────────────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

The intro title and tagline are static HTML in `page.tsx`. The chat panel is rendered below them in the DOM, and shares the same bottom-left float container.

## Decisions

- **`withAgui()` wraps `ChatPanel`** — consistent with how `GraphCanvas` is wrapped. ChatPanel receives `aguiEvents` and `latestEvent` via the HOC. On `STREAM_TEXT`, it appends to a display buffer. On `RENDER_ENTITY_CARD` / `RENDER_PATH_SUMMARY`, it appends a typed primitive to the response item list. On `RESET`, it promotes the in-progress response to a "settled" state (stays rendered).

- **Response model: one response slot, not a scrollable history** — V1 keeps the UI minimal. The panel shows the current (or most recent) agent response. Sending a new message clears the previous response and starts a new one. This keeps the chat anchored to the graph interaction without needing a scrollable thread.

- **Primitive rendering is interspersed by insertion order** — the response area is a list of `ResponseItem` (either `text` or a named primitive + typed payload). `STREAM_TEXT` appends to the last `text` item (or creates one). `RENDER_*` events append a new primitive item. Primitives appear between or after text chunks, in the order the agent emits them.

- **Auto-emission on `on_tool_end` (not explicit agent tools)** — the agent does not call a `render_entity_card()` tool. Instead `graph_agent.py` inspects `on_tool_end` events: after `get_entity` with a non-empty result → emit `RENDER_ENTITY_CARD`; after `find_path` with a non-empty path → emit `RENDER_PATH_SUMMARY` (alongside `ANIMATE_PATH`). The agent gets rich rendering "for free" without needing to reason about when to show a card. A future phase can add explicit render tools if finer agent control is desired.

- **`EntityCard` payload includes all safe fields** — `uri`, `label`, `type`, `summary`, `detail` (omitted when absent/confidential), `url`, `mediaType`. The backend must apply the same confidentiality gate that `get_entity` applies — never surface `gw:detail` for confidential entities even in render events.

- **`PathSummary` shows node chips in sequence** — an ordered list of `{uri, label, type?}` rendered as chips connected by arrow glyphs. Clicking a chip selects the node in the graph (future enhancement; V1 chips are non-interactive).

- **CSS Modules + existing tokens** — primitives use CSS Modules with `var(--color-*)` tokens from `tokens.css`. No new tokens needed.

## Risks / Trade-offs

- The response area has no scroll if the agent emits many primitives in one turn → mitigate by capping the panel height with `overflow-y: auto`
- Auto-emission on `get_entity` means every entity lookup renders a card, which could be noisy for multi-hop queries → mitigate by only emitting when the entity has a non-trivial `label` (not just a URI)
- `STREAM_TEXT` interleaved with `RENDER_*` requires careful buffer management in `ChatPanel` → the `ResponseItem[]` list handles this cleanly

## Open Questions

- [ ] What is the final intro title copy and tagline? (Placeholder: "Gabriel Walsh" / "Creative technologist. Experience architect.")
- [ ] Should `PathSummary` node chips be clickable to select the node in the graph in V1?
