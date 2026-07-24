from __future__ import annotations

from typing import Any

from app.mf_client import mf_request


async def create_ai_meeting(
    label: str,
    agenda: str,
    scheduled_at: int,
    participants: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Schedule an AI-hosted meeting. Participants need email + ringAt (unix ms).

    The AI Host joins at scheduled_at, shares the agenda, and rings each invitee
    at their ringAt time. Missed rings can auto-deploy that person's Assistant.
    """
    return await mf_request(
        "POST",
        "/api/ai-meetings",
        json_body={
            "label": label,
            "agenda": agenda,
            "scheduledAt": scheduled_at,
            "participants": participants or [],
        },
    )


async def list_ai_meetings() -> dict[str, Any]:
    """List AI-hosted meetings for the current user."""
    return await mf_request("GET", "/api/ai-meetings")


async def end_ai_meeting(meeting_id: str) -> dict[str, Any]:
    """End an AI-hosted meeting (creator only). Signals host and assistant workflows."""
    return await mf_request("POST", f"/api/ai-meetings/{meeting_id}/end")
