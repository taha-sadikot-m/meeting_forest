import { proxyActivities, defineSignal, setHandler, condition } from "@temporalio/workflow";
import type * as activities from "../activities/agent-host";

const {
  botJoinAndIntro,
  handleAgentHostChatActivity,
  publishAgentHostChatActivity,
  disconnectAgentHostBotActivity,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: "5 minutes",
  retry: { maximumAttempts: 2 },
});

export interface AgentHostWorkflowInput {
  meetingId: string;
  label: string;
  creatorEmail: string;
  creatorName: string;
}

interface ChatMsg {
  senderName: string;
  text: string;
  timestamp: number;
}

export const meetingEnded = defineSignal("meetingEnded");
export const chatMessage = defineSignal<[ChatMsg]>("chatMessage");

const MEETING_DURATION_MS = 4 * 60 * 60 * 1000;

/** Keep in sync with src/agent-host.ts isAddressedToAgent (workflow sandbox). */
function isAddressedToAgent(text: string): boolean {
  const t = text.toLowerCase().trim();
  return (
    t.includes("@agent") ||
    t.includes("@ai agent") ||
    t.startsWith("agent ") ||
    t.includes("ai agent") ||
    t.startsWith("hey agent") ||
    t.startsWith("ok agent")
  );
}

export async function agentHostWorkflow(input: AgentHostWorkflowInput): Promise<void> {
  const { meetingId, label, creatorEmail, creatorName } = input;

  const joined = await botJoinAndIntro(meetingId, label, creatorName);
  if (!joined) return;

  const pendingMessages: ChatMsg[] = [];
  let ended = false;

  setHandler(meetingEnded, () => { ended = true; });
  setHandler(chatMessage, (msg) => { pendingMessages.push(msg); });

  const deadline = Date.now() + MEETING_DURATION_MS;

  while (!ended || pendingMessages.length > 0) {
    const remaining = deadline - Date.now();
    if (remaining <= 0 && !pendingMessages.length) break;

    if (pendingMessages.length === 0) {
      if (ended) break;
      await condition(() => ended || pendingMessages.length > 0, Math.min(remaining, 30_000));
      continue;
    }

    const msg = pendingMessages.shift()!;
    if (msg.senderName === "AI Agent" || msg.senderName === "Meeting Host") continue;
    if (!isAddressedToAgent(msg.text)) continue;

    const reply = await handleAgentHostChatActivity({
      meetingId,
      label,
      creatorEmail,
      creatorName,
      message: msg,
    });

    if (reply) {
      await publishAgentHostChatActivity(meetingId, reply);
    }
  }

  await disconnectAgentHostBotActivity(meetingId);
}
