import { runQuery } from "./memgraph";
import { activeSessions, pruneStaleSessions } from "../sessions";

function dayKey(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function lastNDayKeys(n: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    keys.push(dayKey(d.getTime()));
  }
  return keys;
}

function fillSeries(keys: string[], counts: Map<string, number>): { date: string; count: number }[] {
  return keys.map(date => ({ date, count: counts.get(date) || 0 }));
}

function livePresenceCount(): { liveUsers: number; liveRooms: number } {
  let liveUsers = 0;
  let liveRooms = 0;
  activeSessions.forEach(room => {
    pruneStaleSessions(room);
    if (room.size > 0) {
      liveRooms += 1;
      liveUsers += room.size;
    }
  });
  return { liveUsers, liveRooms };
}

export interface AdminOverview {
  users: {
    total: number;
    verified: number;
    unverified: number;
    last7d: number;
    last30d: number;
  };
  meetings: {
    total: number;
    active: number;
    ended: number;
    public: number;
    private: number;
    last7d: number;
    last30d: number;
  };
  participation: {
    totalJoins: number;
    avgPerMeeting: number;
  };
  invitations: {
    total: number;
    converted: number;
    conversionRate: number;
  };
  ai: {
    meetingsTotal: number;
    byStatus: Record<string, number>;
    participantSlots: number;
    joinedSlots: number;
    joinRate: number;
    reps: number;
    debriefsTotal: number;
    debriefsUndelivered: number;
  };
  live: {
    liveUsers: number;
    liveRooms: number;
  };
  series: {
    signups: { date: string; count: number }[];
    meetings: { date: string; count: number }[];
  };
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const now = Date.now();
  const d7 = now - 7 * 24 * 60 * 60 * 1000;
  const d30 = now - 30 * 24 * 60 * 60 * 1000;
  const dayKeys = lastNDayKeys(30);

  const [
    userStats,
    meetingStats,
    partStats,
    inviteStats,
    aiMeetingStats,
    aiJoinStats,
    aiRepStats,
    debriefStats,
    signupTs,
    meetingTs,
  ] = await Promise.all([
    runQuery(
      `MATCH (u:User)
       RETURN count(u) AS total,
              sum(CASE WHEN u.emailVerified = true THEN 1 ELSE 0 END) AS verified,
              sum(CASE WHEN coalesce(u.emailVerified, false) = false THEN 1 ELSE 0 END) AS unverified,
              sum(CASE WHEN u.createdAt >= $d7 THEN 1 ELSE 0 END) AS last7d,
              sum(CASE WHEN u.createdAt >= $d30 THEN 1 ELSE 0 END) AS last30d`,
      { d7, d30 }
    ),
    runQuery(
      `MATCH (m:Meeting)
       RETURN count(m) AS total,
              sum(CASE WHEN coalesce(m.status, 'active') = 'active' THEN 1 ELSE 0 END) AS active,
              sum(CASE WHEN m.status = 'ended' THEN 1 ELSE 0 END) AS ended,
              sum(CASE WHEN coalesce(m.privacy, 'public') = 'public' THEN 1 ELSE 0 END) AS publicCount,
              sum(CASE WHEN m.privacy = 'private' THEN 1 ELSE 0 END) AS privateCount,
              sum(CASE WHEN m.createdAt >= $d7 THEN 1 ELSE 0 END) AS last7d,
              sum(CASE WHEN m.createdAt >= $d30 THEN 1 ELSE 0 END) AS last30d`,
      { d7, d30 }
    ),
    runQuery(
      `OPTIONAL MATCH ()-[r:PARTICIPATES_IN]->(m:Meeting)
       WITH count(r) AS totalJoins, count(DISTINCT m) AS meetingsWithJoins
       RETURN totalJoins,
              CASE WHEN meetingsWithJoins = 0 THEN 0.0
                   ELSE toFloat(totalJoins) / meetingsWithJoins END AS avgPerMeeting`
    ),
    runQuery(
      `OPTIONAL MATCH ()-[inv:INVITED_TO]->(:Meeting)
       WITH count(inv) AS total
       OPTIONAL MATCH (u:User)-[:INVITED_TO]->(m:Meeting)
       WHERE (u)-[:PARTICIPATES_IN]->(m)
       RETURN total, count(u) AS converted`
    ),
    runQuery(
      `OPTIONAL MATCH (a:AiHostedMeeting)
       RETURN a.status AS status, count(a) AS cnt`
    ),
    runQuery(
      `OPTIONAL MATCH ()-[p:AI_MEETING_PARTICIPANT]->(:AiHostedMeeting)
       RETURN count(p) AS slots,
              sum(CASE WHEN p.joined = true THEN 1 ELSE 0 END) AS joined`
    ),
    runQuery(`OPTIONAL MATCH (r:AiRep) RETURN count(r) AS reps`),
    runQuery(
      `OPTIONAL MATCH (d:MeetingDebrief)
       RETURN count(d) AS total,
              sum(CASE WHEN coalesce(d.delivered, false) = false THEN 1 ELSE 0 END) AS undelivered`
    ),
    runQuery(
      `MATCH (u:User)
       WHERE u.createdAt >= $d30
       RETURN u.createdAt AS createdAt`,
      { d30 }
    ),
    runQuery(
      `MATCH (m:Meeting)
       WHERE m.createdAt >= $d30
       RETURN m.createdAt AS createdAt`,
      { d30 }
    ),
  ]);

