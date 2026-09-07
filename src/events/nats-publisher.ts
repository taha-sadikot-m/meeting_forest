import { connect, headers, type JetStreamClient, type NatsConnection } from "nats";
import { config } from "../config";

/** Durable semantic subject only. Do not publish typing/presence/token.delta here. */
export const USER_MESSAGE_SUBJECT = "safichat.semantic.user.message";

export type SemanticEvent = {
  event_id: string;
  timestamp: string;
  tenant_id: string;
  context_id: string;
  subject: string;
  event_type: string;
  payload: Record<string, unknown>;
};

let nc: NatsConnection | null = null;
let js: JetStreamClient | null = null;
let connectAttempt: Promise<JetStreamClient | null> | null = null;

async function jetstream(): Promise<JetStreamClient | null> {
  const url = config.events.natsUrl.trim();
  if (!url) return null;
  if (js) return js;
  if (connectAttempt) return connectAttempt;

  connectAttempt = (async () => {
    try {
      nc = await connect({ servers: url, reconnect: true, maxReconnectAttempts: -1 });
      const jsm = await nc.jetstreamManager();
      const stream = config.events.stream;
      try {
        await jsm.streams.info(stream);
      } catch {
        await jsm.streams.add({
          name: stream,
          subjects: ["safichat.semantic.>"],
        });
      }
      js = nc.jetstream();
      console.log(`[events] JetStream ready stream=${stream} nats=${url}`);
      return js;
    } catch (err) {
      connectAttempt = null;
      js = null;
      nc = null;
      console.warn("[events] NATS unavailable (chat continues):", (err as Error).message);
      return null;
    }
  })();

  return connectAttempt;
}

export async function publishSemanticEvent(event: SemanticEvent): Promise<void> {
  try {
    const client = await jetstream();
    if (!client) return;
    const hdrs = headers();
    hdrs.set("Nats-Msg-Id", event.event_id);
    await client.publish(event.subject, JSON.stringify(event), { headers: hdrs });
  } catch (err) {
    console.warn("[events] publish failed (chat continues):", (err as Error).message);
  }
}

/** Fire-and-forget durable user.message after Memgraph persist. Never throws. */
export function publishUserMessage(args: {
  eventId: string;
  conversationId: string;
  body: string;
  senderEmail: string;
  sentAt: number;
}): void {
  const event: SemanticEvent = {
    event_id: args.eventId,
    timestamp: new Date(args.sentAt).toISOString(),
    tenant_id: config.events.tenantId,
    context_id: args.conversationId,
    subject: USER_MESSAGE_SUBJECT,
    event_type: "user.message",
    payload: {
      body: args.body,
      senderEmail: args.senderEmail,
      sentAt: args.sentAt,
    },
  };
  void publishSemanticEvent(event);
}
