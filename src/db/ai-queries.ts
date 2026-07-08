import { runQuery } from "./memgraph";

export function generateId(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40)
    + "-" + Date.now().toString(36);
}

export function meetingOrchWorkflowId(meetingId: string): string {
  return `meeting-orch-${meetingId}`;
}

export function aiRepWorkflowId(ownerEmail: string, meetingId: string): string {
  return `ai-rep-${ownerEmail}-${meetingId}`;
}

export async function createAiHostedMeeting(params: {
  meetingId: string;
  workflowId: string;
  label: string;
  agenda: string;
  scheduledAt: number;
  creatorEmail: string;
  creatorName: string;
  participants: Array<{ email: string; name: string; ringAt: number; role: string }>;
}) {
  const now = Date.now();
  const { meetingId, workflowId, label, agenda, scheduledAt, creatorEmail, creatorName, participants } = params;

  await runQuery(
    `MATCH (u:User {email: $creatorEmail})
     CREATE (m:Meeting { id: $meetingId, label: $label, adminName: $creatorName, status: 'active',
       privacy: 'public', micDefault: 'allow', camDefault: 'allow', createdAt: $now })
     CREATE (a:AiHostedMeeting { id: $meetingId, workflowId: $workflowId, agenda: $agenda,
       label: $label, scheduledAt: $scheduledAt, status: 'scheduled', createdAt: $now })
     CREATE (u)-[:CREATED {at: $now}]->(m)
     CREATE (u)-[:AI_MEETING_PARTICIPANT { ringAt: $scheduledAt, role: 'host', joined: false }]->(a)`,
    { meetingId, workflowId, label, agenda, scheduledAt, creatorEmail, creatorName, now }
  );

  for (const p of participants) {
    if (p.email === creatorEmail) continue;
    await runQuery(
      `MATCH (a:AiHostedMeeting {id: $meetingId})
       MATCH (u:User {email: $email})
       MERGE (u)-[r:AI_MEETING_PARTICIPANT]->(a)
       ON CREATE SET r.ringAt = $ringAt, r.role = $role, r.joined = false
       ON MATCH  SET r.ringAt = $ringAt, r.role = $role
       MERGE (u)-[:INVITED_TO { by: $creatorName, at: $now }]->(m:Meeting {id: $meetingId})`,
      { meetingId, email: p.email, ringAt: p.ringAt, role: p.role, creatorName, now }
    );
  }
}

export async function listAiMeetingsForUser(email: string) {
  const recs = await runQuery(
    `MATCH (u:User {email: $email})-[:CREATED|AI_MEETING_PARTICIPANT]->(a:AiHostedMeeting)
     RETURN a.id AS id, a.label AS label, a.agenda AS agenda, a.scheduledAt AS scheduledAt,
            a.status AS status, a.workflowId AS workflowId, a.createdAt AS createdAt
     ORDER BY a.scheduledAt DESC`,
    { email }
  );
  return recs.map(r => ({
    id: r.get("id"),
    label: r.get("label"),
    agenda: r.get("agenda"),
    scheduledAt: r.get("scheduledAt"),
    status: r.get("status"),
    workflowId: r.get("workflowId"),
    createdAt: r.get("createdAt"),
  }));
}

export async function getAiMeeting(meetingId: string) {
  const recs = await runQuery(
    `MATCH (a:AiHostedMeeting {id: $meetingId})
     OPTIONAL MATCH (u:User)-[r:AI_MEETING_PARTICIPANT]->(a)
     RETURN a, collect({email: u.email, name: u.name, ringAt: r.ringAt, role: r.role, joined: r.joined}) AS participants`,
    { meetingId }
  );
  if (!recs.length) return null;
  const a = recs[0].get("a").properties;
  return { ...a, participants: recs[0].get("participants") };
}

export async function updateAiMeetingStatus(meetingId: string, status: string) {
  await runQuery(
    "MATCH (a:AiHostedMeeting {id: $meetingId}) SET a.status = $status",
    { meetingId, status }
  );
  if (status === "ended") {
    await runQuery(
      "MATCH (m:Meeting {id: $meetingId}) SET m.status = 'ended'",
      { meetingId }
    );
  }
}

export async function markParticipantJoined(meetingId: string, email: string) {
  await runQuery(
    `MATCH (u:User {email: $email})-[r:AI_MEETING_PARTICIPANT]->(a:AiHostedMeeting {id: $meetingId})
     SET r.joined = true, r.joinedAt = $now`,
    { meetingId, email, now: Date.now() }
  );
}

export async function isParticipantJoinedInDb(meetingId: string, email: string): Promise<boolean> {
  const recs = await runQuery(
    `MATCH (u:User {email: $email})-[r:AI_MEETING_PARTICIPANT]->(a:AiHostedMeeting {id: $meetingId})
     RETURN r.joined AS joined`,
    { meetingId, email }
  );
  return recs.length > 0 && recs[0].get("joined") === true;
}