  const u = userStats[0];
  const m = meetingStats[0];
  const p = partStats[0];
  const inv = inviteStats[0];
  const join = aiJoinStats[0];
  const reps = aiRepStats[0];
  const deb = debriefStats[0];

  const byStatus: Record<string, number> = {};
  let aiMeetingsTotal = 0;
  for (const rec of aiMeetingStats) {
    const status = (rec.get("status") as string | null) || "unknown";
    const cnt = Number(rec.get("cnt") || 0);
    if (status === "unknown" && cnt === 0) continue;
    byStatus[status] = (byStatus[status] || 0) + cnt;
    aiMeetingsTotal += cnt;
  }

  const inviteTotal = Number(inv?.get("total") || 0);
  const inviteConverted = Number(inv?.get("converted") || 0);
  const slots = Number(join?.get("slots") || 0);
  const joined = Number(join?.get("joined") || 0);

  const signupMap = new Map<string, number>();
  for (const rec of signupTs) {
    const ts = Number(rec.get("createdAt") || 0);
    if (!ts) continue;
    const k = dayKey(ts);
    signupMap.set(k, (signupMap.get(k) || 0) + 1);
  }
  const meetingMap = new Map<string, number>();
  for (const rec of meetingTs) {
    const ts = Number(rec.get("createdAt") || 0);
    if (!ts) continue;
    const k = dayKey(ts);
    meetingMap.set(k, (meetingMap.get(k) || 0) + 1);
  }

  return {
    users: {
      total: Number(u?.get("total") || 0),
      verified: Number(u?.get("verified") || 0),
      unverified: Number(u?.get("unverified") || 0),
      last7d: Number(u?.get("last7d") || 0),
      last30d: Number(u?.get("last30d") || 0),
    },
    meetings: {
      total: Number(m?.get("total") || 0),
      active: Number(m?.get("active") || 0),
      ended: Number(m?.get("ended") || 0),
      public: Number(m?.get("publicCount") || 0),
      private: Number(m?.get("privateCount") || 0),
      last7d: Number(m?.get("last7d") || 0),
      last30d: Number(m?.get("last30d") || 0),
    },
    participation: {
      totalJoins: Number(p?.get("totalJoins") || 0),
      avgPerMeeting: Math.round((Number(p?.get("avgPerMeeting") || 0)) * 100) / 100,
    },
    invitations: {
      total: inviteTotal,
      converted: inviteConverted,
      conversionRate: inviteTotal === 0 ? 0 : Math.round((inviteConverted / inviteTotal) * 1000) / 10,
    },
    ai: {
      meetingsTotal: aiMeetingsTotal,
      byStatus,
      participantSlots: slots,
      joinedSlots: joined,
      joinRate: slots === 0 ? 0 : Math.round((joined / slots) * 1000) / 10,
      reps: Number(reps?.get("reps") || 0),
      debriefsTotal: Number(deb?.get("total") || 0),
      debriefsUndelivered: Number(deb?.get("undelivered") || 0),
    },
    live: livePresenceCount(),
    series: {
      signups: fillSeries(dayKeys, signupMap),
      meetings: fillSeries(dayKeys, meetingMap),
    },
  };
}

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  createdAt: number | null;
  ringingEnabled: boolean;
  meetingsCreated: number;
  meetingsJoined: number;
}

