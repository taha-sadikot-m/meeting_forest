import { GoogleGenAI } from "@google/genai";
import { config } from "../config";

export type AgentChatMessage = { role: "user" | "assistant" | "tool"; content: string; name?: string };

export type AgentUiAction = {
  label: string;
  action: "navigate" | "prompt" | "external" | string;
  href?: string;
  prompt?: string;
};

export type AgentUiBlock =
  | { type: "actions"; items: AgentUiAction[] }
  | { type: "links"; items: Array<{ label: string; href: string }> }
  | { type: "tabs"; tabs: Array<{ id: string; label: string; markdown: string }> }
  | { type: string; [key: string]: unknown };

export type AgentUiPayload = {
  markdown: string;
  blocks: AgentUiBlock[];
  resultCard?: {
    title: string;
    subtitle?: string;
    actions?: AgentUiAction[];
  };
};

export type AgentChatContext = {
  surface?: "app" | "meeting" | string;
  meetingId?: string;
};

const SYSTEM_PROMPT = `You are the Meeting Forest global AI agent for the logged-in user ({{USER_NAME}}, {{USER_EMAIL}}).
You can operate across the platform: create/schedule meetings, invite people, manage waiting rooms,
ring users, send DMs, deploy Personal Assistants, and read debriefs.
Prefer create_meeting with bring_agent=true when the user wants you in the live room as co-host.
In a live room, the human admin instructs the co-host with @agent in meeting chat (admit waiting, invite, ring, end).
When deploying a Personal Assistant to attend on the user's behalf, use deploy_assistant with the meeting id.
Current time (unix ms): {{NOW}}
{{CONTEXT_BLOCK}}

CRITICAL — Final answer format:
After any tool calls, your FINAL message must be ONLY a JSON object (no markdown fences, no prose outside JSON) with this shape:
{
  "markdown": "Short user-facing summary (markdown allowed: **bold**, lists, [links](/path))",
  "blocks": [
    {
      "type": "actions",
      "items": [
        { "label": "Open room", "action": "navigate", "href": "/room/MEETING_ID" },
        { "label": "Invite someone", "action": "prompt", "prompt": "Invite person@email.com to meeting MEETING_ID" }
      ]
    },
    {
      "type": "tabs",
      "tabs": [
        { "id": "summary", "label": "Summary", "markdown": "..." },
        { "id": "details", "label": "Details", "markdown": "..." }
      ]
    },
    {
      "type": "links",
      "items": [{ "label": "View invitations", "href": "/meetings/invitations" }]
    }
  ],
  "resultCard": {
    "title": "Short title",
    "subtitle": "Optional subtitle",
    "actions": [{ "label": "Join", "action": "navigate", "href": "/room/MEETING_ID" }]
  }
}
Rules:
- action "navigate" = same-origin app path starting with /
- action "prompt" = follow-up message the user can send with one click
- action "external" = full http(s) URL
- Prefer actionable buttons after create/list/deploy tools
- Keep markdown concise; put detail in tabs when useful
- For new meetings where the user wants a co-host, use create_meeting with bring_agent=true`;

function buildContextBlock(context?: AgentChatContext): string {
  const surface = (context?.surface || "app").trim() || "app";
  const meetingId = (context?.meetingId || "").trim();
  if (surface === "meeting" && meetingId) {
    return (
      `Context: The user is currently inside meeting "${meetingId}". ` +
      `If this meeting has AI Agent co-host enabled, remind them they can instruct it in room chat with @agent ` +
      `(admit waiting, invite, ring, end meeting). You can also use list_waiting/admit_waiting/invite/create_ring tools. ` +
      `Prefer actions related to this meeting when relevant.`
    );
  }
  return (
    "Context: The user is in the Meeting Forest app (not inside a live meeting room). " +
    "You can create meetings with bring_agent=true so the AI Agent joins as co-host."
  );
}

