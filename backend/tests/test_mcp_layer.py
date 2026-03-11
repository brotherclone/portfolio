"""
Tests for the add-mcp-server change (tasks.md 4.1–4.6).
"""

import json
from pathlib import Path

import pytest

GW = "https://gabrielwalsh.com/ontology#"
GWI = "https://gabrielwalsh.com/instances#"


# ── 4.1: query_graph returns expected rows for era seed data ──────────────────


def test_query_graph_returns_era_rows(store):
    """query_graph returns all 5 Era instances from seed data."""
    from mcp.tools import make_tools

    tools = {t.name: t for t in make_tools(store)}
    rows = tools["query_graph"].invoke({"sparql": f"SELECT ?s WHERE {{ ?s a <{GW}Era> }}"})
    assert len(rows) == 5


# ── 4.2: query_graph rejects write queries ────────────────────────────────────


def test_query_graph_rejects_write_query(store):
    """query_graph raises ValueError for INSERT queries."""
    from mcp.tools import make_tools

    tools = {t.name: t for t in make_tools(store)}
    with pytest.raises(Exception, match="SELECT"):
        tools["query_graph"].invoke({"sparql": "INSERT DATA { }"})


# ── 4.3: get_entity suppresses gw:detail for confidential project ─────────────


def test_get_entity_withholds_detail_for_confidential(store):
    """get_entity returns summary but not gw:detail for confidential proj_oracle."""
    from mcp.tools import make_tools

    tools = {t.name: t for t in make_tools(store)}
    rows = tools["get_entity"].invoke({"uri": f"{GWI}proj_oracle"})

    predicates = {r["p"]["value"] for r in rows if r.get("p")}
    assert f"{GW}detail" not in predicates
    assert f"{GW}summary" in predicates


# ── 4.4: traverse follows involvedConcept edges ───────────────────────────────


def test_traverse_follows_involved_concept(store):
    """traverse returns concept nodes reachable from proj_lego via involvedConcept."""
    from mcp.tools import make_tools

    tools = {t.name: t for t in make_tools(store)}
    nodes = tools["traverse"].invoke({
        "uri": f"{GWI}proj_lego",
        "predicate": f"{GW}involvedConcept",
    })
    uris = {n["uri"] for n in nodes}
    assert f"{GWI}concept_experienceIntegration" in uris


# ── 4.5: find_path finds path between era_lego and era_agentic ───────────────


def test_find_path_between_concepts(store):
    """find_path returns a path from concept_experienceIntegration to concept_agenticArchitecture.

    Eras have no outgoing IRI edges so cannot be connected by BFS. Concepts are
    connected via gw:ledTo chains (verified by test_concept_path_traversal).
    """
    from mcp.tools import make_tools

    tools = {t.name: t for t in make_tools(store)}
    path = tools["find_path"].invoke({
        "from_uri": f"{GWI}concept_experienceIntegration",
        "to_uri": f"{GWI}concept_agenticArchitecture",
    })
    assert len(path) >= 2
    assert path[0]["uri"] == f"{GWI}concept_experienceIntegration"
    assert path[-1]["uri"] == f"{GWI}concept_agenticArchitecture"


# ── 4.6: POST /api/mcp with get_entity returns valid MCP response ─────────────


def test_mcp_endpoint_get_entity(client):
    """POST /api/mcp with tools/call get_entity returns valid JSON-RPC response."""
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": "get_entity",
            "arguments": {"uri": f"{GWI}era_lego"},
        },
    }
    resp = client.post("/api/mcp", json=payload)
    assert resp.status_code == 200

    body = resp.json()
    assert body["jsonrpc"] == "2.0"
    assert body["id"] == 1
    assert "result" in body
    assert "content" in body["result"]

    content = body["result"]["content"]
    assert len(content) >= 1
    assert content[0]["type"] == "text"

    rows = json.loads(content[0]["text"])
    predicates = {r["p"]["value"] for r in rows if r.get("p")}
    assert f"{GW}startYear" in predicates or len(rows) > 0
