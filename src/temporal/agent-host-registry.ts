const agentHostWorkflowsByMeeting = new Map<string, string>();

export function registerAgentHostWorkflow(meetingId: string, workflowId: string) {
  agentHostWorkflowsByMeeting.set(meetingId, workflowId);
}

export function unregisterAgentHostWorkflow(meetingId: string) {
  agentHostWorkflowsByMeeting.delete(meetingId);
}

export function getAgentHostWorkflowId(meetingId: string): string | undefined {
  return agentHostWorkflowsByMeeting.get(meetingId);
}
