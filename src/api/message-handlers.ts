import {
  findOrCreateConversation,
  isUserRegistered,
  listConversations,
  listMessages,
  recordPlatformInvite,
  searchVerifiedUsers,
  sendMessage,
} from "../db/message-queries";
import { sendPlatformInviteEmail } from "../auth";
import { normEmail } from "../rings";

const INVITE_WINDOW_MS = 60 * 60 * 1000;
const INVITE_MAX_PER_HOUR = 5;
const inviteRateLimits = new Map<string, { count: number; windowStart: number }>();

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function checkInviteRateLimit(inviterEmail: string): boolean {
  const key = normEmail(inviterEmail);
  const now = Date.now();
  const entry = inviteRateLimits.get(key);

  if (!entry || now - entry.windowStart > INVITE_WINDOW_MS) {
    inviteRateLimits.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= INVITE_MAX_PER_HOUR) return false;
  entry.count += 1;
  return true;
}

export async function handleListConversations(session: { email: string }) {
  const conversations = await listConversations(session.email);
  return { conversations, status: 200 };
}

export async function handleCreateConversation(
  session: { email: string },
  body: { email?: string }
) {
  const peerEmail = (body.email || "").trim();
  if (!peerEmail) return { error: "email is required", status: 400 };
  if (!isValidEmail(peerEmail)) return { error: "Invalid email address", status: 400 };

  const result = await findOrCreateConversation(session.email, peerEmail);
  if ("error" in result) return { error: result.error, status: 400 };

  return {
    conversationId: result.conversationId,
    peer: result.peer,
    status: 200,
  };
}

export async function handleListMessages(
  session: { email: string },
  conversationId: string,
  query: { after?: string; before?: string; limit?: string }
) {
  const after = query.after ? Number(query.after) : undefined;
  const before = query.before ? Number(query.before) : undefined;
  const limit = query.limit ? Number(query.limit) : undefined;

  const result = await listMessages(session.email, conversationId, { after, before, limit });
  if ("error" in result) return { error: result.error, status: 404 };

  return { messages: result, status: 200 };
}

export async function handleSendMessage(
  session: { email: string },
  conversationId: string,
  body: { body?: string }
) {
  const text = body.body ?? "";
  const result = await sendMessage(session.email, conversationId, text);
  if ("error" in result) {
    const status = result.error === "Conversation not found" ? 404 : 400;
    return { error: result.error, status };
  }

  return { message: result, status: 200 };
}

export async function handleLookupUsers(
  session: { email: string },
  q: string
) {
  const query = (q || "").trim();
  if (query.length < 2) return { users: [], status: 200 };

  const users = await searchVerifiedUsers(session.email, query);
  return { users, status: 200 };
}

export async function handleInviteUser(
  session: { name: string; email: string },
  body: { email?: string }
) {
  const inviteeEmail = normEmail((body.email || "").trim());
  if (!inviteeEmail) return { ok: true, status: 200 };
  if (!isValidEmail(inviteeEmail)) return { ok: true, status: 200 };
  if (inviteeEmail === normEmail(session.email)) return { ok: true, status: 200 };

  if (!checkInviteRateLimit(session.email)) {
    return { ok: true, status: 200 };
  }

  const registered = await isUserRegistered(inviteeEmail);
  if (registered) {
    return { ok: true, status: 200 };
  }

  const inviteRecord = await recordPlatformInvite(session.email, inviteeEmail);
  if (!inviteRecord.allowed) {
    return { ok: true, status: 200 };
  }

  try {
    await sendPlatformInviteEmail(inviteeEmail, session.name);
  } catch (e) {
    console.error("[messages] invite email failed:", e);
  }

  return { ok: true, status: 200 };
}
