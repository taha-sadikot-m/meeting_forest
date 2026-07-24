"""FastMCP tool registration for Meeting Forest."""

from __future__ import annotations

from typing import Any

from fastmcp import FastMCP

from app.tools import ai_meetings, assistant, meetings, platform

mcp = FastMCP(
    "MeetingForest",
    instructions=(
        "You are connected to Meeting Forest. Use these tools for meetings, invites, "
        "waiting-room admit/reject, rings, messaging, Personal Assistant, and debriefs. "
        "When creating an instant meeting, set bring_agent=True to join the AI Agent as "
        "co-host (admin instructs it in room chat with @agent). "
        "Always act as the authenticated user whose Bearer token is provided."
    ),
)


@mcp.tool()
async def list_meetings() -> dict[str, Any]:
    """List root meetings the current user created or participates in."""
    return await meetings.list_meetings()


@mcp.tool()
async def create_meeting(
    label: str,
    privacy: str = "public",
    mic_default: str = "allow",
    cam_default: str = "allow",
    bring_agent: bool = False,
) -> dict[str, Any]:
    """Create an instant meeting. Set bring_agent=True to add the AI Agent co-host."""
    return await meetings.create_meeting(label, privacy, mic_default, cam_default, bring_agent)


@mcp.tool()
async def invite_to_meeting(
    meeting_id: str,
    email: str,
    meeting_label: str | None = None,
    inviter_name: str | None = None,
) -> dict[str, Any]:
    """Send an email invite to a meeting and record the invitation if the invitee is registered."""
    return await meetings.invite_to_meeting(meeting_id, email, meeting_label, inviter_name)


@mcp.tool()
async def list_invitations() -> dict[str, Any]:
    """List meetings the current user was invited to."""
    return await meetings.list_invitations()


@mcp.tool()
async def list_past_meetings() -> dict[str, Any]:
    """List past meetings the user created or joined."""
    return await meetings.list_past_meetings()


