/**
 * A1–A3: 10 contexts × 10 numbered user.message events → platform-events-v1.
 *
 *   docker compose -f docker-compose.events.yml up -d
 *   bun run events:proof
 *
 * Env: NATS_URL (default nats://127.0.0.1:4222), REDPANDA_BROKERS (default localhost:19092)
 */
import { connect, headers } from "nats";
import { CompressionCodecs, CompressionTypes, Kafka } from "kafkajs";
import SnappyCodec from "kafkajs-snappy";
import { config } from "../src/config";
import { USER_MESSAGE_SUBJECT, type SemanticEvent } from "../src/events/nats-publisher";

CompressionCodecs[CompressionTypes.Snappy] = SnappyCodec;

const CONTEXTS = 10;
const PER_CONTEXT = 10;
const TOTAL = CONTEXTS * PER_CONTEXT;
const TOPIC = "platform-events-v1";
const REQUIRED = ["event_id", "timestamp", "tenant_id", "context_id", "subject", "event_type", "payload"] as const;

function fail(id: string, msg: string): never {
  console.log(`FAIL ${id}: ${msg}`);
  process.exit(1);
}

function pass(id: string, msg: string) {
  console.log(`PASS ${id}: ${msg}`);
}

async function main() {
  const natsUrl = config.events.natsUrl.trim() || "nats://127.0.0.1:4222";
  const brokers = (process.env.REDPANDA_BROKERS || config.events.kafkaBrokers).split(",").map((s) => s.trim());
  const stream = config.events.stream;
  const runId = `proof-${Date.now().toString(36)}`;

  const nc = await connect({ servers: natsUrl });
  const jsm = await nc.jetstreamManager();
  try {
    await jsm.streams.info(stream);
  } catch {
    await jsm.streams.add({ name: stream, subjects: ["safichat.semantic.>"] });
  }
  const js = nc.jetstream();

  for (let c = 0; c < CONTEXTS; c++) {
    const contextId = `${runId}-ctx-${c}`;
    for (let n = 0; n < PER_CONTEXT; n++) {
      const event: SemanticEvent = {
        event_id: `${runId}-${c}-${n}`,
        timestamp: new Date().toISOString(),
        tenant_id: config.events.tenantId,
        context_id: contextId,
        subject: USER_MESSAGE_SUBJECT,
        event_type: "user.message",
        payload: { seq: n, body: `msg-${n}`, senderEmail: "proof@meeting-forest.test", sentAt: Date.now() },
      };
      const hdrs = headers();
      hdrs.set("Nats-Msg-Id", event.event_id);
      await js.publish(USER_MESSAGE_SUBJECT, JSON.stringify(event), { headers: hdrs });
    }
  }
  await nc.drain();
  console.log(`Published ${TOTAL} events to ${USER_MESSAGE_SUBJECT} (run ${runId})`);

  const kafka = new Kafka({ clientId: "events-proof", brokers });
  const admin = kafka.admin();
  await admin.connect();
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const topics = await admin.listTopics();
    if (topics.includes(TOPIC)) break;
    await Bun.sleep(1000);
  }
  await admin.disconnect();

  const consumer = kafka.consumer({ groupId: `events-proof-${runId}` });
  await consumer.connect();
  await consumer.subscribe({ topic: TOPIC, fromBeginning: true });

  const byContext = new Map<string, number[]>();
  const seenIds = new Set<string>();
  let matched = 0;

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout: got ${matched}/${TOTAL} matching events`)), 90_000);
    consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;
        let ev: SemanticEvent;
        try {
          ev = JSON.parse(message.value.toString()) as SemanticEvent;
        } catch {
          return;
        }
        if (!String(ev.event_id || "").startsWith(runId)) return;
        for (const field of REQUIRED) {
          if (ev[field] === undefined || ev[field] === null || ev[field] === "") {
            clearTimeout(timer);
            fail("A1", `missing field ${field} on ${ev.event_id}`);
          }
        }
        if (ev.subject !== USER_MESSAGE_SUBJECT) {
          clearTimeout(timer);
          fail("A3", `subject ${ev.subject} != ${USER_MESSAGE_SUBJECT}`);
        }
        const key = message.key?.toString() || "";
        if (key && key !== ev.context_id) {
          clearTimeout(timer);
          fail("A2", `record key ${key} != context_id ${ev.context_id}`);
        }
        if (seenIds.has(ev.event_id)) return;
        seenIds.add(ev.event_id);
        const seq = Number((ev.payload as { seq?: number }).seq);
        const list = byContext.get(ev.context_id) || [];
        list.push(seq);
        byContext.set(ev.context_id, list);
        matched += 1;
        if (matched >= TOTAL) {
          clearTimeout(timer);
          resolve();
        }
      },
    });
  });

  await consumer.disconnect();

  if (matched !== TOTAL) fail("A1", `${matched}/${TOTAL} received`);
  pass("A1", `${matched}/${TOTAL} semantic test events in ${TOPIC}`);

  for (const [ctx, seqs] of byContext) {
    const expected = Array.from({ length: PER_CONTEXT }, (_, i) => i);
    if (seqs.length !== PER_CONTEXT || seqs.some((n, i) => n !== expected[i])) {
      fail("A2", `ordering failed for ${ctx}: ${JSON.stringify(seqs)}`);
    }
  }
  if (byContext.size !== CONTEXTS) fail("A2", `expected ${CONTEXTS} contexts, got ${byContext.size}`);
  pass("A2", "numbered events per context_id arrived in order");
  pass("A3", `original NATS subject preserved (${USER_MESSAGE_SUBJECT})`);
  console.log("ALL PASS");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
