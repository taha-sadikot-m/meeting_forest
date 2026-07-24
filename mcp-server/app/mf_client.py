"""HTTP client that calls Meeting Forest APIs as the authenticated user."""

from __future__ import annotations

from typing import Any

import httpx

from app.auth import require_token_or_raise
from app.config import settings


class MeetingForestError(Exception):
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message
        super().__init__(f"[{status_code}] {message}")


def _headers() -> dict[str, str]:
    token = require_token_or_raise()
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


async def mf_request(
    method: str,
    path: str,
    *,
    json_body: dict[str, Any] | list[Any] | None = None,
    params: dict[str, Any] | None = None,
) -> Any:
    url = f"{settings.meeting_forest_base_url.rstrip('/')}{path}"
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.request(
            method,
            url,
            headers=_headers(),
            json=json_body,
            params=params,
        )

    if response.status_code >= 400:
        try:
            data = response.json()
            message = data.get("error") or data.get("detail") or response.text
        except Exception:
            message = response.text or response.reason_phrase
        raise MeetingForestError(response.status_code, str(message))

    if response.status_code == 204 or not response.content:
        return {"ok": True}

    content_type = (response.headers.get("content-type") or "").lower()
    if "text/html" in content_type:
        raise MeetingForestError(
            502,
            "Meeting Forest returned HTML instead of JSON — check MEETING_FOREST_BASE_URL and that the API is running",
        )

    try:
        return response.json()
    except Exception:
        raise MeetingForestError(502, f"Non-JSON response from Meeting Forest: {response.text[:200]}")
