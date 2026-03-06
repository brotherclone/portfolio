from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from store.oxigraph import GraphStore

DATA_TTL = Path(__file__).parent.parent / "data" / "portfolio.ttl"

_ALLOWED_ORIGINS = [
    "https://gabrielwalsh.com",
    "http://localhost:3000",
]

# SELECT-only guard: reject any query that starts with a write keyword
_WRITE_KEYWORDS = {"insert", "delete", "load", "clear", "create", "drop", "copy", "move", "add"}

store = GraphStore()


@asynccontextmanager
async def lifespan(app: FastAPI):
    store.load(DATA_TTL)
    yield


app = FastAPI(title="Portfolio Graph API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/api/graph")
def query_graph(q: str = Query(..., description="SPARQL SELECT query")) -> JSONResponse:
    first_token = q.strip().split()[0].lower() if q.strip() else ""
    if first_token in _WRITE_KEYWORDS:
        raise HTTPException(
            status_code=400,
            detail="Only SELECT queries are permitted.",
        )

    try:
        results = store.query(q)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return JSONResponse(
        content={"results": results},
        media_type="application/ld+json",
    )
