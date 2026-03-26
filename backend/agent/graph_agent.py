"""
LangGraph ReAct agent that drives the AGUI event stream.

Events emitted per turn:
  HIGHLIGHT_NODES      — after find_path / traverse tool returns
  ANIMATE_PATH         — after find_path returns an ordered path
  RENDER_ENTITY_CARD   — after get_entity returns a labelled result
  RENDER_PATH_SUMMARY  — after find_path returns an ordered path
  STREAM_TEXT          — during synthesis (text chunks from the LLM)
  RESET                — once the full turn is complete

Multi-turn memory is provided by MemorySaver keyed on session_id → thread_id.
"""

from __future__ import annotations

import json
import os
from typing import Any, AsyncIterator

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import create_react_agent

from mcp.tools import make_tools
from store.oxigraph import GraphStore

# Module-level checkpointer — persists across requests for the process lifetime
_checkpointer = MemorySaver()

# Cache compiled graph keyed by store id so we don't rebuild on every request
_agent_cache: dict[int, Any] = {}

_SYSTEM_PROMPT = """You are Gabriel Walsh — a creative technologist, experience designer, and agentic architect with 28 years of practice. You speak in first person, directly and specifically, grounded entirely in the knowledge graph that represents your career.

Your knowledge is the graph. When answering questions, use the available tools to traverse it: find entities, follow edges, discover paths. Every claim you make should be traceable to a node or relationship in the graph.

Rules:
- Answer only from graph data. If something is not in the graph, say so clearly: "That's not something I have in the graph."
- For confidential projects (those with gw:confidential = true), you may discuss their graph topology — skills, concepts, organizations, eras — but never reveal detail fields. The summary is available; the narrative is not.
- Do not speculate or invent connections. If a path does not exist in the graph, say so.
- Speak as yourself — first person, present tense, with the authority of someone who built this.
- When the graph reveals an interesting connection, name it. The graph is not just a lookup; it is an argument about how your career coheres.
"""


def _get_agent(store: GraphStore) -> Any:
    key = id(store)
    if key not in _agent_cache:
        tools = make_tools(store)
        llm = ChatAnthropic(
            model=os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-6"),
            temperature=0,
        )
        _agent_cache[key] = create_react_agent(
            llm,
            tools,
            checkpointer=_checkpointer,
            prompt=SystemMessage(content=_SYSTEM_PROMPT),
        )
    return _agent_cache[key]


async def run_agent(
    message: str,
    session_id: str,
    store: GraphStore,
) -> AsyncIterator[dict]:
    """Yield AGUI event dicts until (and including) RESET."""
    graph = _get_agent(store)
    config = {"configurable": {"thread_id": session_id}}
    inputs = {"messages": [HumanMessage(content=message)]}

    async for event in graph.astream_events(inputs, config=config, version="v2"):
        kind = event["event"]

        if kind == "on_tool_end":
            tool_name = event.get("name", "")
            output = event.get("data", {}).get("output")

            # Normalise output to a Python value
            if isinstance(output, str):
                try:
                    output = json.loads(output)
                except Exception:
                    pass

            if tool_name in ("find_path", "traverse"):
                uris = _extract_uris(output)
                if uris:
                    yield {"type": "HIGHLIGHT_NODES", "payload": {"uris": uris}}

            if tool_name == "find_path":
                nodes = _extract_nodes(output)
                if nodes:
                    yield {"type": "ANIMATE_PATH", "payload": {"nodes": nodes}}
                    yield {"type": "RENDER_PATH_SUMMARY", "payload": {"nodes": nodes}}

            if tool_name == "get_entity":
                card = _extract_entity_card(output)
                if card:
                    yield {"type": "RENDER_ENTITY_CARD", "payload": card}

        elif kind == "on_chat_model_stream":
            chunk = event.get("data", {}).get("chunk")
            if chunk is None:
                continue
            text = _chunk_text(chunk)
            if text:
                yield {"type": "STREAM_TEXT", "payload": {"text": text}}

    yield {"type": "RESET"}


# ── helpers ──────────────────────────────────────────────────────────────────

def _extract_uris(output: Any) -> list[str]:
    """Pull URI strings from tool output (list of {uri, ...} dicts)."""
    if not isinstance(output, list):
        return []
    uris = []
    for item in output:
        if isinstance(item, dict):
            uri = item.get("uri") or item.get("value")
            if isinstance(uri, str) and uri.startswith("http"):
                uris.append(uri)
    return uris


def _extract_entity_card(output: Any) -> dict | None:
    """Build a RENDER_ENTITY_CARD payload from get_entity output. Returns None if not renderable."""
    if not isinstance(output, dict):
        return None
    label = output.get("label")
    if not label:
        return None
    card: dict = {
        "uri": output.get("uri", ""),
        "label": label,
        "type": output.get("type", ""),
        "summary": output.get("summary", ""),
    }
    # Apply confidentiality gate — only include detail if not confidential
    if not output.get("confidential"):
        detail = output.get("detail")
        if detail:
            card["detail"] = detail
    url = output.get("url")
    if url:
        card["url"] = url
    media_type = output.get("mediaType") or output.get("media_type")
    if media_type:
        card["mediaType"] = media_type
    return card


def _extract_nodes(output: Any) -> list[dict]:
    """Pull {uri, label} dicts from find_path output."""
    if not isinstance(output, list):
        return []
    nodes = []
    for item in output:
        if isinstance(item, dict) and "uri" in item:
            nodes.append({"uri": item["uri"], "label": item.get("label", item["uri"])})
    return nodes


def _chunk_text(chunk: Any) -> str:
    """Extract plain text from an AIMessageChunk, ignoring tool-use blocks."""
    content = getattr(chunk, "content", None)
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                parts.append(block.get("text", ""))
        return "".join(parts)
    return ""
