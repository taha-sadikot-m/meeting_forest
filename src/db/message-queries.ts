import { runQuery } from "./memgraph";
import { normEmail } from "../rings";

export interface ConversationSummary {
  id: string;
  peerName: string;
  peerEmail: string;
  lastMessageAt: number;
  lastMessagePreview: string;
}

export interface DirectMessageRow {
  id: string;
  body: string;
  senderEmail: string;
  sentAt: number;
}

export interface UserLookupRow {
  name: string;
  email: string;
}

export function participantKey(emailA: string, emailB: string): string {
  return [normEmail(emailA), normEmail(emailB)].sort().join("|");
}

function previewText(body: string): string {
  const trimmed = body.trim();
  return trimmed.length > 120 ? trimmed.slice(0, 117) + "..." : trimmed;
}

export async function listConversations(userEmail: string): Promise<ConversationSummary[]> {
  const email = normEmail(userEmail);
  const recs = await runQuery(
    `MATCH (me:User {email: $email})-[:IN_CONVERSATION]->(c:Conversation)
     OPTIONAL MATCH (peer:User)-[:IN_CONVERSATION]->(c)
     WHERE peer.email <> $email
     WITH c, me, peer
     RETURN c.id AS id,
            c.lastMessageAt AS lastMessageAt,
            coalesce(c.lastMessagePreview, '') AS lastMessagePreview,
            coalesce(peer.name, me.name) AS peerName,
            coalesce(peer.email, me.email) AS peerEmail
     ORDER BY coalesce(c.lastMessageAt, c.createdAt) DESC`,
    { email }
  );
  return recs.map(r => ({
    id: r.get("id") as string,
    peerName: (r.get("peerName") as string) || "",
    peerEmail: r.get("peerEmail") as string,
    lastMessageAt: Number(r.get("lastMessageAt") || 0),
    lastMessagePreview: (r.get("lastMessagePreview") as string) || "",
  }));
}

export async function getVerifiedUserByEmail(email: string): Promise<UserLookupRow | null> {
  const normalized = normEmail(email);
  const recs = await runQuery(
    `MATCH (u:User {email: $email})
     WHERE coalesce(u.emailVerified, false) = true
     RETURN u.name AS name, u.email AS email`,
    { email: normalized }
  );
  if (!recs.length) return null;
  return {
    name: (recs[0].get("name") as string) || "",
    email: recs[0].get("email") as string,
  };
}

export async function searchVerifiedUsers(
  _userEmail: string,
  q: string,
  limit = 10
): Promise<UserLookupRow[]> {
  const query = q.trim().toLowerCase();
  if (query.length < 2) return [];

  const safeLimit = Math.min(Math.max(Math.floor(limit) || 10, 1), 10);

  const recs = await runQuery(
    `MATCH (u:User)
     WHERE coalesce(u.emailVerified, false) = true
       AND (toLower(u.email) CONTAINS $q OR toLower(coalesce(u.name, '')) CONTAINS $q)
     RETURN u.name AS name, u.email AS email
     ORDER BY u.name ASC
     LIMIT ${safeLimit}`,
    { q: query }
  );
  return recs.map(r => ({
    name: (r.get("name") as string) || "",
    email: r.get("email") as string,
  }));
}

export async function userHasConversationAccess(
  userEmail: string,
  conversationId: string
): Promise<boolean> {
  const recs = await runQuery(
    `MATCH (u:User {email: $email})-[:IN_CONVERSATION]->(c:Conversation {id: $conversationId})
     RETURN c.id AS id LIMIT 1`,
    { email: normEmail(userEmail), conversationId }
  );
  return recs.length > 0;
}

export async function findOrCreateConversation(
  userEmail: string,
  peerEmail: string
): Promise<{ conversationId: string; peer: UserLookupRow } | { error: string }> {
  const email = normEmail(userEmail);
  const peer = normEmail(peerEmail);

  const peerUser = await getVerifiedUserByEmail(peer);
  if (!peerUser) return { error: "User not found or not verified" };

  const key = participantKey(email, peer);
  const now = Date.now();

  const existing = await runQuery(
    `MATCH (c:Conversation {participantKey: $key})
     RETURN c.id AS id LIMIT 1`,
    { key }
  );

  if (existing.length) {
    const conversationId = existing[0].get("id") as string;
    await runQuery(
      `MATCH (u:User) WHERE u.email IN [$email, $peer]
       MATCH (c:Conversation {id: $conversationId})
       MERGE (u)-[r:IN_CONVERSATION]->(c)
       ON CREATE SET r.joinedAt = $now`,
      { email, peer, conversationId, now }
    );
    return { conversationId, peer: peerUser };
  }

  const conversationId = "conv-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  await runQuery(
    `CREATE (c:Conversation {
       id: $conversationId,
       participantKey: $key,
       lastMessageAt: $now,
       lastMessagePreview: '',
       createdAt: $now
     })
     WITH c
     MATCH (u:User) WHERE u.email IN [$email, $peer]
     MERGE (u)-[:IN_CONVERSATION {joinedAt: $now}]->(c)`,
    { conversationId, key, email, peer, now }
  );

  return { conversationId, peer: peerUser };
}

