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
  workerInternalSecret: process.env.WORKER_INTERNAL_SECRET || "dev-worker-secret",
  admin: {
    email: process.env.ADMIN_EMAIL || "",
    password: process.env.ADMIN_PASSWORD || "",
  },
};