@mcp.tool()
async def create_ai_meeting(
    label: str,
    agenda: str,
    scheduled_at: int,
    participants: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Schedule an AI-hosted meeting.

    scheduled_at is unix milliseconds. Each participant is {email, ringAt} where ringAt
    is unix ms when the AI Host should ring them. The AI Host joins, shares the agenda,
    rings invitees, and can deploy Assistants for people who miss the ring.
    """
    return await ai_meetings.create_ai_meeting(label, agenda, scheduled_at, participants)


@mcp.tool()
async def list_ai_meetings() -> dict[str, Any]:
    """List AI-hosted / scheduled meetings for the current user."""
    return await ai_meetings.list_ai_meetings()


@mcp.tool()
async def end_ai_meeting(meeting_id: str) -> dict[str, Any]:
    """End an AI-hosted meeting (meeting creator only)."""
    return await ai_meetings.end_ai_meeting(meeting_id)


@mcp.tool()
async def get_assistant() -> dict[str, Any]:
    """Get the Personal Assistant configuration and context library."""
    return await assistant.get_assistant()


@mcp.tool()
async def update_assistant(
    name: str,
    system_prompt: str = "",
    intro_message: str = "",
) -> dict[str, Any]:
    """Create or update the Personal Assistant name, system prompt, and intro message."""
    return await assistant.update_assistant(name, system_prompt, intro_message)


@mcp.tool()
async def deploy_assistant(meeting_id: str) -> dict[str, Any]:
    """Deploy the Personal Assistant into a meeting on the user's behalf or alongside them."""
    return await assistant.deploy_assistant(meeting_id)


@mcp.tool()
async def add_assistant_context(title: str, content: str) -> dict[str, Any]:
    """Add briefing notes or reference context for the Personal Assistant."""
    return await assistant.add_assistant_context(title, content)


@mcp.tool()
async def list_debriefs() -> dict[str, Any]:
    """List debriefs produced after the Assistant attended meetings."""
    return await assistant.list_debriefs()


@mcp.tool()
async def get_debrief(debrief_id: str) -> dict[str, Any]:
    """Fetch one debrief by id (summary, tasks, decisions, escalations)."""
    return await assistant.get_debrief(debrief_id)


@mcp.tool()
async def get_user_settings() -> dict[str, Any]:
    """Get profile and ringing preferences for AI-scheduled meetings."""
    return await assistant.get_user_settings()


@mcp.tool()
async def update_ringing(ringing_enabled: bool) -> dict[str, Any]:
    """Toggle in-app ringing. When false, Assistant joins AI meetings without ringing first."""
    return await assistant.update_ringing(ringing_enabled)


@mcp.tool()
async def set_meeting_privacy(meeting_id: str, privacy: str) -> dict[str, Any]:
    """Set meeting privacy to public or private (creator only)."""
    return await platform.set_meeting_privacy(meeting_id, privacy)


@mcp.tool()
async def list_waiting(meeting_id: str) -> dict[str, Any]:
    """List users waiting to join a private meeting."""
    return await platform.list_waiting(meeting_id)


@mcp.tool()
async def admit_waiting(meeting_id: str, waiting_id: str) -> dict[str, Any]:
    """Admit a waiting user into a private meeting."""
    return await platform.admit_waiting(meeting_id, waiting_id)


@mcp.tool()
async def reject_waiting(meeting_id: str, waiting_id: str) -> dict[str, Any]:
    """Reject a waiting user."""
    return await platform.reject_waiting(meeting_id, waiting_id)


@mcp.tool()
async def create_ring(to_email: str, meeting_id: str, meeting_label: str | None = None) -> dict[str, Any]:
    """Ring a registered user into a meeting (you must already be in the meeting)."""
    return await platform.create_ring(to_email, meeting_id, meeting_label)


@mcp.tool()
async def list_conversations() -> dict[str, Any]:
    """List direct-message conversations."""
    return await platform.list_conversations()


@mcp.tool()
async def send_direct_message(conversation_id: str, text: str) -> dict[str, Any]:
    """Send a DM in an existing conversation."""
    return await platform.send_direct_message(conversation_id, text)


@mcp.tool()
async def lookup_user(query: str) -> dict[str, Any]:
    """Search verified users by name or email (min 2 characters)."""
    return await platform.lookup_user(query)


@mcp.tool()
async def get_agent_host_status(meeting_id: str) -> dict[str, Any]:
    """Check if the AI Agent co-host is enabled for a meeting."""
    return await platform.get_agent_host_status(meeting_id)


# Registry used by REST /tools/{name} for the in-app agent
TOOL_REGISTRY: dict[str, Any] = {
    "list_meetings": meetings.list_meetings,
    "create_meeting": meetings.create_meeting,
    "invite_to_meeting": meetings.invite_to_meeting,
    "list_invitations": meetings.list_invitations,
    "list_past_meetings": meetings.list_past_meetings,
    "create_ai_meeting": ai_meetings.create_ai_meeting,
    "list_ai_meetings": ai_meetings.list_ai_meetings,
    "end_ai_meeting": ai_meetings.end_ai_meeting,
    "get_assistant": assistant.get_assistant,
    "update_assistant": assistant.update_assistant,
    "deploy_assistant": assistant.deploy_assistant,
    "add_assistant_context": assistant.add_assistant_context,
    "list_debriefs": assistant.list_debriefs,
    "get_debrief": assistant.get_debrief,
    "get_user_settings": assistant.get_user_settings,
    "update_ringing": assistant.update_ringing,
    "set_meeting_privacy": platform.set_meeting_privacy,
    "list_waiting": platform.list_waiting,
    "admit_waiting": platform.admit_waiting,
    "reject_waiting": platform.reject_waiting,
    "create_ring": platform.create_ring,
    "list_conversations": platform.list_conversations,
    "send_direct_message": platform.send_direct_message,
    "lookup_user": platform.lookup_user,
    "get_agent_host_status": platform.get_agent_host_status,
}

TOOL_SCHEMAS: list[dict[str, Any]] = [
    {
        "name": "list_meetings",
        "description": "List root meetings the current user created or participates in.",
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "create_meeting",
        "description": "Create an instant meeting. Set bring_agent true to add AI Agent co-host.",
        "parameters": {
            "type": "object",
            "properties": {
                "label": {"type": "string"},
                "privacy": {"type": "string", "default": "public"},
                "mic_default": {"type": "string", "default": "allow"},
                "cam_default": {"type": "string", "default": "allow"},
                "bring_agent": {"type": "boolean", "default": False},
            },
            "required": ["label"],
        },
    },
    {
        "name": "invite_to_meeting",
        "description": "Email-invite someone to a meeting.",
        "parameters": {
            "type": "object",
            "properties": {
                "meeting_id": {"type": "string"},
                "email": {"type": "string"},
                "meeting_label": {"type": "string"},
                "inviter_name": {"type": "string"},
            },
            "required": ["meeting_id", "email"],
        },
    },
    {
        "name": "list_invitations",
        "description": "List meetings the current user was invited to.",
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "list_past_meetings",
        "description": "List past meetings the user created or joined.",
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "create_ai_meeting",
        "description": (
            "Schedule an AI-hosted meeting. scheduled_at is unix ms. "
            "participants is [{email, ringAt}] with ringAt unix ms."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "label": {"type": "string"},
                "agenda": {"type": "string"},
                "scheduled_at": {"type": "integer"},
                "participants": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "email": {"type": "string"},
                            "ringAt": {"type": "integer"},
                        },
                    },
                },
            },
            "required": ["label", "agenda", "scheduled_at"],
        },
    },
    {
        "name": "list_ai_meetings",
        "description": "List AI-hosted scheduled meetings for the current user.",
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "end_ai_meeting",
        "description": "End an AI-hosted meeting (creator only).",
        "parameters": {
            "type": "object",
            "properties": {"meeting_id": {"type": "string"}},
            "required": ["meeting_id"],
        },
    },
    {
        "name": "get_assistant",
        "description": "Get Personal Assistant config and context library.",
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "update_assistant",
        "description": "Create or update the Personal Assistant.",
        "parameters": {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "system_prompt": {"type": "string"},
                "intro_message": {"type": "string"},
            },
            "required": ["name"],
        },
    },
    {
        "name": "deploy_assistant",
        "description": "Send the Personal Assistant into a meeting on behalf of or alongside the user.",
        "parameters": {
            "type": "object",
            "properties": {"meeting_id": {"type": "string"}},
            "required": ["meeting_id"],
        },
    },
    {
        "name": "add_assistant_context",
        "description": "Add briefing notes for the Personal Assistant.",
        "parameters": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "content": {"type": "string"},
            },
            "required": ["title", "content"],
        },
    },
    {
        "name": "list_debriefs",
        "description": "List Assistant-generated meeting debriefs.",
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "get_debrief",
        "description": "Fetch one debrief by id.",
        "parameters": {
            "type": "object",
            "properties": {"debrief_id": {"type": "string"}},
            "required": ["debrief_id"],
        },
    },
    {
        "name": "get_user_settings",
        "description": "Get user settings including ringing preferences.",
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "update_ringing",
        "description": "Enable or disable in-app ringing for AI-scheduled meetings.",
        "parameters": {
            "type": "object",
            "properties": {"ringing_enabled": {"type": "boolean"}},
            "required": ["ringing_enabled"],
        },
    },
    {
        "name": "set_meeting_privacy",
        "description": "Set meeting privacy to public or private.",
        "parameters": {
            "type": "object",
            "properties": {
                "meeting_id": {"type": "string"},
                "privacy": {"type": "string"},
            },
            "required": ["meeting_id", "privacy"],
        },
    },
    {
        "name": "list_waiting",
        "description": "List waiting-room users for a private meeting.",
        "parameters": {
            "type": "object",
            "properties": {"meeting_id": {"type": "string"}},
            "required": ["meeting_id"],
        },
    },
    {
        "name": "admit_waiting",
        "description": "Admit a waiting user.",
        "parameters": {
            "type": "object",
            "properties": {
                "meeting_id": {"type": "string"},
                "waiting_id": {"type": "string"},
            },
            "required": ["meeting_id", "waiting_id"],
        },
    },
    {
        "name": "reject_waiting",
        "description": "Reject a waiting user.",
        "parameters": {
            "type": "object",
            "properties": {
                "meeting_id": {"type": "string"},
                "waiting_id": {"type": "string"},
            },
            "required": ["meeting_id", "waiting_id"],
        },
    },
    {
        "name": "create_ring",
        "description": "Ring a user into a meeting (caller must be in the meeting).",
        "parameters": {
            "type": "object",
            "properties": {
                "to_email": {"type": "string"},
                "meeting_id": {"type": "string"},
                "meeting_label": {"type": "string"},
            },
            "required": ["to_email", "meeting_id"],
        },
    },
    {
        "name": "list_conversations",
        "description": "List DM conversations.",
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "send_direct_message",
        "description": "Send a DM in a conversation.",
        "parameters": {
            "type": "object",
            "properties": {
                "conversation_id": {"type": "string"},
                "text": {"type": "string"},
            },
            "required": ["conversation_id", "text"],
        },
    },
    {
        "name": "lookup_user",
        "description": "Search verified users by name or email.",
        "parameters": {
            "type": "object",
            "properties": {"query": {"type": "string"}},
            "required": ["query"],
        },
    },
    {
        "name": "get_agent_host_status",
        "description": "Check if AI Agent co-host is enabled for a meeting.",
        "parameters": {
            "type": "object",
            "properties": {"meeting_id": {"type": "string"}},
            "required": ["meeting_id"],
        },
    },
]
