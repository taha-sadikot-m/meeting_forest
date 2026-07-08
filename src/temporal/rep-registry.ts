const repWorkflowsByMeeting = new Map<string, Set<string>>();

export function registerRepWorkflow(meetingId: string, workflowId: string) {
  if (!repWorkflowsByMeeting.has(meetingId)) {
    repWorkflowsByMeeting.set(meetingId, new Set());
  }
  repWorkflowsByMeeting.get(meetingId)!.add(workflowId);
}

export function unregisterRepWorkflow(meetingId: string, workflowId: string) {
  repWorkflowsByMeeting.get(meetingId)?.delete(workflowId);
}

export function getRepWorkflowIds(meetingId: string): string[] {
  return Array.from(repWorkflowsByMeeting.get(meetingId) || []);
}

export function clearRepWorkflows(meetingId: string) {
  repWorkflowsByMeeting.delete(meetingId);
}
