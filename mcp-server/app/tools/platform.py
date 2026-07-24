from __future__ import annotations

from typing import Any

from app.mf_client import mf_request


async def set_meeting_privacy(meeting_id: str, privacy: str) -> dict[str, Any]:
    """Set meeting privacy to 'public' or 'private' (creator only)."""
    return await mf_request(
        "PATCH",
        f"/api/meetings/{meeting_id}/privacy",
        json_body={"privacy": privacy},
    )


async def list_waiting(meeting_id: str) -> dict[str, Any]:
    """List users waiting to join a private meeting (admin)."""
    data = await mf_request("GET", f"/api/meetings/{meeting_id}/waiting")
    return {"waiting": data if isinstance(data, list) else data}


async def admit_waiting(meeting_id: str, waiting_id: str) -> dict[str, Any]:
    """Admit a waiting user into a private meeting."""
    return await mf_request("POST", f"/api/meetings/{meeting_id}/admit/{waiting_id}")


async def reject_waiting(meeting_id: str, waiting_id: str) -> dict[str, Any]:
    """Reject a waiting user."""
    return await mf_request("POST", f"/api/meetings/{meeting_id}/reject/{waiting_id}")


async def create_ring(
    to_email: str,
    meeting_id: str,
    meeting_label: str | None = None,
) -> dict[str, Any]:
    """Ring (call) a registered user into a meeting. Caller must already be in the meeting."""
    body: dict[str, Any] = {"targetEmail": to_email, "meetingId": meeting_id}
    if meeting_label:
        body["meetingLabel"] = meeting_label
    return await mf_request("POST", "/api/rings", json_body=body)


async def list_conversations() -> dict[str, Any]:
    """List the user's direct message conversations."""
    return await mf_request("GET", "/api/messages/conversations")


async def send_direct_message(conversation_id: str, text: str) -> dict[str, Any]:
    """Send a message in an existing conversation."""
    return await mf_request(
        "POST",
        f"/api/messages/conversations/{conversation_id}/messages",
        json_body={"body": text},
    )


async def lookup_user(query: str) -> dict[str, Any]:
    """Look up registered users by name or email query (min 2 chars)."""
    from urllib.parse import quote

    return await mf_request("GET", f"/api/messages/lookup?q={quote(query)}")


async def get_agent_host_status(meeting_id: str) -> dict[str, Any]:
    """Check whether the AI Agent co-host is enabled for a meeting."""
    return await mf_request("GET", f"/api/meetings/{meeting_id}/agent-host")
