import { proxyActivities, sleep, defineSignal, setHandler, condition } from "@temporalio/workflow";
import type * as activities from "../activities/meeting";

const {
  botJoinAndGreet,
  ringParticipant,
  isParticipantInMeeting,
  waitForParticipantPickup,
  deployAssistantForMeeting,
  botAnnounceEnd,
  disconnectHostBotActivity,
  updateMeetingStatus,
  signalMeetingEndedToReps,
  isRingingEnabledForUser,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: "5 minutes",
  retry: { maximumAttempts: 3 },
});

export interface MeetingOrchestrationInput {
  meetingId: string;
  label: string;
  agenda: string;
  scheduledAt: number;
  participants: Array<{ email: string; name: string; ringAt: number; role: string }>;
  creatorEmail: string;
  creatorName: string;
}

export const participantJoined = defineSignal<[ { email: string } ]>("participantJoined");
export const meetingEnded = defineSignal("meetingEnded");

const MEETING_DURATION_MS = 4 * 60 * 60 * 1000;
const RING_ATTEMPTS = 2;

export async function meetingOrchestrationWorkflow(input: MeetingOrchestrationInput): Promise<void> {
  const { meetingId, label, agenda, scheduledAt, participants, creatorEmail, creatorName } = input;

  let ended = false;
  setHandler(meetingEnded, () => { ended = true; });
  setHandler(participantJoined, () => { /* recorded via Memgraph in API */ });

  const now = Date.now();
  if (scheduledAt > now) {
    await sleep(scheduledAt - now);
  }

  await botJoinAndGreet(meetingId, agenda);
  await updateMeetingStatus(meetingId, "active");

  const creatorNorm = creatorEmail.trim().toLowerCase();
  const sorted = [...participants].sort((a, b) => a.ringAt - b.ringAt);

  for (const p of sorted) {
    if (ended) break;
    if (p.role === "host" || p.email.trim().toLowerCase() === creatorNorm) continue;

    const waitUntil = p.ringAt - Date.now();
    if (waitUntil > 0) await sleep(waitUntil);
    if (ended) break;

    if (await isParticipantInMeeting(meetingId, p.email)) continue;

    const ringingOn = await isRingingEnabledForUser(p.email);

    if (!ringingOn) {
      await deployAssistantForMeeting(meetingId, p.email);
    } else {
      let pickedUp = false;
      for (let attempt = 0; attempt < RING_ATTEMPTS && !pickedUp; attempt++) {
        const ringId = await ringParticipant(creatorEmail, creatorName, p.email, meetingId, label);
        pickedUp = await waitForParticipantPickup(meetingId, p.email, ringId);
      }

      if (!pickedUp && !ended) {
        await deployAssistantForMeeting(meetingId, p.email);
      }
    }
  }

  const deadline = scheduledAt + MEETING_DURATION_MS;
  const remaining = deadline - Date.now();
  if (remaining > 0 && !ended) {
    await condition(() => ended, remaining);
  }

  await botAnnounceEnd(meetingId);
  await signalMeetingEndedToReps(meetingId);
  await disconnectHostBotActivity(meetingId);
  await updateMeetingStatus(meetingId, "ended");
}
