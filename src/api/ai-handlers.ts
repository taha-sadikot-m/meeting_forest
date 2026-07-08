import { config } from "../config";
import { runQuery } from "../db/memgraph";
import {
  generateId,
  createAiHostedMeeting,
  listAiMeetingsForUser,
  getAiRepForUser,
  getAiRepContexts,
  upsertAiRep,
  deleteAiRep,
  addAiRepContext,
  deleteAiRepContext,
  listDebriefsForUser,
  getDebrief,
  isAiMeetingCreator,
  markParticipantJoined,
  isParticipantJoinedInDb,
  createDefaultAssistant,
  meetingOrchWorkflowId,
  aiRepWorkflowId,
} from "../db/ai-queries";
import { getTemporalClient, temporalConfig } from "../temporal/client";
import { registerRepWorkflow, getRepWorkflowIds } from "../temporal/rep-registry";
import { meetingOrchestrationWorkflow } from "../temporal/workflows/meeting-orchestration";
import { aiRepWorkflow } from "../temporal/workflows/ai-rep";
import { createRing, getRingById, normEmail, deleteRingByEmail } from "../rings";
import { isUserInMeeting } from "../sessions";

export async function startAssistantWorkflow(ownerEmail: string, meetingId: string): Promise<string> {
  let rep = await getAiRepForUser(ownerEmail);
  if (!rep) {
    const recs = await runQuery(
      "MATCH (u:User {email: $email}) RETURN u.name AS name",
      { email: normEmail(ownerEmail) }
    );
    const userName = recs.length ? (recs[0].get("name") as string) : ownerEmail;
    await createDefaultAssistant(ownerEmail, userName);
    rep = await getAiRepForUser(ownerEmail);
  }
  if (!rep) throw new Error("No assistant found for user");

  const workflowId = aiRepWorkflowId(ownerEmail, meetingId);
  const client = await getTemporalClient();

  try {
    await client.workflow.start(aiRepWorkflow, {
      taskQueue: temporalConfig.temporal.taskQueue,
      workflowId,
      args: [{
        meetingId,
        ownerEmail,
        repId: rep.id as string,
        repName: rep.name as string,
      }],
    });
  } catch (e: unknown) {
    const msg = String(e);
    if (!msg.includes("AlreadyExists") && !msg.includes("Workflow execution already started")) {
      throw e;
    }
  }

  registerRepWorkflow(meetingId, workflowId);
  return workflowId;
}

export async function handlePostAiMeetings(
  session: { name: string; email: string },
  body: { label?: string; agenda?: string; scheduledAt?: number; participants?: Array<{ email: string; ringAt: number }> }
) {
  const label = (body.label || "").trim();
  const agenda = (body.agenda || "").trim();
  const scheduledAt = body.scheduledAt || Date.now();
  const participants = body.participants || [];

  if (!label) return { error: "label required", status: 400 };
  if (!agenda) return { error: "agenda required", status: 400 };

  const meetingId = generateId(label);
  const workflowId = meetingOrchWorkflowId(meetingId);

  const enriched: Array<{ email: string; name: string; ringAt: number; role: string }> = [];
  const creatorNorm = normEmail(session.email);
  enriched.push({
    email: creatorNorm,
    name: session.name,
    ringAt: scheduledAt,
    role: "host",
  });

  for (const p of participants) {
    const email = normEmail(p.email || "");
    if (!email.includes("@")) continue;
    if (email === creatorNorm) continue;
    const recs = await runQuery(
      "MATCH (u:User {email: $email}) RETURN u.name AS name",
      { email }
    );
    if (recs.length === 0) continue;
    enriched.push({
      email,
      name: recs[0].get("name") as string,
      ringAt: p.ringAt || scheduledAt,
      role: "participant",
    });
  }

  await createAiHostedMeeting({
    meetingId,
    workflowId,
    label,
    agenda,
    scheduledAt,
    creatorEmail: session.email,
    creatorName: session.name,
    participants: enriched,
  });

  const client = await getTemporalClient();
  await client.workflow.start(meetingOrchestrationWorkflow, {
    taskQueue: temporalConfig.temporal.taskQueue,
    workflowId,
    args: [{
      meetingId,
      label,
      agenda,
      scheduledAt,
      participants: enriched.map(p => ({
        email: p.email,
        name: p.name,
        ringAt: p.ringAt,
        role: p.role,
      })),
      creatorEmail: session.email,
      creatorName: session.name,
    }],
  });

  return { meetingId, workflowId, status: 200 };
}

export async function handleGetAiMeetings(session: { email: string }) {
  const meetings = await listAiMeetingsForUser(session.email);
  return { meetings, status: 200 };
}

