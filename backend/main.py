import json
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
load_dotenv()
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, field_validator
from store.oxigraph import GraphStore
from agent.graph_agent import run_agent
from mcp.tools import make_tools

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
_mcp_tools: dict[str, Any] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    store.load(DATA_TTL)
    _mcp_tools.update({t.name: t for t in make_tools(store)})
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


# ── MCP JSON-RPC 2.0 endpoint ─────────────────────────────────────────────────


class MCPRequest(BaseModel):
    jsonrpc: str = "2.0"
    id: Any = None
    method: str
    params: dict = {}


@app.post("/api/mcp")
def mcp_endpoint(request: MCPRequest) -> JSONResponse:
    def ok(result: Any) -> JSONResponse:
        return JSONResponse({"jsonrpc": "2.0", "id": request.id, "result": result})

    def err(code: int, message: str) -> JSONResponse:
        return JSONResponse({"jsonrpc": "2.0", "id": request.id, "error": {"code": code, "message": message}})

    if request.method == "tools/list":
        tool_list = [
            {
                "name": t.name,
                "description": t.description,
                "inputSchema": t.args_schema.model_json_schema() if t.args_schema else {},
            }
            for t in _mcp_tools.values()
        ]
        return ok({"tools": tool_list})

    if request.method == "tools/call":
        tool_name = request.params.get("name")
        arguments = request.params.get("arguments", {})
        if tool_name not in _mcp_tools:
            return err(-32601, f"Tool '{tool_name}' not found")
        try:
            result = _mcp_tools[tool_name].invoke(arguments)
            return ok({"content": [{"type": "text", "text": json.dumps(result)}]})
        except Exception as exc:
            return err(-32000, str(exc))

    return err(-32601, f"Method not found: {request.method}")


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
