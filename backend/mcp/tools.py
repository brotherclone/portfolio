"""
MCP tool stubs backed by GraphStore.

Each tool runs a SPARQL query against the in-memory oxigraph store.
Returns plain Python values (lists of dicts) that LangChain serialises
into tool result messages.
"""

from __future__ import annotations

from collections import deque
from typing import Any

from langchain_core.tools import tool

from store.oxigraph import GraphStore

_RDFS_LABEL = "http://www.w3.org/2000/01/rdf-schema#label"
_GW = "https://gabrielwalsh.com/ontology#"


def _label_for(uri: str, store: GraphStore) -> str:
    rows = store.query(
        f"SELECT ?l WHERE {{ <{uri}> <{_RDFS_LABEL}> ?l }} LIMIT 1"
    )
    if rows and rows[0].get("l"):
        return rows[0]["l"].get("value", uri)
    # fall back to local name
    return uri.rsplit("#", 1)[-1].rsplit("/", 1)[-1]


def _uri_val(cell: Any) -> str | None:
    if isinstance(cell, dict) and cell.get("type") == "uri":
        return cell["value"]
    return None


def make_tools(store: GraphStore) -> list:
    @tool
    def query_graph(sparql: str) -> list[dict]:
        """Execute a SPARQL SELECT query against the knowledge graph and return rows."""
        return store.query(sparql)

    @tool
    def get_entity(uri: str) -> list[dict]:
        """Return all predicate-object pairs for the given entity URI."""
        return store.query(
            f"SELECT ?p ?o WHERE {{ <{uri}> ?p ?o }} ORDER BY ?p"
        )

    @tool
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

    @tool
    def find_path(from_uri: str, to_uri: str, max_hops: int = 3) -> list[dict]:
        """
        Find the shortest path between two entities in the knowledge graph.
        Returns an ordered list of {uri, label} dicts; empty list if no path found.
        """
        if from_uri == to_uri:
            return [{"uri": from_uri, "label": _label_for(from_uri, store)}]

        visited: set[str] = {from_uri}
        # Each queue entry is the path so far (list of URIs)
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
