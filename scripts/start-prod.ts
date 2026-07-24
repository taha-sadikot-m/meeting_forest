/**
 * Production entry: HTTP app + Temporal worker in one process tree.
 * Used on Render free tier so a single web service runs both.
 */
import { spawn, type Subprocess } from "bun";

const children: Subprocess[] = [];
let shuttingDown = false;

function start(label: string, args: string[]): Subprocess {
  console.log(`[start-prod] starting ${label}: bun ${args.join(" ")}`);
  const child = spawn({
    cmd: ["bun", ...args],
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
    env: process.env,
  });
  children.push(child);

  void child.exited.then((code) => {
    if (shuttingDown) return;
    console.error(`[start-prod] ${label} exited with code ${code ?? "null"} — shutting down`);
    shutdown(typeof code === "number" ? code : 1);
  });

  return child;
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log("[start-prod] shutting down children…");
  for (const child of children) {
    try {
      child.kill();
    } catch {
      /* ignore */
    }
  }
  // Give children a moment, then force exit
  setTimeout(() => process.exit(exitCode), 1500).unref();
}

process.on("SIGTERM", () => shutdown(0));
process.on("SIGINT", () => shutdown(0));

start("worker", ["run", "src/temporal/worker.ts"]);
start("app", ["run", "index.ts"]);

console.log("[start-prod] app + Temporal worker launched");