interface McpToolSchema {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

type ToolTrace = { name: string; args: unknown; result: unknown };

async function fetchToolSchemas(): Promise<McpToolSchema[]> {
  const res = await fetch(`${config.mcpServerUrl}/tools`);
  if (!res.ok) throw new Error(`MCP server tools list failed: ${res.status}`);
  const data = (await res.json()) as { tools?: McpToolSchema[] };
  return data.tools || [];
}

async function invokeMcpTool(
  sessionToken: string,
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const res = await fetch(`${config.mcpServerUrl}/tools/${encodeURIComponent(name)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionToken}`,
    },
    body: JSON.stringify(args || {}),
  });
  const data = await res.json().catch(() => ({ error: res.statusText }));
  if (!res.ok || data.ok === false) {
    return { error: data.error || data.detail || `Tool ${name} failed (${res.status})` };
  }
  return data.result ?? data;
}

function toGeminiTools(schemas: McpToolSchema[]) {
  return [{
    functionDeclarations: schemas.map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters || { type: "object", properties: {} },
    })),
  }];
}

function extractJsonObject(text: string): unknown | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1].trim() : trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function asAction(raw: unknown): AgentUiAction | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const label = String(o.label || "").trim();
  if (!label) return null;
  const action = String(o.action || "navigate").trim() || "navigate";
  return {
    label,
    action,
    href: o.href != null ? String(o.href) : undefined,
    prompt: o.prompt != null ? String(o.prompt) : undefined,
  };
}

function normalizeUi(raw: unknown, fallbackText: string): AgentUiPayload {
  if (!raw || typeof raw !== "object") {
    return { markdown: fallbackText, blocks: [] };
  }
  const o = raw as Record<string, unknown>;
  const markdown = String(o.markdown || o.reply || fallbackText || "").trim() || fallbackText;
  const blocks: AgentUiBlock[] = [];

  if (Array.isArray(o.blocks)) {
    for (const b of o.blocks) {
      if (!b || typeof b !== "object") continue;
      const block = b as Record<string, unknown>;
      const type = String(block.type || "");
      if (type === "actions" && Array.isArray(block.items)) {
        const items = block.items.map(asAction).filter(Boolean) as AgentUiAction[];
        if (items.length) blocks.push({ type: "actions", items });
      } else if (type === "links" && Array.isArray(block.items)) {
        const items = block.items
          .map((it) => {
            if (!it || typeof it !== "object") return null;
            const x = it as Record<string, unknown>;
            const label = String(x.label || "").trim();
            const href = String(x.href || "").trim();
            if (!label || !href) return null;
            return { label, href };
          })
          .filter(Boolean) as Array<{ label: string; href: string }>;
        if (items.length) blocks.push({ type: "links", items });
      } else if (type === "tabs" && Array.isArray(block.tabs)) {
        const tabs = block.tabs
          .map((t, i) => {
            if (!t || typeof t !== "object") return null;
            const x = t as Record<string, unknown>;
            const label = String(x.label || `Tab ${i + 1}`).trim();
            const markdownTab = String(x.markdown || "").trim();
            if (!markdownTab) return null;
            return {
              id: String(x.id || `tab-${i}`),
              label,
              markdown: markdownTab,
            };
          })
          .filter(Boolean) as Array<{ id: string; label: string; markdown: string }>;
        if (tabs.length) blocks.push({ type: "tabs", tabs });
      }
    }
  }

  let resultCard: AgentUiPayload["resultCard"];
  if (o.resultCard && typeof o.resultCard === "object") {
    const rc = o.resultCard as Record<string, unknown>;
    const title = String(rc.title || "").trim();
    if (title) {
      resultCard = {
        title,
        subtitle: rc.subtitle != null ? String(rc.subtitle) : undefined,
        actions: Array.isArray(rc.actions)
          ? (rc.actions.map(asAction).filter(Boolean) as AgentUiAction[])
          : undefined,
      };
    }
  }

  return { markdown, blocks, resultCard };
}