export function defaultAssistantName(userName: string): string {
  const first = userName.trim().split(/\s+/)[0] || "Your";
  return `${first}'s Assistant`;
}

export function defaultAssistantIntro(userName: string, assistantName: string): string {
  return `Hi, I'm ${assistantName}, attending this meeting on behalf of ${userName}. I'll listen in, take notes, and follow up on anything that needs their attention.`;
}

export function defaultAssistantPrompt(userName: string): string {
  return `You are ${userName}'s personal assistant in meetings. Be professional, concise, and helpful. Answer questions on their behalf when appropriate. Capture key decisions and action items.`;
}

export async function createDefaultAssistant(email: string, userName: string): Promise<string> {
  const existing = await getAiRepForUser(email);
  if (existing) return existing.id as string;

  const name = defaultAssistantName(userName);
  const systemPrompt = defaultAssistantPrompt(userName);
  const introMessage = defaultAssistantIntro(userName, name);
  const now = Date.now();
  const repId = "rep-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);

  await runQuery(
    `MATCH (u:User {email: $email})
     CREATE (r:AiRep { id: $repId, ownerEmail: $email, name: $name, systemPrompt: $systemPrompt,
       introMessage: $introMessage, createdAt: $now, updatedAt: $now })
     CREATE (u)-[:HAS_REP]->(r)`,
    { email, repId, name, systemPrompt, introMessage, now }
  );
  return repId;
}

export async function getAiRepForUser(email: string) {
  const recs = await runQuery(
    `MATCH (u:User {email: $email})-[:HAS_REP]->(r:AiRep)
     RETURN r`,
    { email }
  );
  if (!recs.length) return null;
  return recs[0].get("r").properties;
}

export async function getAiRepContexts(repId: string) {
  const recs = await runQuery(
    `MATCH (r:AiRep {id: $repId})-[:HAS_CONTEXT]->(c:AiRepContext)
     RETURN c ORDER BY c.createdAt DESC`,
    { repId }
  );
  return recs.map(r => r.get("c").properties);
}

export async function upsertAiRep(
  email: string,
  name: string,
  systemPrompt: string,
  introMessage?: string
) {
  const now = Date.now();
  const existing = await getAiRepForUser(email);
  if (existing) {
    const intro = introMessage ?? (existing.introMessage as string) ?? "";
    await runQuery(
      `MATCH (r:AiRep {id: $repId})
       SET r.name = $name, r.systemPrompt = $systemPrompt, r.introMessage = $introMessage, r.updatedAt = $now`,
      { repId: existing.id, name, systemPrompt, introMessage: intro, now }
    );
    return existing.id as string;
  }
  const repId = "rep-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  const intro = introMessage ?? defaultAssistantIntro(name, name);
  await runQuery(
    `MATCH (u:User {email: $email})
     CREATE (r:AiRep { id: $repId, ownerEmail: $email, name: $name, systemPrompt: $systemPrompt,
       introMessage: $introMessage, createdAt: $now, updatedAt: $now })
     CREATE (u)-[:HAS_REP]->(r)`,
    { email, repId, name, systemPrompt, introMessage: intro, now }
  );
  return repId;
}

export async function deleteAiRep(email: string) {
  await runQuery(
    `MATCH (u:User {email: $email})-[:HAS_REP]->(r:AiRep)
     OPTIONAL MATCH (r)-[:HAS_CONTEXT]->(c:AiRepContext)
     DETACH DELETE c, r`,
    { email }
  );
}

export async function addAiRepContext(repId: string, title: string, content: string) {
  const contextId = "ctx-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  const now = Date.now();
  await runQuery(
    `MATCH (r:AiRep {id: $repId})
     CREATE (c:AiRepContext { id: $contextId, repId: $repId, title: $title, content: $content, createdAt: $now })
     CREATE (r)-[:HAS_CONTEXT]->(c)`,
    { repId, contextId, title, content, now }
  );
  return contextId;
}

export async function deleteAiRepContext(email: string, contextId: string) {
  await runQuery(
    `MATCH (u:User {email: $email})-[:HAS_REP]->(r:AiRep)-[:HAS_CONTEXT]->(c:AiRepContext {id: $contextId})
     DETACH DELETE c`,
    { email, contextId }
  );
}