export async function listMessages(
  userEmail: string,
  conversationId: string,
  opts: { after?: number; before?: number; limit?: number } = {}
): Promise<DirectMessageRow[] | { error: string }> {
  const hasAccess = await userHasConversationAccess(userEmail, conversationId);
  if (!hasAccess) return { error: "Conversation not found" };

  const limit = Math.min(Math.max(Math.floor(opts.limit ?? 50) || 50, 1), 100);

  if (opts.after !== undefined && opts.after > 0) {
    const recs = await runQuery(
      `MATCH (m:DirectMessage)-[:IN_CONVERSATION]->(c:Conversation {id: $conversationId})
       WHERE m.sentAt > $after
       RETURN m.id AS id, m.body AS body, m.senderEmail AS senderEmail, m.sentAt AS sentAt
       ORDER BY m.sentAt ASC
       LIMIT ${limit}`,
      { conversationId, after: opts.after }
    );
    return recs.map(mapMessage);
  }

  if (opts.before !== undefined && opts.before > 0) {
    const recs = await runQuery(
      `MATCH (m:DirectMessage)-[:IN_CONVERSATION]->(c:Conversation {id: $conversationId})
       WHERE m.sentAt < $before
       RETURN m.id AS id, m.body AS body, m.senderEmail AS senderEmail, m.sentAt AS sentAt
       ORDER BY m.sentAt DESC
       LIMIT ${limit}`,
      { conversationId, before: opts.before }
    );
    return recs.map(mapMessage).reverse();
  }

  const recs = await runQuery(
    `MATCH (m:DirectMessage)-[:IN_CONVERSATION]->(c:Conversation {id: $conversationId})
     RETURN m.id AS id, m.body AS body, m.senderEmail AS senderEmail, m.sentAt AS sentAt
     ORDER BY m.sentAt DESC
     LIMIT ${limit}`,
    { conversationId }
  );
  return recs.map(mapMessage).reverse();
}

function mapMessage(r: { get: (key: string) => unknown }): DirectMessageRow {
  return {
    id: r.get("id") as string,
    body: r.get("body") as string,
    senderEmail: r.get("senderEmail") as string,
    sentAt: Number(r.get("sentAt")),
  };
}

export async function sendMessage(
  userEmail: string,
  conversationId: string,
  body: string
): Promise<DirectMessageRow | { error: string }> {
  const hasAccess = await userHasConversationAccess(userEmail, conversationId);
  if (!hasAccess) return { error: "Conversation not found" };

  const trimmed = body.trim();
  if (!trimmed) return { error: "Message cannot be empty" };
  if (trimmed.length > 4000) return { error: "Message too long (max 4000 characters)" };

  const email = normEmail(userEmail);
  const now = Date.now();
  const messageId = "msg-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  await runQuery(
    `MATCH (c:Conversation {id: $conversationId})
     CREATE (m:DirectMessage {
       id: $messageId,
       body: $body,
       senderEmail: $email,
       sentAt: $now
     })-[:IN_CONVERSATION]->(c)
     SET c.lastMessageAt = $now,
         c.lastMessagePreview = $preview`,
    {
      conversationId,
      messageId,
      body: trimmed,
      email,
      now,
      preview: previewText(trimmed),
    }
  );

  return { id: messageId, body: trimmed, senderEmail: email, sentAt: now };
}

const INVITE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export async function recordPlatformInvite(
  inviterEmail: string,
  inviteeEmail: string
): Promise<{ allowed: boolean; lastSentAt?: number }> {
  const inviter = normEmail(inviterEmail);
  const invitee = normEmail(inviteeEmail);
  const now = Date.now();

  const existing = await runQuery(
    `MATCH (i:PlatformInvite {inviterEmail: $inviter, inviteeEmail: $invitee})
     RETURN i.sentAt AS sentAt
     ORDER BY i.sentAt DESC
     LIMIT 1`,
    { inviter, invitee }
  );

  if (existing.length) {
    const lastSentAt = Number(existing[0].get("sentAt"));
    if (now - lastSentAt < INVITE_COOLDOWN_MS) {
      return { allowed: false, lastSentAt };
    }
  }

  const inviteId = "pinv-" + Date.now().toString(36);
  await runQuery(
    `CREATE (i:PlatformInvite {
       id: $inviteId,
       inviterEmail: $inviter,
       inviteeEmail: $invitee,
       sentAt: $now
     })`,
    { inviteId, inviter, invitee, now }
  );

  return { allowed: true };
}

export async function isUserRegistered(email: string): Promise<boolean> {
  const recs = await runQuery(
    `MATCH (u:User {email: $email}) RETURN u.email AS email LIMIT 1`,
    { email: normEmail(email) }
  );
  return recs.length > 0;
}
