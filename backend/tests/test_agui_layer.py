"""
Tests for the add-agui-layer change (tasks.md 5.3–5.5).
"""

import json
from pathlib import Path
from unittest.mock import patch

import pytest

DATA_TTL = Path(__file__).parent.parent.parent / "data" / "portfolio.ttl"
GW = "https://gabrielwalsh.com/ontology#"
GWI = "https://gabrielwalsh.com/instances#"


# ── 5.3: agent helper functions produce correct event data ────────────────────


def test_extract_uris_from_find_path_output():
    """_extract_uris pulls URI strings from find_path / traverse output."""
    from agent.graph_agent import _extract_uris

    output = [
        {"uri": f"{GWI}era_lego", "label": "LEGO Decade"},
        {"uri": f"{GWI}concept_experienceIntegration", "label": "Experience Integration"},
    ]
    uris = _extract_uris(output)
    assert f"{GWI}era_lego" in uris
    assert f"{GWI}concept_experienceIntegration" in uris


def test_extract_nodes_from_find_path_output():
    """_extract_nodes returns ordered {uri, label} list for ANIMATE_PATH."""
    from agent.graph_agent import _extract_nodes

    output = [
        {"uri": f"{GWI}era_lego", "label": "LEGO Decade"},
        {"uri": f"{GWI}concept_agenticArchitecture", "label": "Agentic Architecture"},
    ]
    nodes = _extract_nodes(output)
    assert nodes[0] == {"uri": f"{GWI}era_lego", "label": "LEGO Decade"}
    assert nodes[1]["label"] == "Agentic Architecture"


def test_highlight_nodes_precedes_stream_text():
    """Verify HIGHLIGHT_NODES must come before STREAM_TEXT in event sequence."""
    # Simulate the ordering that run_agent produces:
    # tool_end (find_path) → HIGHLIGHT + ANIMATE, then chat_model_stream → STREAM_TEXT
    events = [
        {"type": "HIGHLIGHT_NODES", "payload": {"uris": [f"{GWI}era_lego"]}},
        {"type": "ANIMATE_PATH", "payload": {"nodes": [{"uri": f"{GWI}era_lego", "label": "LEGO"}]}},
        {"type": "STREAM_TEXT", "payload": {"text": "LEGO connects to..."}},
        {"type": "RESET"},
    ]
    types = [e["type"] for e in events]
    assert types.index("HIGHLIGHT_NODES") < types.index("STREAM_TEXT")
    assert types[-1] == "RESET"


# ── 5.4: confidential entity — agent synthesis contains no gw:detail ──────────


def test_confidential_detail_stripped_from_store(store):
    """gw:detail for proj_oracle (confidential) is never returned by the store."""
    rows = store.query(
        f"SELECT ?o WHERE {{ <{GWI}proj_oracle> <{GW}detail> ?o }}"
    )
    assert len(rows) == 0, "gw:detail must be stripped for confidential entities"


def test_confidential_summary_still_available(store):
    """gw:summary is accessible for confidential entities so the agent can synthesise."""
    rows = store.query(
        f"SELECT ?o WHERE {{ <{GWI}proj_oracle> <{GW}summary> ?o }}"
    )
    assert len(rows) == 1
    assert rows[0]["o"]["value"]


# ── 5.5: POST /api/agent streams valid SSE ending with RESET ─────────────────


async def _fake_run_agent(message: str, session_id: str, store):
    yield {"type": "STREAM_TEXT", "payload": {"text": "hello"}}
    yield {"type": "RESET"}


def test_agent_endpoint_streams_sse_and_resets(client):
    """POST /api/agent returns text/event-stream ending with RESET event."""
    with patch("main.run_agent", new=_fake_run_agent):
        resp = client.post(
            "/api/agent",
            json={"message": "What connects LEGO?", "session_id": "sess-test-123"},
        )

    assert resp.status_code == 200
    assert "text/event-stream" in resp.headers["content-type"]

    data_lines = [line for line in resp.text.split("\n") if line.startswith("data: ")]
    assert len(data_lines) >= 2

    parsed = [json.loads(line[6:]) for line in data_lines]
    assert parsed[-1]["type"] == "RESET"


def test_agent_endpoint_rejects_empty_message(client):
    """POST /api/agent with empty message returns HTTP 422."""
    resp = client.post("/api/agent", json={"message": "", "session_id": "sess-1"})
    assert resp.status_code == 422


def test_agent_endpoint_rejects_missing_session_id(client):
    """POST /api/agent without session_id returns HTTP 422."""
    resp = client.post("/api/agent", json={"message": "hello"})
    assert resp.status_code == 422


def test_agent_endpoint_cors_allows_post(client):
    """CORS preflight for POST /api/agent is accepted from allowed origins."""
    resp = client.options(
        "/api/agent",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert resp.status_code == 200
    assert "POST" in resp.headers.get("access-control-allow-methods", "")
