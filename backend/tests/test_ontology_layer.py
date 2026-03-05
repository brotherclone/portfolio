"""
Tests for the add-ontology-layer change (tasks.md 5.1–5.4).
"""

import os
import tempfile
from pathlib import Path
from urllib.parse import quote

import pyoxigraph as ox
import pytest
from fastapi.testclient import TestClient

from store.oxigraph import GraphStore

DATA_TTL = Path(__file__).parent.parent.parent / "data" / "portfolio.ttl"
GW = "https://gabrielwalsh.com/ontology#"
GWI = "https://gabrielwalsh.com/instances#"
RDFS = "http://www.w3.org/2000/01/rdf-schema#"


# ── 5.1 TTL loads without error ───────────────────────────────────────────────

def test_ttl_loads_into_pyoxigraph():
    """portfolio.ttl parses cleanly; pyoxigraph raises no error."""
    s = ox.Store()
    s.load(path=str(DATA_TTL), format=ox.RdfFormat.TURTLE)
    assert sum(1 for _ in s) > 0


# ── 5.2 SPARQL over seed data ─────────────────────────────────────────────────

def test_five_eras(store):
    """Exactly 5 Era instances in the graph."""
    rows = store.query(f"SELECT ?s WHERE {{ ?s a <{GW}Era> }}")
    assert len(rows) == 5


def test_concept_path_traversal(store):
    """experienceIntegration reaches agenticArchitecture via ledTo+."""
    rows = store.query(f"""
        SELECT ?target WHERE {{
            <{GWI}concept_experienceIntegration> <{GW}ledTo>+ ?target .
        }}
    """)
    targets = {r["target"]["value"] for r in rows}
    assert f"{GWI}concept_agenticArchitecture" in targets
    assert len(targets) >= 2


def test_all_seven_entity_types_present(store):
    """All seven entity classes have at least one instance."""
    for cls in ["Project", "Skill", "Concept", "Organization", "Artifact", "Era", "Domain"]:
        rows = store.query(f"SELECT ?s WHERE {{ ?s a <{GW}{cls}> }}")
        assert len(rows) >= 1, f"No instances of gw:{cls}"


def test_agency_client_distinction(store):
    """Embedded project has both workedAt (employer) and deliveredFor (client)."""
    rwj = store.query(f"""
        SELECT ?employer ?client WHERE {{
            <{GWI}proj_threespot_rwj> <{GW}workedAt> ?emp ;
                                      <{GW}deliveredFor> ?cli .
            ?emp <{RDFS}label> ?employer .
            ?cli <{RDFS}label> ?client .
        }}
    """)
    assert len(rwj) == 1
    assert "Threespot" in rwj[0]["employer"]["value"]
    assert "Robert Wood Johnson" in rwj[0]["client"]["value"]


def test_direct_employment_has_no_delivered_for(store):
    """Direct-employment project (Oracle) has no deliveredFor triple."""
    rows = store.query(f"SELECT ?c WHERE {{ <{GWI}proj_oracle> <{GW}deliveredFor> ?c }}")
    assert len(rows) == 0


# ── 5.3 Confidentiality gating ───────────────────────────────────────────────

def test_confidential_detail_withheld(store):
    """gw:detail absent from SPARQL results for confidential proj_oracle."""
    rows = store.query(f"""
        SELECT ?s ?p ?o WHERE {{
            ?s ?p ?o .
            FILTER(?s = <{GWI}proj_oracle>)
            FILTER(?p = <{GW}detail>)
        }}
    """)
    assert len(rows) == 0


def test_confidential_summary_present(store):
    """gw:summary is still returned for confidential proj_oracle."""
    rows = store.query(f"SELECT ?o WHERE {{ <{GWI}proj_oracle> <{GW}summary> ?o }}")
    assert len(rows) == 1
    assert len(rows[0]["o"]["value"]) > 0


def test_confidential_edges_visible(store):
    """Concept and skill edges of confidential proj_oracle are traversable."""
    concepts = store.query(f"SELECT ?c WHERE {{ <{GWI}proj_oracle> <{GW}involvedConcept> ?c }}")
    skills = store.query(f"SELECT ?sk WHERE {{ <{GWI}proj_oracle> <{GW}usedSkill> ?sk }}")
    assert len(concepts) >= 1
    assert len(skills) >= 1


def test_non_confidential_detail_present():
    """gw:detail is returned for non-confidential entities."""
    ttl = f"""
    @prefix gw: <{GW}> .
    @prefix gwi: <{GWI}> .
    @prefix rdfs: <{RDFS}> .
    @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
    gwi:proj_test a gw:Project ;
        rdfs:label "Test" ;
        gw:confidential false ;
        gw:summary "Safe." ;
        gw:detail "Full detail." .
    """
    with tempfile.NamedTemporaryFile(suffix=".ttl", mode="w", delete=False) as f:
        f.write(ttl)
        tmp = f.name
    try:
        s = GraphStore()
        s.load(tmp)
        rows = s.query(f"SELECT ?o WHERE {{ <{GWI}proj_test> <{GW}detail> ?o }}")
        assert len(rows) == 1
        assert rows[0]["o"]["value"] == "Full detail."
    finally:
        os.unlink(tmp)


# ── 5.4 Integration: HTTP endpoint ───────────────────────────────────────────

def test_endpoint_returns_five_eras(client):
    """GET /api/graph returns 5 Era results."""
    q = f"SELECT ?s WHERE {{ ?s a <{GW}Era> }}"
    resp = client.get(f"/api/graph?q={quote(q)}")
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("application/ld+json")
    assert len(resp.json()["results"]) == 5


def test_endpoint_rejects_insert(client):
    """INSERT query returns HTTP 400."""
    resp = client.get("/api/graph?q=INSERT%20DATA%20%7B%7D")
    assert resp.status_code == 400
    assert "SELECT" in resp.json()["detail"]


def test_endpoint_confidential_detail_not_leaked(client):
    """gw:detail for proj_oracle does not appear in HTTP response."""
    q = (
        f"SELECT ?s ?p ?o WHERE {{"
        f" ?s ?p ?o ."
        f" FILTER(?s = <{GWI}proj_oracle>)"
        f" FILTER(?p = <{GW}detail>)"
        f"}}"
    )
    resp = client.get(f"/api/graph?q={quote(q)}")
    assert resp.status_code == 200
    assert len(resp.json()["results"]) == 0
