/** Platform AI Agent co-host constants and helpers. */

export const AGENT_SYSTEM_EMAIL = "agent@meetingforest.system";
export const AGENT_DISPLAY_NAME = "AI Agent";

export function agentHostIdentity(meetingId: string): string {
  return `ai-agent-${meetingId}`;
}

export function agentHostWorkflowId(meetingId: string): string {
  return `agent-host-${meetingId}`;
}

/** True when spoken/typed text is directed at the AI Agent co-host. */
export function isAddressedToAgent(text: string): boolean {
  const t = text.toLowerCase().trim();
  return (
    t.includes("@agent") ||
    t.includes("@ai agent") ||
    t.startsWith("agent ") ||
    t.includes("ai agent") ||
    t.startsWith("hey agent") ||
    t.startsWith("ok agent")
  );
}