function meetingIdFromResult(result: unknown): string | null {
  if (!result || typeof result !== "object") return null;
  const o = result as Record<string, unknown>;
  const id = o.id || o.meetingId;
  return id != null ? String(id) : null;
}

/** Enrich UI from tool results when the model omits buttons. */
export function enrichUiFromTools(ui: AgentUiPayload, toolsUsed: ToolTrace[]): AgentUiPayload {
  const blocks = [...(ui.blocks || [])];
  let resultCard = ui.resultCard ? { ...ui.resultCard, actions: [...(ui.resultCard.actions || [])] } : undefined;
  const existingLabels = new Set<string>();

  const collectLabels = (actions?: AgentUiAction[]) => {
    for (const a of actions || []) existingLabels.add(a.label.toLowerCase());
  };
  for (const b of blocks) {
    if (b.type === "actions") collectLabels(b.items);
  }
  collectLabels(resultCard?.actions);

  const pushAction = (action: AgentUiAction) => {
    if (existingLabels.has(action.label.toLowerCase())) return;
    existingLabels.add(action.label.toLowerCase());
    let actionsBlock = blocks.find((b) => b.type === "actions") as
      | { type: "actions"; items: AgentUiAction[] }
      | undefined;
    if (!actionsBlock) {
      actionsBlock = { type: "actions", items: [] };
      blocks.unshift(actionsBlock);
    }
    actionsBlock.items.push(action);
  };

  for (const t of toolsUsed) {
    const result = t.result as Record<string, unknown> | null;
    if (!result || typeof result !== "object" || result.error) continue;

    if (t.name === "create_meeting" || t.name === "create_ai_meeting") {
      const id = meetingIdFromResult(result) || (result.meetingId != null ? String(result.meetingId) : null);
      if (id) {
        const label = String(result.label || "Meeting");
        const agentHost = Boolean(result.agentHost);
        pushAction({ label: "Open room", action: "navigate", href: `/room/${encodeURIComponent(id)}` });
        pushAction({
          label: "Invite someone",
          action: "prompt",
          prompt: `Invite a teammate to meeting ${id}`,
        });
        if (!resultCard) {
          resultCard = {
            title: label,
            subtitle: agentHost
              ? "AI Agent co-host joining — instruct with @agent in chat"
              : t.name === "create_ai_meeting"
                ? "AI-hosted meeting scheduled"
                : "Meeting created",
            actions: [
              { label: "Join", action: "navigate", href: `/room/${encodeURIComponent(id)}` },
            ],
          };
        } else if (!resultCard.actions?.length) {
          resultCard.actions = [
            { label: "Join", action: "navigate", href: `/room/${encodeURIComponent(id)}` },
          ];
        }
      }
    }

    if (t.name === "deploy_assistant") {
      const args = (t.args || {}) as Record<string, unknown>;
      const mid = args.meeting_id != null ? String(args.meeting_id) : null;
      if (mid) {
        pushAction({ label: "Open meeting", action: "navigate", href: `/room/${encodeURIComponent(mid)}` });
      }
      pushAction({ label: "View debriefs", action: "navigate", href: "/debriefs" });
      if (!resultCard) {
        resultCard = {
          title: "Assistant deployed",
          subtitle: mid ? `Meeting ${mid}` : "Your Assistant is joining",
          actions: mid
            ? [{ label: "Open meeting", action: "navigate", href: `/room/${encodeURIComponent(mid)}` }]
            : [{ label: "View debriefs", action: "navigate", href: "/debriefs" }],
        };
      }
    }

    if (t.name === "list_invitations") {
      pushAction({ label: "Open invitations", action: "navigate", href: "/meetings/invitations" });
    }

    if (t.name === "list_debriefs") {
      pushAction({ label: "Open debriefs", action: "navigate", href: "/debriefs" });
    }

    if (t.name === "get_assistant" || t.name === "update_assistant") {
      pushAction({ label: "Assistant settings", action: "navigate", href: "/settings/ai-rep" });
    }
  }

  return { ...ui, blocks, resultCard };
}

