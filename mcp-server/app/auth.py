"""Request-scoped Bearer token for acting as a Meeting Forest user."""

from __future__ import annotations

from contextvars import ContextVar

from fastapi import HTTPException, Request

user_token_var: ContextVar[str | None] = ContextVar("user_token", default=None)


def extract_bearer_token(request: Request) -> str | None:
    auth = request.headers.get("authorization") or request.headers.get("Authorization")
    return _token_from_auth_header(auth)


def _token_from_auth_header(auth: str | None) -> str | None:
    if not auth:
        return None
    parts = auth.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    token = parts[1].strip()
    return token or None


def set_user_token(token: str | None) -> None:
    user_token_var.set(token)


def get_user_token() -> str:
    token = resolve_user_token()
    if not token:
        raise HTTPException(status_code=401, detail="Authorization Bearer token required")
    return token


def resolve_user_token() -> str | None:
    """Resolve Bearer token from ContextVar or current MCP HTTP request headers."""
    token = user_token_var.get()
    if token:
        return token

    try:
        from fastmcp.server.dependencies import get_http_headers

        # include_all so Authorization is never stripped by default filters
        headers = get_http_headers(include_all=True)
        auth = headers.get("authorization") or headers.get("Authorization")
        return _token_from_auth_header(auth)
    except Exception:
        return None


def require_token_or_raise() -> str:
    token = resolve_user_token()
    if not token:
        raise ValueError(
            "Missing Authorization Bearer token. "
            "Pass the Meeting Forest session token as Authorization: Bearer <token>."
        )
    return token
