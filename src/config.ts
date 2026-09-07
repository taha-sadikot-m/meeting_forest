const PORT = parseInt(process.env.PORT || "3000", 10);

export const config = {
  port: PORT,
  appUrl: process.env.APP_URL || `http://localhost:${PORT}`,
  livekit: {
    url: process.env.LIVEKIT_URL || "wss://your-livekit-server.com",
    apiKey: process.env.LIVEKIT_API_KEY || "devkey",
    apiSecret: process.env.LIVEKIT_API_SECRET || "devsecret0000000000000000000000",
  },
  memgraph: {
    host: process.env.MEMGRAPH_HOST || "localhost",
    port: process.env.MEMGRAPH_PORT || "7687",
    user: process.env.MEMGRAPH_USER || "",
    pass: process.env.MEMGRAPH_PASS || "",
    get url() {
      return `bolt://${this.host}:${this.port}`;
    },
  },
  temporal: {
    address: process.env.TEMPORAL_ADDRESS || "localhost:7233",
    namespace: process.env.TEMPORAL_NAMESPACE || "default",
    apiKey: process.env.TEMPORAL_API_KEY || "",
    taskQueue: "meeting-forest",
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || "",
    model: "gemini-2.5-flash",
  },
  deepgram: {
    apiKey: process.env.DEEPGRAM_API_KEY || "",
    ttsModel: process.env.DEEPGRAM_TTS_MODEL || "aura-2-thalia-en",
    sttModel: process.env.DEEPGRAM_STT_MODEL || "nova-2",
  },
  workerInternalSecret: process.env.WORKER_INTERNAL_SECRET || "dev-worker-secret",
  mcpServerUrl: process.env.MCP_SERVER_URL || "http://localhost:8100",
  admin: {
    email: process.env.ADMIN_EMAIL || "",
    password: process.env.ADMIN_PASSWORD || "",
  },
  cognito: {
    region: process.env.AWS_REGION || "ap-south-1",
    userPoolId: process.env.COGNITO_USER_POOL_ID || "",
    clientId: process.env.COGNITO_CLIENT_ID || "",
    clientSecret: process.env.COGNITO_CLIENT_SECRET || "",
  },
  neko: {
    url: process.env.NEKO_URL || "",
    user: process.env.NEKO_USER || "",
    password: process.env.NEKO_PASSWORD || "",
  },
  events: {
    /** Empty = do not publish chat events to NATS (chat still works). */
    natsUrl: process.env.NATS_URL || "",
    stream: process.env.NATS_STREAM || process.env.SAFICHAT_STREAM || "SAFICHAT",
    tenantId: process.env.EVENTS_TENANT_ID || "meeting-forest",
    kafkaBrokers: process.env.REDPANDA_BROKERS || "localhost:19092",
  },
  openreplay: {
    /** Empty = tracker disabled. From OpenReplay project settings. */
    projectKey: process.env.OPENREPLAY_PROJECT_KEY || "",
    /**
     * Self-hosted ingest, e.g. https://openreplay.localhost/ingest
     * Leave empty for OpenReplay Cloud (api.openreplay.com).
     */
    ingestPoint: process.env.OPENREPLAY_INGEST_POINT || "",
    /** Use Assist build (live cobrowse). Default true. */
    assist: (process.env.OPENREPLAY_ASSIST || "true").toLowerCase() !== "false",
    /** Allow tracker on http://localhost (dev only). */
    disableSecureMode: (process.env.OPENREPLAY_DISABLE_SECURE_MODE || "true").toLowerCase() !== "false",
    scriptTracker: process.env.OPENREPLAY_SCRIPT_URL || "//static.openreplay.com/latest/openreplay.js",
    scriptAssist:
      process.env.OPENREPLAY_ASSIST_SCRIPT_URL ||
      "//static.openreplay.com/latest/openreplay-assist.js",
  },
};

/** Embed URL for room iframe, or null when NEKO_URL is unset. */
export function getNekoEmbedUrl(): string | null {
  const base = config.neko.url.trim().replace(/\/$/, "");
  if (!base) return null;
  const params = new URLSearchParams({ embed: "1" });
  if (config.neko.user.trim()) params.set("usr", config.neko.user.trim());
  if (config.neko.password) params.set("pwd", config.neko.password);
  return `${base}/?${params.toString()}`;
}