export async function loadRepContext(repId: string) {
  const recs = await runQuery(
    `MATCH (r:AiRep {id: $repId})
     OPTIONAL MATCH (r)-[:HAS_CONTEXT]->(c:AiRepContext)
     RETURN r.systemPrompt AS systemPrompt, r.name AS repName, r.ownerEmail AS ownerEmail,
            r.introMessage AS introMessage,
            collect({title: c.title, content: c.content}) AS contextChunks`,
    { repId }
  );
  if (!recs.length) throw new Error("Rep not found");
  const row = recs[0];
  return {
    systemPrompt: row.get("systemPrompt") as string,
    repName: row.get("repName") as string,
    ownerEmail: row.get("ownerEmail") as string,
    introMessage: (row.get("introMessage") as string) || "",
    contextChunks: (row.get("contextChunks") as Array<{ title: string; content: string }>)
      .filter(c => c.title != null),
  };
}

export async function saveMeetingDebrief(params: {
  meetingId: string;
  ownerEmail: string;
  repId: string;
  summary: string;
  tasks: unknown[];
  decisions: string[];
  escalations: string[];
  rawLog: string;
}) {
  const debriefId = "debrief-" + Date.now().toString(36);
  const now = Date.now();
  await runQuery(
    `MATCH (r:AiRep {id: $repId}), (a:AiHostedMeeting {id: $meetingId})
     CREATE (d:MeetingDebrief { id: $debriefId, meetingId: $meetingId, ownerEmail: $ownerEmail,
       summary: $summary, tasks: $tasks, decisions: $decisions, escalations: $escalations,
       rawLog: $rawLog, createdAt: $now, delivered: false })
     CREATE (r)-[:PRODUCED_DEBRIEF]->(d)
     CREATE (d)-[:FOR_MEETING]->(a)`,
    {
      ...params,
      debriefId,
      tasks: JSON.stringify(params.tasks),
      decisions: JSON.stringify(params.decisions),
      escalations: JSON.stringify(params.escalations),
      now,
    }
  );
  return debriefId;
}

export async function markDebriefDelivered(debriefId: string) {
  await runQuery(
    "MATCH (d:MeetingDebrief {id: $debriefId}) SET d.delivered = true",
    { debriefId }
  );
}

export async function getDebrief(debriefId: string, ownerEmail: string) {
  const recs = await runQuery(
    `MATCH (d:MeetingDebrief {id: $debriefId, ownerEmail: $ownerEmail})
     OPTIONAL MATCH (a:AiHostedMeeting {id: d.meetingId})
     RETURN d, a.label AS meetingLabel`,
    { debriefId, ownerEmail }
  );
  if (!recs.length) return null;
  const d = recs[0].get("d").properties;
  return {
    ...d,
    meetingLabel: recs[0].get("meetingLabel"),
    tasks: JSON.parse(d.tasks || "[]"),
    decisions: JSON.parse(d.decisions || "[]"),
    escalations: JSON.parse(d.escalations || "[]"),
  };
}

export async function listDebriefsForUser(email: string) {
  const recs = await runQuery(
    `MATCH (d:MeetingDebrief {ownerEmail: $email})
     OPTIONAL MATCH (a:AiHostedMeeting {id: d.meetingId})
     OPTIONAL MATCH (r:AiRep)-[:PRODUCED_DEBRIEF]->(d)
     RETURN d, a.label AS meetingLabel, r.name AS repName
     ORDER BY d.createdAt DESC`,
    { email }
  );
  return recs.map(r => {
    const d = r.get("d").properties;
    return {
      ...d,
      meetingLabel: r.get("meetingLabel"),
      repName: r.get("repName"),
      tasks: JSON.parse(d.tasks || "[]"),
      decisions: JSON.parse(d.decisions || "[]"),
      escalations: JSON.parse(d.escalations || "[]"),
    };
  });
}

export async function getAiMeetingCreatorEmail(meetingId: string): Promise<string | null> {
  const recs = await runQuery(
    `MATCH (u:User)-[:CREATED]->(:Meeting {id: $meetingId})
     RETURN u.email AS email LIMIT 1`,
    { meetingId }
  );
  return recs.length ? (recs[0].get("email") as string) : null;
}

export async function getAiMeetingParticipants(meetingId: string) {
  const recs = await runQuery(
    `MATCH (u:User)-[r:AI_MEETING_PARTICIPANT]->(a:AiHostedMeeting {id: $meetingId})
     RETURN u.email AS email, u.name AS name, r.ringAt AS ringAt, r.role AS role
     ORDER BY r.ringAt ASC`,
    { meetingId }
  );
  return recs.map(r => ({
    email: r.get("email") as string,
    name: (r.get("name") as string) || (r.get("email") as string),
    ringAt: r.get("ringAt") as number,
    role: r.get("role") as string,
  }));
}

export async function isAiMeetingCreator(meetingId: string, email: string): Promise<boolean> {
  const recs = await runQuery(
    `MATCH (u:User {email: $email})-[:CREATED]->(:Meeting {id: $meetingId})
     MATCH (:AiHostedMeeting {id: $meetingId})
     RETURN u.email AS email LIMIT 1`,
    { meetingId, email }
  );
  return recs.length > 0;
}
