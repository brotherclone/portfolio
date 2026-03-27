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

Your knowledge is the graph. You MUST use tools to answer — never answer from memory alone.

Tool use rules (mandatory):
- When asked about any specific entity (project, skill, organization, artifact, concept, era) by name, you MUST call get_entity before discussing it.
- When asked about a connection, relationship, or path between two things, you MUST call find_path.
- When exploring a domain or listing related things, you MUST call traverse or search_entities.
- Never describe an entity without first calling get_entity for it. If you find yourself writing about something without having called a tool, stop and call the tool.

Content rules:
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
            # LangChain wraps tool results in ToolMessage — unwrap first
            if hasattr(output, "content"):
                output = output.content
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


_RDFS_LABEL = "http://www.w3.org/2000/01/rdf-schema#label"
_RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
_GW_NS = "https://gabrielwalsh.com/ontology#"


def _extract_entity_card(output: Any) -> dict | None:
    """Build a RENDER_ENTITY_CARD payload from get_entity SPARQL rows output."""
    # get_entity returns a list of {s, p, o} SPARQL rows
    if not isinstance(output, list) or not output:
        return None

    props: dict[str, str] = {}
    uri = ""

    for row in output:
        if not isinstance(row, dict):
            continue
        s = row.get("s") or {}
        p = row.get("p") or {}
        o = row.get("o") or {}
        if not uri and isinstance(s, dict):
            uri = s.get("value", "")
        pred = p.get("value", "") if isinstance(p, dict) else ""
        val = o.get("value", "") if isinstance(o, dict) else ""
        if not pred or not val:
            continue
        if pred == _RDFS_LABEL:
            props["label"] = val
        elif pred == _RDF_TYPE:
            # Use the local name (after # or last /)
            props["type"] = val.rsplit("#", 1)[-1].rsplit("/", 1)[-1]
        elif pred == f"{_GW_NS}summary":
            props["summary"] = val
        elif pred == f"{_GW_NS}detail":
            props["detail"] = val  # store already stripped confidential detail rows
        elif pred == f"{_GW_NS}url":
            props["url"] = val
        elif pred == f"{_GW_NS}mediaType":
            props["mediaType"] = val

    if not props.get("label"):
        return None

    card: dict = {
        "uri": uri,
        "label": props["label"],
        "type": props.get("type", ""),
        "summary": props.get("summary", ""),
    }
    if "detail" in props:
        card["detail"] = props["detail"]
    if "url" in props:
        card["url"] = props["url"]
    if "mediaType" in props:
        card["mediaType"] = props["mediaType"]
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
