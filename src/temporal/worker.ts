import { Worker, NativeConnection } from "@temporalio/worker";
import { dispose } from "@livekit/rtc-node";
import { join } from "path";
import { config } from "../config";
import { disconnectAllBots } from "./livekit-bridge";
import * as meetingActivities from "./activities/meeting";
import * as repActivities from "./activities/rep";

async function shutdown() {
  await disconnectAllBots();
  await dispose();
}

async function run() {
  const connection = await NativeConnection.connect({
    address: config.temporal.address,
    ...(config.temporal.apiKey ? { apiKey: config.temporal.apiKey } : {}),
  });

  const worker = await Worker.create({
    connection,
    namespace: config.temporal.namespace,
    taskQueue: config.temporal.taskQueue,
    workflowsPath: join(import.meta.dir, "workflows"),
    activities: {
      ...meetingActivities,
      ...repActivities,
    },
  });

  console.log(`[temporal-worker] Running on queue "${config.temporal.taskQueue}" → ${config.temporal.address}`);

  const onExit = () => {
    shutdown()
      .catch(err => console.error("[temporal-worker] Shutdown error:", err))
      .finally(() => process.exit(0));
  };
  process.on("SIGINT", onExit);
  process.on("SIGTERM", onExit);

  await worker.run();
}

run().catch(err => {
  console.error("[temporal-worker] Fatal error:", err);
  process.exit(1);
});
