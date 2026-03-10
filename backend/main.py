import json
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, field_validator
from store.oxigraph import GraphStore
from agent.graph_agent import run_agent

DATA_TTL = Path(__file__).parent.parent / "data" / "portfolio.ttl"

_DEFAULT_ORIGINS = "https://gabrielwalsh.com,http://localhost:3000"
_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get("ALLOWED_ORIGINS", _DEFAULT_ORIGINS).split(",")
    if o.strip()
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
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


class AgentRequest(BaseModel):
    message: str
    session_id: str

    @field_validator("message")
    @classmethod
    def message_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("message must not be empty")
        return v

    @field_validator("session_id")
    @classmethod
    def session_id_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("session_id must not be empty")
        return v


@app.post("/api/agent")
async def agent_endpoint(request: AgentRequest) -> StreamingResponse:
    async def event_stream():
        async for agui_event in run_agent(request.message, request.session_id, store):
            yield f"data: {json.dumps(agui_event)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


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
