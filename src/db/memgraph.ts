import neo4j from "neo4j-driver";
import { config } from "../config";

const driver = neo4j.driver(
  config.memgraph.url,
  neo4j.auth.basic(config.memgraph.user, config.memgraph.pass),
  { disableLosslessIntegers: true }
);

console.log(`[memgraph] Connecting to ${config.memgraph.url}`);

export async function runQuery(cypher: string, params: Record<string, unknown> = {}) {
  const session = driver.session();
  try {
    return (await session.run(cypher, params)).records;
  } finally {
    await session.close();
  }
}

export async function initSchema() {
  const indexes = [
    "CREATE INDEX ON :Meeting(id)",
    "CREATE INDEX ON :User(email)",
    "CREATE INDEX ON :User(name)",
    "CREATE INDEX ON :AiHostedMeeting(id)",
    "CREATE INDEX ON :AiRep(id)",
    "CREATE INDEX ON :AiRepContext(id)",
    "CREATE INDEX ON :MeetingDebrief(id)",
    "CREATE INDEX ON :Conversation(id)",
    "CREATE INDEX ON :Conversation(participantKey)",
    "CREATE INDEX ON :DirectMessage(id)",
    "CREATE INDEX ON :PlatformInvite(id)",
  ];
  for (const cypher of indexes) {
    try {
      await runQuery(cypher);
    } catch {
      /* exists */
    }
  }
  console.log("[memgraph] Schema ready");
}

initSchema().catch(e => console.warn("[memgraph] Schema init:", e.message));
