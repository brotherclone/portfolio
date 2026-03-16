"""
MCP tool implementations backed by GraphStore.

Each tool runs a SPARQL query against the in-memory oxigraph store.
Returns plain Python values (lists of dicts) that LangChain serialises
into tool result messages.
"""

from __future__ import annotations

from collections import deque
from typing import Any

from langchain_core.tools import tool
from pydantic import BaseModel, field_validator

from store.oxigraph import GraphStore

_RDFS_LABEL = "http://www.w3.org/2000/01/rdf-schema#label"
_GW = "https://gabrielwalsh.com/ontology#"
_WRITE_KEYWORDS = {"insert", "delete", "load", "clear", "create", "drop", "copy", "move", "add"}


# ── Pydantic v2 input schemas ─────────────────────────────────────────────────


class QueryGraphInput(BaseModel):
    sparql: str

    @field_validator("sparql")
    @classmethod
    def select_only(cls, v: str) -> str:
        first = v.strip().split()[0].lower() if v.strip() else ""
        if first in _WRITE_KEYWORDS:
            raise ValueError("Only SELECT queries are permitted.")
        return v


class GetEntityInput(BaseModel):
    uri: str


class TraverseInput(BaseModel):
    uri: str
    predicate: str = ""


class FindPathInput(BaseModel):
    from_uri: str
    to_uri: str
    max_hops: int = 6


# ── helpers ───────────────────────────────────────────────────────────────────


def _label_for(uri: str, store: GraphStore) -> str:
    rows = store.query(
        f"SELECT ?l WHERE {{ <{uri}> <{_RDFS_LABEL}> ?l }} LIMIT 1"
    )
    if rows and rows[0].get("l"):
        return rows[0]["l"].get("value", uri)
    return uri.rsplit("#", 1)[-1].rsplit("/", 1)[-1]


def _uri_val(cell: Any) -> str | None:
    if isinstance(cell, dict) and cell.get("type") == "uri":
        return cell["value"]
    return None


# ── tool factory ──────────────────────────────────────────────────────────────


def make_tools(store: GraphStore) -> list:
    @tool(args_schema=QueryGraphInput)
    def query_graph(sparql: str) -> list[dict]:
        """Execute a SPARQL SELECT query against the knowledge graph and return rows."""
        return store.query(sparql)

    @tool(args_schema=GetEntityInput)
    def get_entity(uri: str) -> list[dict]:
        """Return all predicate-object pairs for the given entity URI."""
        # BIND ?s so the store's confidential filter can suppress gw:detail rows.
        return store.query(
            f"SELECT ?s ?p ?o WHERE {{ BIND(<{uri}> AS ?s) . ?s ?p ?o }} ORDER BY ?p"
        )

    @tool(args_schema=TraverseInput)
    def traverse(uri: str, predicate: str = "") -> list[dict]:
        """
        Return nodes reachable from *uri* in one hop.
        If *predicate* is given (full URI), only follow that predicate.
        Each result has {uri, label}.
        """
        if predicate:
            sparql = (
                f"SELECT DISTINCT ?o WHERE {{ <{uri}> <{predicate}> ?o . FILTER(isIRI(?o)) }}"
            )
        else:
            sparql = (
                f"SELECT DISTINCT ?o WHERE {{ <{uri}> ?p ?o . FILTER(isIRI(?o)) }}"
            )
        rows = store.query(sparql)
        result = []
        for row in rows:
            o_val = _uri_val(row.get("o"))
            if o_val:
                result.append({"uri": o_val, "label": _label_for(o_val, store)})
        return result

    @tool(args_schema=FindPathInput)
    def find_path(from_uri: str, to_uri: str, max_hops: int = 6) -> list[dict]:
        """
        Find the shortest path between two entities in the knowledge graph.
        Returns an ordered list of {uri, label} dicts; empty list if no path found.
        """
        if from_uri == to_uri:
            return [{"uri": from_uri, "label": _label_for(from_uri, store)}]

        visited: set[str] = {from_uri}
        queue: deque[list[str]] = deque([[from_uri]])

        for _ in range(max(1, max_hops)):
            next_queue: deque[list[str]] = deque()
            while queue:
                path = queue.popleft()
                current = path[-1]
                rows = store.query(
                    f"SELECT DISTINCT ?o WHERE {{ <{current}> ?p ?o . FILTER(isIRI(?o)) }}"
                )
                for row in rows:
                    neighbour = _uri_val(row.get("o"))
                    if not neighbour:
                        continue
                    new_path = path + [neighbour]
                    if neighbour == to_uri:
                        return [
                            {"uri": u, "label": _label_for(u, store)}
                            for u in new_path
                        ]
                    if neighbour not in visited:
                        visited.add(neighbour)
                        next_queue.append(new_path)
            queue = next_queue

        return []

    return [query_graph, get_entity, traverse, find_path]
