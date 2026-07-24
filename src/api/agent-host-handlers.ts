import { getTemporalClient, temporalConfig } from "../temporal/client";
import { agentHostWorkflow } from "../temporal/workflows/agent-host";
import { registerAgentHostWorkflow } from "../temporal/agent-host-registry";
import {
  AGENT_SYSTEM_EMAIL,
  AGENT_DISPLAY_NAME,
  agentHostWorkflowId,
} from "../agent-host";
import { runQuery } from "../db/memgraph";

export async function enableAgentHostOnMeeting(params: {
  meetingId: string;
  label: string;
  creatorEmail: string;
  creatorName: string;
}): Promise<string> {
  const { meetingId, label, creatorEmail, creatorName } = params;
  const now = Date.now();
  const workflowId = agentHostWorkflowId(meetingId);

  await runQuery(
    `MATCH (m:Meeting {id: $meetingId})
     SET m.agentHostEnabled = true, m.agentHostWorkflowId = $workflowId
     MERGE (a:User {email: $agentEmail})
     ON CREATE SET a.name = $agentName, a.createdAt = $now, a.isSystemAgent = true
     MERGE (a)-[r:PARTICIPATES_IN]->(m)
     ON CREATE SET r.role = 'admin', r.joinedAt = $now
     ON MATCH SET r.role = 'admin', r.leftAt = null`,
    {
      meetingId,
      workflowId,
      agentEmail: AGENT_SYSTEM_EMAIL,
      agentName: AGENT_DISPLAY_NAME,
      now,
    }
  );

  const client = await getTemporalClient();
  let startedNew = false;
  try {
    await client.workflow.start(agentHostWorkflow, {
      taskQueue: temporalConfig.temporal.taskQueue,
      workflowId,
      args: [{
        meetingId,
        label,
        creatorEmail,
        creatorName,
      }],
    });
    startedNew = true;
  } catch (e: unknown) {
    const msg = String(e);
    if (!msg.includes("AlreadyExists") && !msg.includes("Workflow execution already started")) {
      throw e;
    }
    console.log(`[agent-host] Workflow ${workflowId} already running`);
  }

  registerAgentHostWorkflow(meetingId, workflowId);
  if (startedNew) {
    console.log(
      `[agent-host] Workflow ${workflowId} started on queue "${temporalConfig.temporal.taskQueue}". ` +
      `Run \`bun run worker\` so the AI Agent can join LiveKit.`
    );
  }
  return workflowId;
}

function truthyFlag(value: unknown): boolean {
  if (value === true || value === 1 || value === "true" || value === "1") return true;
  if (value && typeof value === "object" && "toNumber" in value) {
    try {
      return (value as { toNumber: () => number }).toNumber() !== 0;
    } catch {
      return true;
    }
  }
  return false;
}

export async function isAgentHostEnabled(meetingId: string): Promise<boolean> {
  const recs = await runQuery(
    `MATCH (m:Meeting {id: $meetingId})
     OPTIONAL MATCH (a:User {email: $agentEmail})-[r:PARTICIPATES_IN]->(m)
     RETURN coalesce(m.agentHostEnabled, false) AS enabled,
            m.agentHostWorkflowId AS workflowId,
            r IS NOT NULL AS agentParticipates`,
    { meetingId, agentEmail: AGENT_SYSTEM_EMAIL }
  );
  if (!recs.length) return false;
  const row = recs[0];
  if (truthyFlag(row.get("enabled"))) return true;
  if (row.get("workflowId")) return true;
  return truthyFlag(row.get("agentParticipates"));
}