function buildUiResponse(text: string, toolsUsed: ToolTrace[]): { reply: string; ui: AgentUiPayload } {
  const parsed = extractJsonObject(text);
  let ui = normalizeUi(parsed, text || "Done.");
  ui = enrichUiFromTools(ui, toolsUsed);
  return { reply: ui.markdown || text || "Done.", ui };
}

export async function handleAgentChat(
  session: { name: string; email: string },
  sessionToken: string,
  body: { message?: string; history?: AgentChatMessage[]; context?: AgentChatContext }
) {
  const message = (body.message || "").trim();
  if (!message) return { error: "message required", status: 400 };

  if (!config.gemini.apiKey) {
    return { error: "GEMINI_API_KEY is not configured", status: 503 };
  }

  let schemas: McpToolSchema[];
  try {
    schemas = await fetchToolSchemas();
  } catch (e) {
    return {
      error: `Cannot reach MCP server at ${config.mcpServerUrl}: ${String(e)}`,
      status: 503,
    };
  }

  const ai = new GoogleGenAI({ apiKey: config.gemini.apiKey });
  const history = Array.isArray(body.history) ? body.history.slice(-20) : [];

  const contents: Array<{ role: string; parts: Array<Record<string, unknown>> }> = [];
  for (const h of history) {
    if (h.role === "user") {
      contents.push({ role: "user", parts: [{ text: h.content }] });
    } else if (h.role === "assistant") {
      contents.push({ role: "model", parts: [{ text: h.content }] });
    }
  }
  contents.push({ role: "user", parts: [{ text: message }] });

  const tools = toGeminiTools(schemas);
  const systemInstruction = SYSTEM_PROMPT
    .replace("{{USER_NAME}}", session.name)
    .replace("{{USER_EMAIL}}", session.email)
    .replace("{{NOW}}", String(Date.now()))
    .replace("{{CONTEXT_BLOCK}}", buildContextBlock(body.context));
  const toolTrace: ToolTrace[] = [];

  const maxRounds = 6;
  for (let round = 0; round < maxRounds; round++) {
    const response = await ai.models.generateContent({
      model: config.gemini.model,
      config: {
        systemInstruction,
        tools,
      },
      contents,
    });

    const functionCalls = response.functionCalls?.length
      ? response.functionCalls
      : (response.candidates?.[0]?.content?.parts || [])
          .filter(p => p.functionCall)
          .map(p => p.functionCall!);

    if (!functionCalls.length) {
      const text = (response.text || "").trim() || "Done.";
      const { reply, ui } = buildUiResponse(text, toolTrace);
      return {
        reply,
        ui,
        toolsUsed: toolTrace,
        status: 200,
      };
    }

    const modelParts = response.candidates?.[0]?.content?.parts
      || functionCalls.map(fc => ({ functionCall: fc }));
    contents.push({ role: "model", parts: modelParts as Array<Record<string, unknown>> });

    const functionResponses: Array<Record<string, unknown>> = [];
    for (const fc of functionCalls) {
      const name = fc.name || "";
      const args = (fc.args || {}) as Record<string, unknown>;
      const result = await invokeMcpTool(sessionToken, name, args);
      toolTrace.push({ name, args, result });
      functionResponses.push({
        functionResponse: {
          name,
          response: (typeof result === "object" && result !== null
            ? result
            : { result }) as Record<string, unknown>,
        },
      });
    }
    contents.push({ role: "user", parts: functionResponses });
  }

  const fallback = buildUiResponse(
    "I ran several tool steps but hit the round limit. Check the Tools tab for what completed.",
    toolTrace
  );
  return {
    reply: fallback.reply,
    ui: fallback.ui,
    toolsUsed: toolTrace,
    status: 200,
  };
}
