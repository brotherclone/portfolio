#!/usr/bin/env python3
"""
Portfolio generation pipeline.

Reads:  schema/portfolio.yml   (LinkML schema)
        data/portfolio.ttl     (instance data)

Writes:
  backend/entities.py                  Pydantic v2 models
  frontend/src/lib/types.ts            TypeScript interfaces
  frontend/src/lib/context.jsonld      JSON-LD context
  frontend/public/graph.jsonld         Static graph snapshot (confidentiality-filtered)
"""

import json
import subprocess
import sys
from pathlib import Path

import pyoxigraph as ox

REPO = Path(__file__).parent.parent
SCHEMA = REPO / "schema" / "portfolio.yml"
INSTANCES_TTL = REPO / "data" / "portfolio.ttl"

GW = "https://gabrielwalsh.com/ontology#"
RDFS = "http://www.w3.org/2000/01/rdf-schema#"
CONFIDENTIAL = f"{GW}confidential"
DETAIL = f"{GW}detail"


def run(cmd: list[str], dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"ERROR running {' '.join(cmd)}:", file=sys.stderr)
        print(result.stderr, file=sys.stderr)
        sys.exit(1)
    dest.write_text(result.stdout)
    print(f"  wrote {dest.relative_to(REPO)}")


def build_graph_jsonld() -> None:
    """
    Load schema OWL + instance TTL into Oxigraph, apply confidentiality
    filtering (strip gw:detail from confidential entities), export JSON-LD.
    """
    store = ox.Store()
    store.load(path=str(INSTANCES_TTL), format=ox.RdfFormat.TURTLE)

    # Find all confidential subject URIs
    confidential_subjects: set[str] = set()
    for quad in store.quads_for_pattern(
        None,
        ox.NamedNode(CONFIDENTIAL),
        ox.Literal("true", datatype=ox.NamedNode("http://www.w3.org/2001/XMLSchema#boolean")),
        None,
    ):
        confidential_subjects.add(quad.subject.value)

    # Build filtered quad list — omit gw:detail for confidential subjects
    detail_node = ox.NamedNode(DETAIL)
    filtered: list[dict] = []
    for quad in store:
        subj = quad.subject.value if isinstance(quad.subject, ox.NamedNode) else str(quad.subject)
        if quad.predicate == detail_node and subj in confidential_subjects:
            continue  # withheld
        filtered.append(_quad_to_dict(quad))

    graph_doc = {
        "@context": {
            "gw": GW,
            "gwi": "https://gabrielwalsh.com/instances#",
            "rdfs": RDFS,
            "xsd": "http://www.w3.org/2001/XMLSchema#",
            "schema": "https://schema.org/",
        },
        "@graph": filtered,
    }

    dest = REPO / "frontend" / "public" / "graph.jsonld"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(graph_doc, indent=2))
    print(
        f"  wrote {dest.relative_to(REPO)}  ({len(filtered)} triples, "
        f"{len(confidential_subjects)} confidential subjects filtered)"
    )


def _quad_to_dict(quad: ox.Quad) -> dict:
    """Serialize a pyoxigraph Quad to a plain dict for JSON-LD @graph."""
    XSD_STRING = "http://www.w3.org/2001/XMLSchema#string"

    def _node(n):
        if isinstance(n, ox.NamedNode):
            return {"@id": n.value}
        if isinstance(n, ox.Literal):
            if n.datatype and n.datatype.value != XSD_STRING:
                return {"@value": n.value, "@type": n.datatype.value}
            return n.value
        if isinstance(n, ox.BlankNode):
            return {"@id": f"_:{n.value}"}
        return str(n)

    subj = quad.subject.value if isinstance(quad.subject, ox.NamedNode) else str(quad.subject)
    return {
        "@id": subj,
        quad.predicate.value: _node(quad.object),
    }


def main() -> None:
    print("Portfolio generation pipeline")
    print(f"  schema : {SCHEMA.relative_to(REPO)}")
    print(f"  data   : {INSTANCES_TTL.relative_to(REPO)}")
    print()

    gen = ["uv", "run"]

    print("1. Pydantic v2 models → backend/entities.py")
    run([*gen, "gen-pydantic", str(SCHEMA)], REPO / "backend" / "entities.py")

    print("2. TypeScript types → frontend/src/lib/types.ts")
    run([*gen, "gen-typescript", str(SCHEMA)], REPO / "frontend" / "src" / "lib" / "types.ts")

    print("3. JSON-LD context → frontend/src/lib/context.jsonld")
    out = REPO / "frontend" / "src" / "lib" / "context.jsonld"
    run([*gen, "gen-jsonld-context", str(SCHEMA)], out)

    print("4. Static graph snapshot → frontend/public/graph.jsonld")
    build_graph_jsonld()

    print("\nDone.")


if __name__ == "__main__":
    main()
