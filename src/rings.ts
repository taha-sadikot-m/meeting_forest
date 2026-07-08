export interface RingEntry {
  ringId: string;
  fromEmail: string;
  fromName: string;
  toEmail: string;
  toName: string;
  meetingId: string;
  meetingLabel: string;
  startedAt: number;
  status: "ringing" | "accepted" | "rejected" | "expired";
}

const ringsById = new Map<string, RingEntry>();
const ringsByEmail = new Map<string, RingEntry>();

setInterval(() => {
  const cutoff = Date.now() - 2 * 60 * 1000;
  ringsById.forEach(r => {
    if (r.status === "ringing" && r.startedAt < cutoff) {
      r.status = "expired";
      ringsByEmail.delete(r.toEmail);
    }
  });
  const stale = Date.now() - 5 * 60 * 1000;
  ringsById.forEach((r, id) => {
    if (r.status !== "ringing" && r.startedAt < stale) ringsById.delete(id);
  });
}, 30_000);

export function normEmail(email: string): string {
  return email.trim().toLowerCase();
}

export interface CreateRingResult {
  ringId: string;
  toName: string;
}

export async function createRing(
  fromEmail: string,
  fromName: string,
  toEmail: string,
  meetingId: string,
  meetingLabel: string,
  lookupUserName: (email: string) => Promise<string | null>,
  isTargetInMeeting: (email: string) => boolean
): Promise<CreateRingResult | { error: string; status: number }> {
  const targetEmail = normEmail(toEmail);
  const callerEmail = normEmail(fromEmail);

  if (!targetEmail.includes("@")) {
    return { error: "Valid email required", status: 400 };
  }
  if (!meetingId) {
    return { error: "meetingId required", status: 400 };
  }

  const toName = await lookupUserName(targetEmail);
  if (!toName) {
    return { error: "No account found for that email", status: 404 };
  }

  if (isTargetInMeeting(targetEmail)) {
    return { error: "That person is already in the meeting", status: 409 };
  }

  const existing = ringsByEmail.get(targetEmail);
  if (existing) {
    existing.status = "expired";
    ringsById.delete(existing.ringId);
  }

  const ringId = "ring-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
  const ring: RingEntry = {
    ringId,
    fromEmail: callerEmail,
    fromName,
    toEmail: targetEmail,
    toName,
    meetingId,
    meetingLabel,
    startedAt: Date.now(),
    status: "ringing",
  };
  ringsById.set(ringId, ring);
  ringsByEmail.set(targetEmail, ring);
  console.log("[ring] create", { caller: callerEmail, target: targetEmail, meetingId, ringId });
  return { ringId, toName };
}

export function getRingById(ringId: string): RingEntry | undefined {
  return ringsById.get(ringId);
}

export function getRingByEmail(email: string): RingEntry | undefined {
  return ringsByEmail.get(normEmail(email));
}

export function deleteRingByEmail(email: string) {
  ringsByEmail.delete(normEmail(email));
}
