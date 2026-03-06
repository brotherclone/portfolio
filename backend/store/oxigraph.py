"""
Oxigraph RDF store wrapper.

Loads portfolio.ttl into an in-memory pyoxigraph Store at startup and
exposes a query() method that runs SPARQL SELECT and returns plain dicts,
with gw:confidential stripping applied.
"""

from pathlib import Path
from typing import Any

import pyoxigraph as ox

GW = "https://gabrielwalsh.com/ontology#"
XSD = "http://www.w3.org/2001/XMLSchema#"
_CONFIDENTIAL = ox.NamedNode(f"{GW}confidential")
_DETAIL = ox.NamedNode(f"{GW}detail")
_TRUE = ox.Literal("true", datatype=ox.NamedNode(f"{XSD}boolean"))


class GraphStore:
    def __init__(self) -> None:
        self._store = ox.Store()
        self._confidential: set[str] = set()

    def load(self, ttl_path: str | Path) -> None:
        self._store.load(path=str(ttl_path), format=ox.RdfFormat.TURTLE)
        self._confidential = {
            quad.subject.value
            for quad in self._store.quads_for_pattern(None, _CONFIDENTIAL, _TRUE, None)
            if isinstance(quad.subject, ox.NamedNode)
        }

    def query(self, sparql: str) -> list[dict[str, Any]]:
        """
        Execute a SPARQL SELECT query and return results as a list of dicts.

        Each dict maps variable name → serialized value:
          - NamedNode  → {"type": "uri", "value": "https://..."}
          - Literal    → {"type": "literal", "value": "...", "datatype": "..."}
          - BlankNode  → {"type": "bnode", "value": "..."}
          - None (OPTIONAL miss) → None

        gw:detail values are stripped for confidential subjects.
        """
        results = self._store.query(sparql)
        var_names = [v.value for v in results.variables]
        rows = []
        for solution in results:
            row: dict[str, Any] = {name: self._serialize(solution[name]) for name in var_names}
            if not self._is_detail_leak(row):
                rows.append(row)
        return rows

    # ── private ──────────────────────────────────────────────────────────

    def _serialize(self, term: ox.NamedNode | ox.Literal | ox.BlankNode | None) -> dict | None:
        if term is None:
            return None
        if isinstance(term, ox.NamedNode):
            return {"type": "uri", "value": term.value}
        if isinstance(term, ox.Literal):
            result: dict[str, str] = {"type": "literal", "value": term.value}
            if term.datatype:
                result["datatype"] = term.datatype.value
            if term.language:
                result["language"] = term.language
            return result
        if isinstance(term, ox.BlankNode):
            return {"type": "bnode", "value": term.value}
        return None

    def _is_detail_leak(self, row: dict) -> bool:
        """
        Return True if this result row exposes gw:detail for a confidential subject.

        Filters rows where the predicate is gw:detail and the subject URI
        is in the confidential set.
        """
        pred = row.get("p") or row.get("predicate")
        subj = row.get("s") or row.get("subject")
        if (
            pred
            and isinstance(pred, dict)
            and pred.get("value") == _DETAIL.value
            and subj
            and isinstance(subj, dict)
            and subj.get("value") in self._confidential
        ):
            return True
        return False
