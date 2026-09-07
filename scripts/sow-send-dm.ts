import { runQuery } from "../src/db/memgraph";
import { findOrCreateConversation, sendMessage } from "../src/db/message-queries";

const body = process.argv[2] || `sow-verify-${Date.now()}`;
const a = "sow-a@meeting-forest.test";
const b = "sow-b@meeting-forest.test";
const sender = (process.argv[3] || "a").toLowerCase() === "b" ? b : a;

await runQuery(
  `MERGE (u1:User {email: $a})
   ON CREATE SET u1.name = $a
   SET u1.emailVerified = true
   MERGE (u2:User {email: $b})
   ON CREATE SET u2.name = $b
   SET u2.emailVerified = true`,
  { a, b }
);

const created = await findOrCreateConversation(a, b);
if ("error" in created) {
  console.log(JSON.stringify({ ok: false, error: created.error }));
  process.exit(1);
}

const result = await sendMessage(sender, created.conversationId, body);
await Bun.sleep(4000);
console.log(JSON.stringify({ ok: !("error" in result), conversationId: created.conversationId, result }));
process.exit("error" in result ? 1 : 0);
