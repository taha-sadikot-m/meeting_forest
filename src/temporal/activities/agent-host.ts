import { GoogleGenAI } from "@google/genai";
import { config } from "../../config";
import { AGENT_DISPLAY_NAME, agentHostWorkflowId } from "../../agent-host";
import { registerAgentHostWorkflow } from "../agent-host-registry";
import { runQuery } from "../../db/memgraph";
import {
  connectAgentHostBot,
  publishAgentHostChat,
  disconnectAgentHostBot,
} from "../livekit-bridge";

/** Match agentHostWorkflow duration — skip LiveKit join for older backlog workflows. */
const AGENT_HOST_MAX_AGE_MS = 4 * 60 * 60 * 1000;

function workerHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Worker-Secret": config.workerInternalSecret,
  };
}

async function internalGet(path: string): Promise<unknown> {
  const res = await fetch(`${config.appUrl}${path}`, { headers: workerHeaders() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET ${path} failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function internalPost(path: string, body?: unknown): Promise<unknown> {
  const res = await fetch(`${config.appUrl}${path}`, {
    method: "POST",
    headers: workerHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${path} failed: ${res.status} ${text}`);
  }
  try {
    return await res.json();
  } catch {
    return { ok: true };
  }
}

function toEpochMs(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "object" && value !== null && "toNumber" in value) {
    try {
      return (value as { toNumber: () => number }).toNumber();
    } catch {
      return null;
    }
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Returns true if the bot joined; false if skipped (ended/stale). */
export async function botJoinAndIntro(
  meetingId: string,
  label: string,
  creatorName: string
): Promise<boolean> {
  const recs = await runQuery(
    "MATCH (m:Meeting {id: $meetingId}) RETURN m.status AS status, m.createdAt AS createdAt",
    { meetingId }
  );
  if (!recs.length) {
    console.warn("[agent-host] skip join — meeting not found", meetingId);
    return false;
  }
  const status = String(recs[0].get("status") || "");
  const createdAt = toEpochMs(recs[0].get("createdAt"));
  if (status === "ended") {
    console.log("[agent-host] skip join — meeting ended", meetingId);
    return false;
  }
  if (createdAt != null && Date.now() - createdAt > AGENT_HOST_MAX_AGE_MS) {
    console.log("[agent-host] skip join — meeting stale", meetingId, { createdAt, status });
    return false;
  }

  registerAgentHostWorkflow(meetingId, agentHostWorkflowId(meetingId));
  await connectAgentHostBot(meetingId);
  const intro =
    `Hi — I'm your **AI Agent** co-host for "${label}". ` +
    `${creatorName} can instruct me in chat with \`@agent …\`.\n\n` +
    `Try: \`@agent list waiting\`, \`@agent invite person@email.com\`, ` +
    `\`@agent ring person@email.com\`, or \`@agent end meeting\`.`;
  await publishAgentHostChat(meetingId, intro);
  return true;
}

export async function publishAgentHostChatActivity(
  meetingId: string,
  text: string
): Promise<void> {
  await publishAgentHostChat(meetingId, text);
}

export async function disconnectAgentHostBotActivity(meetingId: string): Promise<void> {
  await disconnectAgentHostBot(meetingId);
}

type HostAction =
  | { type: "list_waiting" }
  | { type: "admit"; waitingId: string }
  | { type: "admit_all" }
  | { type: "reject"; waitingId: string }
  | { type: "invite"; email: string }
  | { type: "ring"; email: string }
  | { type: "end_meeting" }
  | { type: "set_privacy"; privacy: "public" | "private" }
  | { type: "none" };

function parseActionFromModel(raw: unknown): { reply: string; actions: HostAction[] } {
  if (!raw || typeof raw !== "object") {
    return { reply: String(raw || ""), actions: [] };
  }
  const o = raw as Record<string, unknown>;
  const reply = String(o.reply || o.markdown || "").trim() || "Done.";
  const actions: HostAction[] = [];
  const list = Array.isArray(o.actions) ? o.actions : o.action ? [o.action] : [];
  for (const a of list) {
    if (!a || typeof a !== "object") continue;
    const x = a as Record<string, unknown>;
    const type = String(x.type || "").trim();
    if (type === "list_waiting") actions.push({ type: "list_waiting" });
    else if (type === "admit_all") actions.push({ type: "admit_all" });
    else if (type === "admit" && x.waitingId) {
      actions.push({ type: "admit", waitingId: String(x.waitingId) });
    } else if (type === "reject" && x.waitingId) {
      actions.push({ type: "reject", waitingId: String(x.waitingId) });
    } else if (type === "invite" && x.email) {
      actions.push({ type: "invite", email: String(x.email) });
    } else if (type === "ring" && x.email) {
      actions.push({ type: "ring", email: String(x.email) });
    } else if (type === "end_meeting") actions.push({ type: "end_meeting" });
    else if (type === "set_privacy" && (x.privacy === "public" || x.privacy === "private")) {
      actions.push({ type: "set_privacy", privacy: x.privacy });
    }
  }
  return { reply, actions };
}

async function executeHostAction(
  meetingId: string,
  label: string,
  creatorEmail: string,
  creatorName: string,
  action: HostAction
): Promise<string> {
  switch (action.type) {
    case "list_waiting": {
      const data = await internalGet(
        `/api/internal/agent-host/meetings/${encodeURIComponent(meetingId)}/waiting`
      ) as { waiting?: Array<{ waitingId: string; name: string; email: string }> };
      const waiting = data.waiting || [];
      if (!waiting.length) return "No one is waiting.";
      return waiting
        .map(w => `- ${w.name} (${w.email}) id=${w.waitingId}`)
        .join("\n");
    }
    case "admit": {
      await internalPost(
        `/api/internal/agent-host/meetings/${encodeURIComponent(meetingId)}/admit/${encodeURIComponent(action.waitingId)}`
      );
      return `Admitted ${action.waitingId}.`;
    }
    case "admit_all": {
      const data = await internalPost(
        `/api/internal/agent-host/meetings/${encodeURIComponent(meetingId)}/admit-all`
      ) as { admitted?: number };
      return `Admitted ${data.admitted ?? 0} waiting user(s).`;
    }
    case "reject": {
      await internalPost(
        `/api/internal/agent-host/meetings/${encodeURIComponent(meetingId)}/reject/${encodeURIComponent(action.waitingId)}`
      );
      return `Rejected ${action.waitingId}.`;
    }
    case "invite": {
      await internalPost(
        `/api/internal/agent-host/meetings/${encodeURIComponent(meetingId)}/invite`,
        { email: action.email, inviterName: creatorName, meetingLabel: label }
      );
      return `Invite sent to ${action.email}.`;
    }
    case "ring": {
      await internalPost(`/api/internal/rings`, {
        fromEmail: creatorEmail,
        fromName: creatorName,
        toEmail: action.email,
        meetingId,
        meetingLabel: label,
      });
      return `Ringing ${action.email}…`;
    }
    case "end_meeting": {
      await internalPost(
        `/api/internal/agent-host/meetings/${encodeURIComponent(meetingId)}/end`
      );
      return "Meeting end signalled.";
    }
    case "set_privacy": {
      await internalPost(
        `/api/internal/agent-host/meetings/${encodeURIComponent(meetingId)}/privacy`,
        { privacy: action.privacy }
      );
      return `Privacy set to ${action.privacy}.`;
    }
    default:
      return "";
  }
}

export async function handleAgentHostChatActivity(params: {
  meetingId: string;
  label: string;
  creatorEmail: string;
  creatorName: string;
  message: { senderName: string; text: string };
}): Promise<string> {
  const { meetingId, label, creatorEmail, creatorName, message } = params;

  if (!config.gemini.apiKey) {
    return "AI Agent is online, but GEMINI_API_KEY is not configured.";
  }

  let waitingPreview = "";
  try {
    const data = await internalGet(
      `/api/internal/agent-host/meetings/${encodeURIComponent(meetingId)}/waiting`
    ) as { waiting?: Array<{ waitingId: string; name: string; email: string }> };
    const waiting = data.waiting || [];
    waitingPreview = waiting.length
      ? waiting.map(w => `${w.name} <${w.email}> id=${w.waitingId}`).join("; ")
      : "(none)";
  } catch {
    waitingPreview = "(unavailable)";
  }

  const ai = new GoogleGenAI({ apiKey: config.gemini.apiKey });
  const system = `You are ${AGENT_DISPLAY_NAME}, co-host for meeting "${label}" (id ${meetingId}).
Creator/admin: ${creatorName} <${creatorEmail}>.
Currently waiting: ${waitingPreview}

Respond ONLY with JSON (no fences):
{
  "reply": "short chat reply for the room",
  "actions": [
    { "type": "list_waiting" },
    { "type": "admit", "waitingId": "w-..." },
    { "type": "admit_all" },
    { "type": "reject", "waitingId": "w-..." },
    { "type": "invite", "email": "a@b.com" },
    { "type": "ring", "email": "a@b.com" },
    { "type": "end_meeting" },
    { "type": "set_privacy", "privacy": "public" | "private" }
  ]
}
Use actions when the admin asks you to do something. Empty actions array if just chatting.
Be concise in reply.`;

  const userPrompt = `${message.senderName} said: ${message.text}`;

  try {
    const response = await ai.models.generateContent({
      model: config.gemini.model,
      config: {
        systemInstruction: system,
        responseMimeType: "application/json",
      },
      contents: userPrompt,
    });

    let parsed: unknown = {};
    try {
      parsed = JSON.parse(response.text || "{}");
    } catch {
      return (response.text || "").trim() || "I heard you.";
    }

    const { reply, actions } = parseActionFromModel(parsed);
    const actionNotes: string[] = [];
    for (const action of actions) {
      try {
        const note = await executeHostAction(
          meetingId,
          label,
          creatorEmail,
          creatorName,
          action
        );
        if (note) actionNotes.push(note);
      } catch (e) {
        actionNotes.push(`Action failed: ${String(e)}`);
      }
    }

    if (actionNotes.length) {
      return `${reply}\n\n${actionNotes.join("\n")}`.trim();
    }
    return reply;
  } catch (e) {
    console.error("[agent-host] handle chat error", e);
    return "Sorry — I couldn't process that request.";
  }
}
