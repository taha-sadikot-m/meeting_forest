"""FastAPI/FastMCP host for Meeting Forest tools over Streamable HTTP + REST."""

from __future__ import annotations

import inspect
from typing import Any

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.auth import extract_bearer_token, set_user_token
from app.config import settings
from app.mcp_server import TOOL_REGISTRY, TOOL_SCHEMAS, mcp
from app.mf_client import MeetingForestError


class BearerAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        token = extract_bearer_token(request)
        set_user_token(token)
        try:
            return await call_next(request)
        finally:
            set_user_token(None)


@mcp.custom_route("/health", methods=["GET"])
async def health(_request: Request):
    return JSONResponse({
        "ok": True,
        "service": "meeting-forest-mcp",
        "meeting_forest_base_url": settings.meeting_forest_base_url,
        "mcp_path": "/mcp",
    })


@mcp.custom_route("/tools", methods=["GET"])
async def list_tools(_request: Request):
    return JSONResponse({"tools": TOOL_SCHEMAS})


@mcp.custom_route("/tools/{tool_name}", methods=["POST"])
async def invoke_tool(request: Request):
    tool_name = request.path_params.get("tool_name", "")
    if tool_name not in TOOL_REGISTRY:
        return JSONResponse({"detail": f"Unknown tool: {tool_name}"}, status_code=404)

    token = extract_bearer_token(request)
    if not token:
        return JSONResponse({"detail": "Authorization Bearer token required"}, status_code=401)
    set_user_token(token)

    try:
        try:
            body = await request.json()
        except Exception:
            body = {}
        if not isinstance(body, dict):
            return JSONResponse({"detail": "JSON object body required"}, status_code=400)

        fn = TOOL_REGISTRY[tool_name]
        sig = inspect.signature(fn)
        kwargs: dict[str, Any] = {}
        for name, param in sig.parameters.items():
            if name in body:
                kwargs[name] = body[name]
            elif param.default is inspect.Parameter.empty:
                return JSONResponse({"detail": f"Missing required argument: {name}"}, status_code=400)

        result = await fn(**kwargs)
        return JSONResponse({"ok": True, "tool": tool_name, "result": result})
    except MeetingForestError as e:
        status = e.status_code if 400 <= e.status_code < 600 else 502
        return JSONResponse({"ok": False, "tool": tool_name, "error": e.message}, status_code=status)
    except ValueError as e:
        return JSONResponse({"detail": str(e)}, status_code=401)
    except TypeError as e:
        return JSONResponse({"detail": str(e)}, status_code=400)
    finally:
        set_user_token(None)


# Streamable HTTP MCP at /mcp; health + REST tools via custom_route on the same app
app = mcp.http_app(path="/mcp", stateless_http=True)
app.add_middleware(BearerAuthMiddleware)


def run() -> None:
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.mcp_host,
        port=settings.mcp_port,
        reload=False,
    )


if __name__ == "__main__":
    run()
