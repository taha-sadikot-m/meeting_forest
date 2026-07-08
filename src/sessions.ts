interface ActiveSession {
  name: string;
  lastSeen: number;
}

export const SESSION_TTL_MS = 90_000;
const activeSessions = new Map<string, Map<string, ActiveSession>>();

export function pruneStaleSessions(roomSessions: Map<string, ActiveSession>) {
  const cutoff = Date.now() - SESSION_TTL_MS;
  roomSessions.forEach((entry, email) => {
    if (entry.lastSeen < cutoff) roomSessions.delete(email);
  });
}

export function isSessionActive(roomSessions: Map<string, ActiveSession> | undefined, email: string): boolean {
  if (!roomSessions) return false;
  const entry = roomSessions.get(email);
  if (!entry) return false;
  if (Date.now() - entry.lastSeen > SESSION_TTL_MS) {
    roomSessions.delete(email);
    return false;
  }
  return true;
}

export function getActiveSessions(meetingId: string): Map<string, ActiveSession> | undefined {
  return activeSessions.get(meetingId);
}

export function ensureActiveSession(meetingId: string, email: string, name: string) {
  if (!activeSessions.has(meetingId)) activeSessions.set(meetingId, new Map());
  activeSessions.get(meetingId)!.set(email, { name, lastSeen: Date.now() });
}

export function removeActiveSession(meetingId: string, email: string) {
  activeSessions.get(meetingId)?.delete(email);
}

export function touchActiveSession(meetingId: string, email: string): boolean {
  const roomSessions = activeSessions.get(meetingId);
  const entry = roomSessions?.get(email);
  if (!entry) return false;
  entry.lastSeen = Date.now();
  return true;
}

export function isUserInMeeting(meetingId: string, email: string): boolean {
  const roomSessions = activeSessions.get(meetingId);
  if (roomSessions) pruneStaleSessions(roomSessions);
  return isSessionActive(roomSessions, email);
}

export { activeSessions };
