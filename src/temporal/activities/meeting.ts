import { config } from "../../config";
import {
  connectHostBot,
  publishHostChat,
  disconnectHostBot,
} from "../livekit-bridge";
import { updateAiMeetingStatus } from "../../db/ai-queries";
import { getTemporalClient } from "../client";
import { getRepWorkflowIds } from "../rep-registry";
import { runQuery } from "../../db/memgraph";
import { createRing, normEmail } from "../../rings";
import { startAssistantWorkflow } from "../../api/ai-handlers";
import { isRingingEnabledForUser as queryRingingEnabled } from "../../db/user-queries";

const RING_WAIT_MS = 2 * 60 * 1000;
const POLL_INTERVAL_MS = 5000;

export async function botJoinAndGreet(meetingId: string, agenda: string): Promise<void> {
  await connectHostBot(meetingId);
  const welcome = `Welcome! I'm your meeting host for this session.\n\n**Agenda:**\n${agenda}\n\nParticipants will be called at their scheduled times. Assistants may join if someone is unavailable.`;
  await publishHostChat(meetingId, welcome);
}

export async function ringParticipant(
  fromEmail: string,
  fromName: string,
  toEmail: string,
  meetingId: string,
  meetingLabel: string
): Promise<string | null> {
  const url = `${config.appUrl}/api/internal/rings`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Worker-Secret": config.workerInternalSecret,
    },
    body: JSON.stringify({ fromEmail, fromName, toEmail, meetingId, meetingLabel }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.warn("[meeting-activity] ring failed", { toEmail, status: res.status, body });
    return null;
  }
  const data = await res.json() as { ringId?: string };
  return data.ringId || null;
}

export async function isParticipantInMeeting(
  meetingId: string,
  email: string
): Promise<boolean> {
  const url = `${config.appUrl}/api/internal/meetings/${encodeURIComponent(meetingId)}/participants/${encodeURIComponent(email)}/status`;
  const res = await fetch(url, {
    headers: { "X-Worker-Secret": config.workerInternalSecret },
  });
  if (!res.ok) return false;
  const data = await res.json() as { inRoom?: boolean; joined?: boolean };
  return data.inRoom === true || data.joined === true;
}

async function getRingStatusInternal(ringId: string): Promise<string> {
  const url = `${config.appUrl}/api/internal/rings/${encodeURIComponent(ringId)}/status`;
  const res = await fetch(url, {
    headers: { "X-Worker-Secret": config.workerInternalSecret },
  });
  if (!res.ok) return "expired";
  const data = await res.json() as { ringStatus?: string };
  return data.ringStatus || "expired";
}

export async function waitForParticipantPickup(
  meetingId: string,
  email: string,
  ringId: string | null
): Promise<boolean> {
  const deadline = Date.now() + RING_WAIT_MS;

  while (Date.now() < deadline) {
    if (await isParticipantInMeeting(meetingId, email)) return true;
    if (ringId) {
      const status = await getRingStatusInternal(ringId);
      if (status === "accepted") return true;
    }
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  return isParticipantInMeeting(meetingId, email);
}

export async function isRingingEnabledForUser(email: string): Promise<boolean> {
  return queryRingingEnabled(email);
}

export async function deployAssistantForMeeting(
  meetingId: string,
  ownerEmail: string
): Promise<void> {
  console.log("[meeting-activity] deploying assistant", { meetingId, ownerEmail });
  await startAssistantWorkflow(ownerEmail, meetingId);
}

export async function botAnnounceEnd(meetingId: string): Promise<void> {
  await publishHostChat(
    meetingId,
    "Meeting ended — your Assistant will deliver your debrief shortly."
  );
}

export async function disconnectHostBotActivity(meetingId: string): Promise<void> {
  await disconnectHostBot(meetingId);
}

export async function updateMeetingStatus(meetingId: string, status: string): Promise<void> {
  await updateAiMeetingStatus(meetingId, status);
}

export async function signalMeetingEndedToReps(meetingId: string): Promise<void> {
  const client = await getTemporalClient();
  const workflowIds = getRepWorkflowIds(meetingId);
  for (const workflowId of workflowIds) {
    try {
      const handle = client.workflow.getHandle(workflowId);
      await handle.signal("meetingEnded");
    } catch (e) {
      console.warn("[meeting-activity] signal rep failed", workflowId, e);
    }
  }
}

export async function lookupUserName(email: string): Promise<string | null> {
  const recs = await runQuery(
    "MATCH (u:User {email: $email}) RETURN u.name AS name",
    { email: normEmail(email) }
  );
  if (!recs.length) return null;
  return (recs[0].get("name") as string) || email;
}

export async function createInternalRing(
  fromEmail: string,
  fromName: string,
  toEmail: string,
  meetingId: string,
  meetingLabel: string,
  isTargetInMeeting: (email: string) => boolean
) {
  return createRing(
    fromEmail,
    fromName,
    toEmail,
    meetingId,
    meetingLabel,
    lookupUserName,
    isTargetInMeeting
  );
}
