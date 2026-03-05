import sys
from pathlib import Path

# Make backend/ importable without install
sys.path.insert(0, str(Path(__file__).parent))

import pytest
from fastapi.testclient import TestClient

from main import app
from store.oxigraph import GraphStore

DATA_TTL = Path(__file__).parent.parent / "data" / "portfolio.ttl"
GW = "https://gabrielwalsh.com/ontology#"
GWI = "https://gabrielwalsh.com/instances#"


@pytest.fixture(scope="session")
def store() -> GraphStore:
    s = GraphStore()
    s.load(DATA_TTL)
    return s


@pytest.fixture(scope="session")
def client() -> TestClient:
    with TestClient(app) as c:
        yield c
