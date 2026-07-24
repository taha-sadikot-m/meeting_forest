from __future__ import annotations

from typing import Any

from app.mf_client import mf_request


async def list_meetings() -> dict[str, Any]:
    """List root meetings the current user created or participates in."""
    data = await mf_request("GET", "/api/meetings")
    return {"meetings": data if isinstance(data, list) else data}


async def create_meeting(
    label: str,
    privacy: str = "public",
    mic_default: str = "allow",
    cam_default: str = "allow",
    bring_agent: bool = False,
) -> dict[str, Any]:
    """Create an instant meeting room for the current user.

    Set bring_agent=True to bring the AI Agent into the room as a co-host
    that follows @agent chat instructions and helps manage the meeting.
    """
    return await mf_request(
        "POST",
        "/api/meetings",
        json_body={
            "label": label,
            "privacy": privacy,
            "micDefault": mic_default,
            "camDefault": cam_default,
            "bringAgent": bring_agent,
        },
    )


async def invite_to_meeting(
    meeting_id: str,
    email: str,
    meeting_label: str | None = None,
    inviter_name: str | None = None,
) -> dict[str, Any]:
    """Email-invite someone to a meeting (records INVITED_TO if they are registered)."""
    body: dict[str, Any] = {"email": email}
    if meeting_label:
        body["meetingLabel"] = meeting_label
    if inviter_name:
        body["inviterName"] = inviter_name
    return await mf_request("POST", f"/api/meetings/{meeting_id}/invite", json_body=body)


async def list_invitations() -> dict[str, Any]:
    """List meetings the current user was invited to."""
    data = await mf_request("GET", "/api/meetings/invitations")
    return {"invitations": data if isinstance(data, list) else data}


async def list_past_meetings() -> dict[str, Any]:
    """List past meetings the user created or joined."""
    data = await mf_request("GET", "/api/meetings/past")
    return {"meetings": data if isinstance(data, list) else data}
