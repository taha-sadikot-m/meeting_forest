import { loadRepContext as loadRepContextDb, saveMeetingDebrief, markDebriefDelivered, getDebrief } from "../../db/ai-queries";
import { generateRepResponse, generateDebrief } from "../../llm/gemini";
import {
  connectRepBot,
  publishRepChat,
  disconnectRepBot,
} from "../livekit-bridge";
import { sendDebriefEmail } from "../../auth";
import { config } from "../../config";

export async function loadRepContext(repId: string) {
  return loadRepContextDb(repId);
}

export async function botJoinRoom(
  meetingId: string,
  repId: string,
  repName: string,
  ownerEmail: string
): Promise<void> {
  const ctx = await loadRepContextDb(repId);
  const intro = ctx.introMessage ||
    `Hi, I'm ${repName}, attending on behalf of my owner.`;
  await connectRepBot(meetingId, ownerEmail, repName);
  await publishRepChat(meetingId, ownerEmail, repName, intro);
}

export async function generateRepResponseActivity(params: {
  repId: string;
  repName: string;
  ownerEmail: string;
  captureLog: string[];
  newMessage: { senderName: string; text: string };
}): Promise<string> {
  const ctx = await loadRepContextDb(params.repId);
  return generateRepResponse(
    ctx.systemPrompt,
    ctx.contextChunks,
    params.repName,
    params.ownerEmail,
    params.captureLog,
    params.newMessage
  );
}

export async function publishChatMessageActivity(
  meetingId: string,
  ownerEmail: string,
  repName: string,
  text: string
): Promise<void> {
  await publishRepChat(meetingId, ownerEmail, repName, text);
}

export async function generateDebriefActivity(params: {
  ownerEmail: string;
  meetingId: string;
  repId: string;
  captureLog: string[];
}): Promise<string> {
  const ctx = await loadRepContextDb(params.repId);
  const debrief = await generateDebrief(
    ctx.systemPrompt,
    ctx.contextChunks,
    params.ownerEmail,
    params.captureLog
  );
  return saveMeetingDebrief({
    meetingId: params.meetingId,
    ownerEmail: params.ownerEmail,
    repId: params.repId,
    summary: debrief.summary,
    tasks: debrief.tasks,
    decisions: debrief.decisions,
    escalations: debrief.escalations,
    rawLog: params.captureLog.join("\n"),
  });
}

export async function deliverDebriefActivity(
  ownerEmail: string,
  debriefId: string,
  meetingId: string
): Promise<void> {
  const debrief = await getDebrief(debriefId, ownerEmail);
  if (!debrief) return;

  const debriefUrl = `${config.appUrl}/debriefs?id=${encodeURIComponent(debriefId)}`;
  await sendDebriefEmail(
    ownerEmail,
    (debrief.meetingLabel as string) || meetingId,
    debrief.summary as string,
    debriefUrl
  );
  await markDebriefDelivered(debriefId);
}

export async function disconnectRepBotActivity(
  meetingId: string,
  ownerEmail: string
): Promise<void> {
  await disconnectRepBot(meetingId, ownerEmail);
}