export async function listAdminUsers(opts: {
  q?: string;
  page?: number;
  limit?: number;
}): Promise<{ users: AdminUserRow[]; total: number; page: number; limit: number }> {
  const page = Math.max(1, opts.page || 1);
  const limit = Math.min(100, Math.max(1, opts.limit || 25));
  const skip = (page - 1) * limit;
  const q = (opts.q || "").trim().toLowerCase();

  const countRecs = await runQuery(
    q
      ? `MATCH (u:User)
         WHERE toLower(u.email) CONTAINS $q OR toLower(coalesce(u.name, '')) CONTAINS $q
         RETURN count(u) AS total`
      : `MATCH (u:User) RETURN count(u) AS total`,
    { q }
  );
  const total = Number(countRecs[0]?.get("total") || 0);

  const recs = await runQuery(
    q
      ? `MATCH (u:User)
         WHERE toLower(u.email) CONTAINS $q OR toLower(coalesce(u.name, '')) CONTAINS $q
         OPTIONAL MATCH (u)-[:CREATED]->(mc:Meeting)
         OPTIONAL MATCH (u)-[:PARTICIPATES_IN]->(mj:Meeting)
         WITH u, count(DISTINCT mc) AS meetingsCreated, count(DISTINCT mj) AS meetingsJoined
         RETURN u.id AS id, u.name AS name, u.email AS email,
                coalesce(u.emailVerified, false) AS emailVerified,
                u.createdAt AS createdAt,
                coalesce(u.ringingEnabled, true) AS ringingEnabled,
                meetingsCreated, meetingsJoined
         ORDER BY u.createdAt DESC
         SKIP ${skip} LIMIT ${limit}`
      : `MATCH (u:User)
         OPTIONAL MATCH (u)-[:CREATED]->(mc:Meeting)
         OPTIONAL MATCH (u)-[:PARTICIPATES_IN]->(mj:Meeting)
         WITH u, count(DISTINCT mc) AS meetingsCreated, count(DISTINCT mj) AS meetingsJoined
         RETURN u.id AS id, u.name AS name, u.email AS email,
                coalesce(u.emailVerified, false) AS emailVerified,
                u.createdAt AS createdAt,
                coalesce(u.ringingEnabled, true) AS ringingEnabled,
                meetingsCreated, meetingsJoined
         ORDER BY u.createdAt DESC
         SKIP ${skip} LIMIT ${limit}`,
    { q }
  );

  const users: AdminUserRow[] = recs.map(r => ({
    id: (r.get("id") as string) || "",
    name: (r.get("name") as string) || "",
    email: (r.get("email") as string) || "",
    emailVerified: Boolean(r.get("emailVerified")),
    createdAt: (r.get("createdAt") as number | null) ?? null,
    ringingEnabled: Boolean(r.get("ringingEnabled")),
    meetingsCreated: Number(r.get("meetingsCreated") || 0),
    meetingsJoined: Number(r.get("meetingsJoined") || 0),
  }));

  return { users, total, page, limit };
}

export interface AdminMeetingRow {
  id: string;
  label: string;
  privacy: string;
  status: string;
  creatorName: string | null;
  creatorEmail: string | null;
  createdAt: number | null;
  participantCount: number;
}

export async function listAdminMeetings(opts: {
  page?: number;
  limit?: number;
}): Promise<{ meetings: AdminMeetingRow[]; total: number; page: number; limit: number }> {
  const page = Math.max(1, opts.page || 1);
  const limit = Math.min(100, Math.max(1, opts.limit || 25));
  const skip = (page - 1) * limit;

  const countRecs = await runQuery(
    `MATCH (m:Meeting)
     WHERE NOT ()-[:HAS_CHILD]->(m)
     RETURN count(m) AS total`
  );
  const total = Number(countRecs[0]?.get("total") || 0);

  const recs = await runQuery(
    `MATCH (m:Meeting)
     WHERE NOT ()-[:HAS_CHILD]->(m)
     OPTIONAL MATCH (c:User)-[:CREATED]->(m)
     OPTIONAL MATCH (pu:User)-[:PARTICIPATES_IN]->(m)
     WITH m, c, count(DISTINCT pu) AS participantCount,
          coalesce(m.createdAt, 0) AS sortAt
     RETURN m.id AS id,
            coalesce(m.label, m.id) AS label,
            coalesce(m.privacy, 'public') AS privacy,
            coalesce(m.status, 'active') AS status,
            coalesce(c.name, m.adminName) AS creatorName,
            c.email AS creatorEmail,
            m.createdAt AS createdAt,
            participantCount
     ORDER BY sortAt DESC
     SKIP ${skip} LIMIT ${limit}`
  );

  const meetings: AdminMeetingRow[] = recs.map(r => ({
    id: (r.get("id") as string) || "",
    label: (r.get("label") as string) || "Untitled",
    privacy: (r.get("privacy") as string) || "public",
    status: (r.get("status") as string) || "active",
    creatorName: (r.get("creatorName") as string | null) ?? null,
    creatorEmail: (r.get("creatorEmail") as string | null) ?? null,
    createdAt: (r.get("createdAt") as number | null) ?? null,
    participantCount: Number(r.get("participantCount") || 0),
  }));

  return { meetings, total, page, limit };
}