export async function handleEndAiMeeting(session: { email: string }, meetingId: string) {
  const creator = await isAiMeetingCreator(meetingId, session.email);
  if (!creator) return { error: "Forbidden", status: 403 };

  const client = await getTemporalClient();
  const orchId = meetingOrchWorkflowId(meetingId);
  try {
    const handle = client.workflow.getHandle(orchId);
    await handle.signal("meetingEnded");
  } catch (e) {
    console.warn("[ai-meetings] end signal failed", e);
  }

  for (const wfId of getRepWorkflowIds(meetingId)) {
    try {
      await client.workflow.getHandle(wfId).signal("meetingEnded");
    } catch { /* ignore */ }
  }

  return { ok: true, status: 200 };
}

export async function handleGetAiRep(session: { email: string }) {
  const rep = await getAiRepForUser(session.email);
  const contexts = rep ? await getAiRepContexts(rep.id as string) : [];
  return { rep, contexts, status: 200 };
}

export async function handlePostAiRep(
  session: { email: string },
  body: { name?: string; systemPrompt?: string; introMessage?: string }
) {
  const name = (body.name || "").trim();
  const systemPrompt = (body.systemPrompt || "").trim();
  const introMessage = (body.introMessage || "").trim();
  if (!name) return { error: "name required", status: 400 };
  const repId = await upsertAiRep(session.email, name, systemPrompt, introMessage);
  return { repId, status: 200 };
}

export async function handleDeleteAiRep(session: { email: string }) {
  await deleteAiRep(session.email);
  return { ok: true, status: 200 };
}

export async function handlePostAiRepContext(
  session: { email: string },
  body: { title?: string; content?: string }
) {
  const rep = await getAiRepForUser(session.email);
  if (!rep) return { error: "No assistant configured", status: 400 };
  const title = (body.title || "").trim();
  const content = (body.content || "").trim();
  if (!title || !content) return { error: "title and content required", status: 400 };
  const contextId = await addAiRepContext(rep.id as string, title, content);
  return { contextId, status: 200 };
}

export async function handleDeleteAiRepContext(session: { email: string }, contextId: string) {
  await deleteAiRepContext(session.email, contextId);
  return { ok: true, status: 200 };
}

export async function handleDeployAiRep(session: { email: string }, meetingId: string) {
  const rep = await getAiRepForUser(session.email);
  if (!rep) return { error: "No assistant configured", status: 400 };

  const workflowId = await startAssistantWorkflow(session.email, meetingId);
  return { workflowId, status: 200 };
}

export async function handleGetDebriefs(session: { email: string }) {
  const debriefs = await listDebriefsForUser(session.email);
  return { debriefs, status: 200 };
}

export async function handleGetDebrief(session: { email: string }, debriefId: string) {
  const debrief = await getDebrief(debriefId, session.email);
  if (!debrief) return { error: "Not found", status: 404 };
  return { debrief, status: 200 };
}

export async function handleInternalRing(
  secret: string | null,
  body: { fromEmail?: string; fromName?: string; toEmail?: string; meetingId?: string; meetingLabel?: string }
) {
  if (secret !== config.workerInternalSecret) {
    return { error: "Unauthorized", status: 401 };
  }

  const result = await createRing(
    body.fromEmail || "",
    body.fromName || "Meeting Host",
    body.toEmail || "",
    (body.meetingId || "").trim(),
    (body.meetingLabel || body.meetingId || "").trim(),
    async (email) => {
      const recs = await runQuery(
        "MATCH (u:User {email: $email}) RETURN u.name AS name",
        { email }
      );
      return recs.length ? (recs[0].get("name") as string) : null;
    },
    (email) => isUserInMeeting((body.meetingId || "").trim(), email)
  );

  if ("error" in result) {
    return { error: result.error, status: result.status };
  }
  return { ...result, status: 200 };
}

export async function handleInternalParticipantStatus(
  secret: string | null,
  meetingId: string,
  email: string
) {
  if (secret !== config.workerInternalSecret) {
    return { error: "Unauthorized", status: 401 };
  }

  const norm = normEmail(email);
  const inRoom = isUserInMeeting(meetingId, norm);
  const joined = await isParticipantJoinedInDb(meetingId, norm);
  return { inRoom, joined, status: 200 };
}

export async function handleInternalRingStatus(secret: string | null, ringId: string) {
  if (secret !== config.workerInternalSecret) {
    return { error: "Unauthorized", status: 401 };
  }

  const ring = getRingById(ringId);
  if (!ring) return { ringStatus: "expired", status: 200 };

  if (ring.status === "ringing" && Date.now() - ring.startedAt > 2 * 60 * 1000) {
    ring.status = "expired";
    deleteRingByEmail(ring.toEmail);
  }

  return { ringStatus: ring.status, status: 200 };
}

export async function signalParticipantJoined(meetingId: string, email: string) {
  await markParticipantJoined(meetingId, email);
  try {
    const client = await getTemporalClient();
    const handle = client.workflow.getHandle(meetingOrchWorkflowId(meetingId));
    await handle.signal("participantJoined", { email });
  } catch {
    /* non-AI meeting or workflow not running */
  }
}
