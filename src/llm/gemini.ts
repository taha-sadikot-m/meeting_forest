import { GoogleGenAI } from "@google/genai";
import { config } from "../config";

const ai = new GoogleGenAI({ apiKey: config.gemini.apiKey });

function buildSystemPrompt(systemPrompt: string, contextChunks: Array<{ title: string; content: string }>): string {
  const contextBlock = contextChunks.length
    ? "\n\nReference context:\n" + contextChunks.map(c => `### ${c.title}\n${c.content}`).join("\n\n")
    : "";
  return systemPrompt + contextBlock;
}

export async function generateRepResponse(
  systemPrompt: string,
  contextChunks: Array<{ title: string; content: string }>,
  repName: string,
  ownerEmail: string,
  recentMessages: string[],
  newMessage: { senderName: string; text: string }
): Promise<string> {
  if (!config.gemini.apiKey) {
    console.warn("[gemini] No API key — skipping rep response");
    return "";
  }

  const userPrompt = `You are ${repName}, representing ${ownerEmail} in a meeting.

A participant (${newMessage.senderName}) said: "${newMessage.text}"

Recent meeting chat:
${recentMessages.slice(-15).join("\n")}

Reply as ${repName} on behalf of ${ownerEmail}. Be concise and helpful.
If this message does not need a response from you (not a question, not directed at you or your owner), respond with exactly: NO_RESPONSE
If you should respond, give a brief helpful reply only.`;

  try {
    const response = await ai.models.generateContent({
      model: config.gemini.model,
      config: { systemInstruction: buildSystemPrompt(systemPrompt, contextChunks) },
      contents: userPrompt,
    });
    const text = (response.text || "").trim();
    if (!text || text === "NO_RESPONSE" || text.toLowerCase().includes("no_response")) {
      return "";
    }
    return text;
  } catch (e) {
    console.error("[gemini] generateRepResponse error:", e);
    return "";
  }
}

export interface DebriefResult {
  summary: string;
  tasks: Array<{ task: string; assignee?: string; deadline?: string }>;
  decisions: string[];
  escalations: string[];
}

export async function generateDebrief(
  systemPrompt: string,
  contextChunks: Array<{ title: string; content: string }>,
  ownerEmail: string,
  captureLog: string[]
): Promise<DebriefResult> {
  const fallback: DebriefResult = {
    summary: "Meeting debrief could not be generated.",
    tasks: [],
    decisions: [],
    escalations: [],
  };

  if (!config.gemini.apiKey) {
    console.warn("[gemini] No API key — using fallback debrief");
    return {
      ...fallback,
      summary: `Meeting attended on behalf of ${ownerEmail}. ${captureLog.length} messages captured.`,
    };
  }

  const logText = captureLog.join("\n");
  const chunks: string[] = [];
  const maxChunk = 100_000;
  for (let i = 0; i < logText.length; i += maxChunk) {
    chunks.push(logText.slice(i, i + maxChunk));
  }

  const userPrompt = `Here is the chat log from a meeting you attended on behalf of ${ownerEmail}.
Generate a debrief as JSON with these fields:
- summary: string (3-5 sentences)
- tasks: array of {task, assignee, deadline} for tasks assigned to ${ownerEmail}
- decisions: array of decision strings
- escalations: array of things requiring ${ownerEmail}'s personal attention

Chat log:
${chunks[0] || "(empty meeting)"}`;

  try {
    const response = await ai.models.generateContent({
      model: config.gemini.model,
      config: {
        systemInstruction: buildSystemPrompt(systemPrompt, contextChunks),
        responseMimeType: "application/json",
      },
      contents: userPrompt,
    });
    const text = response.text || "{}";
    const parsed = JSON.parse(text) as DebriefResult;
    return {
      summary: parsed.summary || fallback.summary,
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
      escalations: Array.isArray(parsed.escalations) ? parsed.escalations : [],
    };
  } catch (e) {
    console.error("[gemini] generateDebrief error:", e);
    return {
      ...fallback,
      summary: `Meeting summary for ${ownerEmail}. ${captureLog.length} messages captured.`,
    };
  }
}
