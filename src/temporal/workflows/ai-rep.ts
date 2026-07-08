import { proxyActivities, defineSignal, setHandler, condition } from "@temporalio/workflow";
import type * as activities from "../activities/rep";

const {
  loadRepContext,
  botJoinRoom,
  generateRepResponseActivity,
  publishChatMessageActivity,
  generateDebriefActivity,
  deliverDebriefActivity,
  disconnectRepBotActivity,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: "10 minutes",
  retry: { maximumAttempts: 3 },
});

export interface AiRepWorkflowInput {
  meetingId: string;
  ownerEmail: string;
  repId: string;
  repName: string;
}

interface ChatMsg {
  senderName: string;
  text: string;
  timestamp: number;
}

export const meetingEnded = defineSignal("meetingEnded");
export const chatMessage = defineSignal<[ChatMsg]>("chatMessage");

const MEETING_DURATION_MS = 4 * 60 * 60 * 1000;

export async function aiRepWorkflow(input: AiRepWorkflowInput): Promise<void> {
  const { meetingId, ownerEmail, repId, repName } = input;

  await loadRepContext(repId);
  await botJoinRoom(meetingId, repId, repName, ownerEmail);

  const captureLog: string[] = [];
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
    const line = `[${msg.senderName}]: ${msg.text}`;
    captureLog.push(line);

    const isQuestion = msg.text.includes("?") ||
      msg.text.toLowerCase().includes(repName.toLowerCase()) ||
      msg.text.toLowerCase().includes("rep");

    if (isQuestion) {
      const response = await generateRepResponseActivity({
        repId,
        repName,
        ownerEmail,
        captureLog: [...captureLog],
        newMessage: msg,
      });

      if (response) {
        captureLog.push(`[${repName}]: ${response}`);
        await publishChatMessageActivity(meetingId, ownerEmail, repName, response);
      }
    }
  }

  const debriefId = await generateDebriefActivity({
    ownerEmail,
    meetingId,
    repId,
    captureLog: [...captureLog],
  });

  await deliverDebriefActivity(ownerEmail, debriefId, meetingId);
  await disconnectRepBotActivity(meetingId, ownerEmail);
}
