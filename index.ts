import { serve } from "bun";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { AccessToken } from "livekit-server-sdk";
import neo4j from "neo4j-driver";
import { homePage } from "./src/pages/home";
import { roomPage } from "./src/pages/room";
import { loginPage } from "./src/pages/login";
import { registerPage } from "./src/pages/register";
import { forgotPasswordPage } from "./src/pages/forgot-password";
import { resetPasswordPage } from "./src/pages/reset-password";
import {
  createSession, getSession, destroySession,
  getSessionCookie, setSessionCookie, clearSessionCookie,
  generateSecureToken, hashPassword, verifyPassword,
  sendVerificationEmail, sendResetEmail, sendMeetingInviteEmail,
} from "./src/auth";

const PORT             = parseInt(process.env.PORT || "3000");
const LIVEKIT_URL      = process.env.LIVEKIT_URL      || "wss://your-livekit-server.com";
const LIVEKIT_API_KEY  = process.env.LIVEKIT_API_KEY  || "devkey";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "devsecret0000000000000000000000";

// ── Memgraph ──────────────────────────────────────────────────────────────────
const MEMGRAPH_HOST = process.env.MEMGRAPH_HOST || "localhost";
const MEMGRAPH_PORT = process.env.MEMGRAPH_PORT || "7687";
const MEMGRAPH_USER = process.env.MEMGRAPH_USER || "";
const MEMGRAPH_PASS = process.env.MEMGRAPH_PASS || "";
const MEMGRAPH_URL  = `bolt://${MEMGRAPH_HOST}:${MEMGRAPH_PORT}`;

const driver = neo4j.driver(
  MEMGRAPH_URL,
  neo4j.auth.basic(MEMGRAPH_USER, MEMGRAPH_PASS),
  { disableLosslessIntegers: true }
);
console.log(`[memgraph] Connecting to ${MEMGRAPH_URL}`);

async function runQuery(cypher: string, params: Record<string, unknown> = {}) {
  const session = driver.session();
  try { return (await session.run(cypher, params)).records; }
  finally { await session.close(); }
}

async function initSchema() {
  try { await runQuery("CREATE INDEX ON :Meeting(id)");   } catch { /* exists */ }
  try { await runQuery("CREATE INDEX ON :User(email)");   } catch { /* exists */ }
  try { await runQuery("CREATE INDEX ON :User(name)");    } catch { /* exists */ }
  console.log("[memgraph] Schema ready");
}
initSchema().catch(e => console.warn("[memgraph] Schema init:", e.message));

function generateId(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40)
    + "-" + Date.now().toString(36);
}

// ── Static / helpers ──────────────────────────────────────────────────────────
const MIME: Record<string, string> = {
  ".css": "text/css", ".js": "text/javascript",
  ".png": "image/png", ".jpg": "image/jpeg",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2",
};

function serveStatic(p: string): Response | null {
  const fp = join(import.meta.dir, "public", p);
  if (!existsSync(fp)) return null;
  const ext = p.slice(p.lastIndexOf("."));
  return new Response(readFileSync(fp), {
    headers: { "Content-Type": MIME[ext] || "application/octet-stream", "Cache-Control": "public,max-age=3600" },
  });
}

function json(data: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status, headers: { "Content-Type": "application/json", ...extra },
  });
}

function html(body: string, extra?: Record<string, string>): Response {
  return new Response(body, { headers: { "Content-Type": "text/html", ...extra } });
}

function redirect(location: string, headers?: Record<string, string>): Response {
  return new Response(null, { status: 302, headers: { Location: location, ...headers } });
}

async function generateToken(room: string, name: string): Promise<string> {
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, { identity: name, name, ttl: "2h" });
  at.addGrant({ roomJoin: true, room, canPublish: true, canSubscribe: true });
  return at.toJwt();
}

// ── Server ────────────────────────────────────────────────────────────────────
serve({
  port: PORT,
  hostname: "0.0.0.0",  // required for Railway / containerized hosting

  async fetch(req) {
    const url  = new URL(req.url);
    const path = url.pathname;

    // Static files
    if (path.startsWith("/public/")) {
      const res = serveStatic(path.replace("/public/", ""));
      if (res) return res;
    }

    // ── Auth pages (no session required) ──────────────────────────────────────
    if (path === "/login") {
      return html(loginPage({
        redirect: url.searchParams.get("redirect") || "/",
        verified: url.searchParams.get("verified") === "1",
        reset:    url.searchParams.get("reset")    === "1",
      }));
    }
    if (path === "/register")        return html(registerPage());
    if (path === "/forgot-password") return html(forgotPasswordPage());
    if (path === "/reset-password") {
      const token = url.searchParams.get("token") || "";
      return html(resetPasswordPage(token));
    }

    // ── Email verification ────────────────────────────────────────────────────
    if (path === "/verify-email") {
      const token = url.searchParams.get("token") || "";
      if (!token) return redirect("/login");
      const recs = await runQuery(
        "MATCH (u:User {verifyToken: $token}) RETURN u.id AS id, u.emailVerified AS ev",
        { token }
      );
      if (!recs.length || recs[0].get("ev") === true) return redirect("/login");
      await runQuery(
        "MATCH (u:User {verifyToken: $token}) SET u.emailVerified = true, u.verifyToken = null",
        { token }
      );
      return redirect("/login?verified=1");
    }

    // ── Auth API ──────────────────────────────────────────────────────────────

    // POST /api/auth/register
    if (path === "/api/auth/register" && req.method === "POST") {
      try {
        const b = await req.json() as { name?: string; email?: string; password?: string };
        const name  = (b.name  || "").trim();
        const email = (b.email || "").trim().toLowerCase();
        const pw    = b.password || "";
        if (!name || !email || !pw)
          return json({ error: "Name, email and password are required" }, 400);
        if (pw.length < 8)
          return json({ error: "Password must be at least 8 characters" }, 400);
        // Check email not already used
        const existing = await runQuery("MATCH (u:User {email: $email}) RETURN u.id AS id", { email });
        if (existing.length) return json({ error: "An account with this email already exists" }, 409);
        const id          = "user-" + Date.now().toString(36);
        const passwordHash = await hashPassword(pw);
        const verifyToken  = generateSecureToken();
        const now          = Date.now();
        await runQuery(
          "CREATE (u:User { id: $id, name: $name, email: $email, passwordHash: $passwordHash, " +
          "emailVerified: false, verifyToken: $verifyToken, createdAt: $now })",
          { id, name, email, passwordHash, verifyToken, now }
        );
        await sendVerificationEmail(email, name, verifyToken);
        return json({ ok: true });
      } catch (e) { return json({ error: String(e) }, 500); }
    }

    // POST /api/auth/login
    if (path === "/api/auth/login" && req.method === "POST") {
      try {
        const b = await req.json() as { email?: string; password?: string };
        const email = (b.email || "").trim().toLowerCase();
        const pw    = b.password || "";
        if (!email || !pw) return json({ error: "Email and password are required" }, 400);
        const recs = await runQuery(
          "MATCH (u:User {email: $email}) RETURN u.id AS id, u.name AS name, " +
          "u.passwordHash AS hash, u.emailVerified AS ev",
          { email }
        );
        const GENERIC = "Invalid email or password";
        if (!recs.length) return json({ error: GENERIC }, 401);
        const row  = recs[0];
        const hash = row.get("hash") as string;
        const ok   = await verifyPassword(pw, hash);
        if (!ok) return json({ error: GENERIC }, 401);
        if (!row.get("ev")) return json({ error: "Please verify your email before signing in" }, 403);
        const userId = row.get("id") as string;
        const name   = row.get("name") as string;
        const token  = createSession(userId, name, email);
        return json({ ok: true }, 200, { "Set-Cookie": setSessionCookie(token) } as any);
      } catch (e) { return json({ error: String(e) }, 500); }
    }

    // POST /api/auth/logout  (also GET /logout)
    if ((path === "/api/auth/logout" && req.method === "POST") || (path === "/logout" && req.method === "GET")) {
      const token = getSessionCookie(req);
      if (token) destroySession(token);
      return redirect("/login", { "Set-Cookie": clearSessionCookie() });
    }

    // POST /api/auth/forgot-password
    if (path === "/api/auth/forgot-password" && req.method === "POST") {
      try {
        const b     = await req.json() as { email?: string };
        const email = (b.email || "").trim().toLowerCase();
        // Always respond ok (no enumeration)
        if (email) {
          const recs = await runQuery(
            "MATCH (u:User {email: $email}) RETURN u.id AS id, u.name AS name, u.emailVerified AS ev",
            { email }
          );
          if (recs.length && recs[0].get("ev")) {
            const name       = recs[0].get("name") as string;
            const resetToken = generateSecureToken();
            const expiry     = Date.now() + 3600_000; // 1 hour
            await runQuery(
              "MATCH (u:User {email: $email}) SET u.resetToken = $token, u.resetTokenExpiry = $expiry",
              { email, token: resetToken, expiry }
            );
            await sendResetEmail(email, name, resetToken);
          }
        }
        return json({ ok: true });
      } catch (e) { return json({ error: String(e) }, 500); }
    }

    // POST /api/auth/reset-password
    if (path === "/api/auth/reset-password" && req.method === "POST") {
      try {
        const b  = await req.json() as { token?: string; password?: string };
        const tk = (b.token || "").trim();
        const pw = b.password || "";
        if (!tk || !pw) return json({ error: "Token and password are required" }, 400);
        if (pw.length < 8) return json({ error: "Password must be at least 8 characters" }, 400);
        const recs = await runQuery(
          "MATCH (u:User {resetToken: $token}) RETURN u.id AS id, u.resetTokenExpiry AS exp",
          { token: tk }
        );
        if (!recs.length) return json({ error: "This reset link is invalid or has expired" }, 400);
        const expiry = recs[0].get("exp") as number;
        if (Date.now() > expiry) return json({ error: "This reset link has expired — please request a new one" }, 400);
        const passwordHash = await hashPassword(pw);
        await runQuery(
          "MATCH (u:User {resetToken: $token}) SET u.passwordHash = $hash, u.resetToken = null, u.resetTokenExpiry = null",
          { token: tk, hash: passwordHash }
        );
        return json({ ok: true });
      } catch (e) { return json({ error: String(e) }, 500); }
    }

    // ── Session check (protected routes) ─────────────────────────────────────
    const sessionToken = getSessionCookie(req);
    const session      = sessionToken ? getSession(sessionToken) : null;

    // Protected pages
    if (path === "/" || path === "/home") {
      if (!session) return redirect("/login?redirect=" + encodeURIComponent(path));
      return html(homePage({ name: session.name, email: session.email }));
    }
    if (path === "/room" || path.startsWith("/room/")) {
      if (!session) return redirect("/login?redirect=" + encodeURIComponent(req.url));
      const roomId = path.replace(/^\/room\/?/, "") || "";
      return html(roomPage(roomId, { name: session.name, email: session.email }));
    }

    // ── Token API (protected) ─────────────────────────────────────────────────
    if (path === "/api/token" && req.method === "POST") {
      if (!session) return json({ error: "Unauthorized" }, 401);
      try {
        const b = await req.json() as { room?: string; name?: string };
        const room = (b.room || "").trim(), name = (b.name || session.name).trim();
        if (!room) return json({ error: "room required" }, 400);
        return json({ token: await generateToken(room, name), url: LIVEKIT_URL });
      } catch (e) { return json({ error: String(e) }, 500); }
    }

    // ── Meeting APIs ──────────────────────────────────────────────────────────

    if (path === "/api/meetings" && req.method === "POST") {
      try {
        const b = await req.json() as { label?: string; adminName?: string; micDefault?: string; camDefault?: string };
        const label = (b.label || "").trim();
        if (!label) return json({ error: "label required" }, 400);
        const admin = (b.adminName || session?.name || "Host").trim();
        const id    = generateId(label);
        const now   = Date.now();
        await runQuery(
          "MERGE (u:User {name: $admin}) ON CREATE SET u.createdAt = $now " +
          "CREATE (m:Meeting { id: $id, label: $label, adminName: $admin, status: 'active', " +
          "micDefault: $mic, camDefault: $cam, createdAt: $now }) " +
          "CREATE (u)-[:CREATED {at: $now}]->(m)",
          { admin, id, label, mic: b.micDefault || "allow", cam: b.camDefault || "allow", now }
        );
        return json({ ok: true, id, label });
      } catch (e) { return json({ error: String(e) }, 500); }
    }

    if (path === "/api/meetings" && req.method === "GET") {
      try {
        const recs = await runQuery(
          "MATCH (m:Meeting) WHERE NOT ()-[:HAS_CHILD]->(m) " +
          "OPTIONAL MATCH (u:User)-[r:PARTICIPATES_IN]->(m) WHERE r.leftAt IS NULL " +
          "WITH m, count(u) AS participants " +
          "RETURN m.id AS id, m.label AS label, m.adminName AS adminName, " +
          "m.status AS status, m.createdAt AS createdAt, participants " +
          "ORDER BY m.createdAt DESC LIMIT 50"
        );
        return json(recs.map(r => ({
          id: r.get("id"), label: r.get("label"), adminName: r.get("adminName"),
          status: r.get("status"), createdAt: r.get("createdAt"), participants: r.get("participants"),
        })));
      } catch (e) { return json({ error: String(e) }, 500); }
    }

    const joinMatch = path.match(/^\/api\/meetings\/([^/]+)\/join$/);
    if (joinMatch && req.method === "POST") {
      const mid = decodeURIComponent(joinMatch[1]);
      try {
        const b    = await req.json() as { name?: string; role?: string };
        const name = (b.name || "").trim();
        if (!name) return json({ error: "name required" }, 400);
        const now  = Date.now();
        await runQuery(
          "MERGE (u:User {name: $name}) ON CREATE SET u.createdAt = $now " +
          "WITH u MATCH (m:Meeting {id: $mid}) " +
          "MERGE (u)-[r:PARTICIPATES_IN]->(m) " +
          "ON CREATE SET r.role = $role, r.joinedAt = $now, r.leftAt = null " +
          "ON MATCH  SET r.leftAt = null, r.joinedAt = $now, r.role = $role",
          { name, mid, role: b.role || "participant", now }
        );
        return json({ ok: true });
      } catch (e) { return json({ error: String(e) }, 500); }
    }

    const leaveMatch = path.match(/^\/api\/meetings\/([^/]+)\/leave$/);
    if (leaveMatch && req.method === "POST") {
      const mid = decodeURIComponent(leaveMatch[1]);
      try {
        const b    = await req.json() as { name?: string };
        const name = (b.name || "").trim();
        if (!name) return json({ error: "name required" }, 400);
        await runQuery(
          "MATCH (u:User {name: $name})-[r:PARTICIPATES_IN]->(m:Meeting {id: $mid}) SET r.leftAt = $now",
          { name, mid, now: Date.now() }
        );
        return json({ ok: true });
      } catch (e) { return json({ error: String(e) }, 500); }
    }

    // POST /api/meetings/:id/invite — send email invite to external person
    const inviteMatch = path.match(/^\/api\/meetings\/([^/]+)\/invite$/);
    if (inviteMatch && req.method === "POST") {
      const mid = decodeURIComponent(inviteMatch[1]);
      try {
        const b = await req.json() as { email?: string; inviterName?: string; meetingLabel?: string };
        const email        = (b.email || "").trim().toLowerCase();
        const inviterName  = (b.inviterName || session?.name || "Someone").trim();
        const meetingLabel = (b.meetingLabel || mid).trim();
        if (!email || !email.includes("@")) return json({ error: "valid email required" }, 400);
        const APP_URL = process.env.APP_URL || "http://localhost:" + PORT;
        const link = `${APP_URL}/room/${encodeURIComponent(mid)}`;
        await sendMeetingInviteEmail(email, inviterName, meetingLabel, link);
        return json({ ok: true });
      } catch (e) {
        console.error("[invite] Failed to send email invite:", e);
        return json({ error: String(e) }, 500);
      }
    }

    // ── Tree APIs ─────────────────────────────────────────────────────────────

    const treeGetMatch = path.match(/^\/api\/tree\/([^/]+)$/);
    if (treeGetMatch && req.method === "GET") {
      const rootId  = decodeURIComponent(treeGetMatch[1]);
      const fromId  = url.searchParams.get("viewAs") || rootId;
      try {
        const recs = await runQuery(
          "MATCH (root:Meeting {id: $fromId})-[:HAS_CHILD*0..]->(m:Meeting) " +
          "OPTIONAL MATCH (parent:Meeting)-[:HAS_CHILD]->(m) " +
          "OPTIONAL MATCH (u:User)-[r:PARTICIPATES_IN]->(m) WHERE r.leftAt IS NULL " +
          "RETURN m.id AS id, m.label AS label, parent.id AS parentId, " +
          "m.adminName AS adminName, count(DISTINCT u) AS participants, " +
          "m.status AS status, m.micDefault AS micDefault, " +
          "m.camDefault AS camDefault, m.createdAt AS createdAt",
          { fromId }
        );
        if (recs.length === 0) {
          const now = Date.now();
          await runQuery(
            "CREATE (m:Meeting { id: $rootId, label: $rootId, adminName: 'Host', " +
            "status: 'active', micDefault: 'allow', camDefault: 'allow', createdAt: $now })",
            { rootId, now }
          );
          return json({ rootId, nodes: [{ id: rootId, label: rootId, parentId: null,
            adminName: "Host", participants: 0, status: "active",
            micDefault: "allow", camDefault: "allow", createdAt: Date.now() }] });
        }
        return json({ rootId, nodes: recs.map(r => ({
          id: r.get("id"), label: r.get("label"), parentId: r.get("parentId") ?? null,
          adminName: r.get("adminName"), participants: r.get("participants"),
          status: r.get("status"), micDefault: r.get("micDefault"),
          camDefault: r.get("camDefault"), createdAt: r.get("createdAt"),
        })) });
      } catch (e) { return json({ error: String(e) }, 500); }
    }

    const treeInitMatch = path.match(/^\/api\/tree\/([^/]+)$/);
    if (treeInitMatch && req.method === "POST") {
      const rootId = decodeURIComponent(treeInitMatch[1]);
      try {
        const b = await req.json() as { label?: string; adminName?: string };
        const now = Date.now();
        await runQuery(
          "MERGE (m:Meeting {id: $rootId}) " +
          "ON CREATE SET m.label = $label, m.adminName = $admin, m.status = 'active', " +
          "m.micDefault = 'allow', m.camDefault = 'allow', m.createdAt = $now " +
          "ON MATCH SET m.label = $label, m.adminName = $admin",
          { rootId, label: b.label || rootId, admin: b.adminName || "Host", now }
        );
        return json({ ok: true, rootId });
      } catch (e) { return json({ error: String(e) }, 500); }
    }

    const treeAddMatch = path.match(/^\/api\/tree\/([^/]+)\/node$/);
    if (treeAddMatch && req.method === "POST") {
      try {
        const b = await req.json() as {
          parentId: string; label: string; adminName: string;
          micDefault?: string; camDefault?: string;
        };
        const nodeId = generateId(b.label);
        const now    = Date.now();
        await runQuery(
          "MATCH (parent:Meeting {id: $parentId}) " +
          "CREATE (child:Meeting { id: $nodeId, label: $label, adminName: $admin, status: 'active', " +
          "micDefault: $mic, camDefault: $cam, createdAt: $now }) " +
          "CREATE (parent)-[:HAS_CHILD]->(child)",
          { parentId: b.parentId, nodeId, label: b.label,
            admin: b.adminName || "Admin",
            mic: b.micDefault || "allow", cam: b.camDefault || "allow", now }
        );
        return json({ ok: true, node: { id: nodeId, label: b.label, parentId: b.parentId,
          adminName: b.adminName || "Admin", participants: 0, status: "active",
          micDefault: b.micDefault || "allow", camDefault: b.camDefault || "allow", createdAt: now } });
      } catch (e) { return json({ error: String(e) }, 500); }
    }

    const treePermMatch = path.match(/^\/api\/tree\/([^/]+)\/node\/([^/]+)\/permission$/);
    if (treePermMatch && req.method === "PUT") {
      const nodeId = decodeURIComponent(treePermMatch[2]);
      try {
        const b = await req.json() as { micDefault?: string; camDefault?: string };
        await runQuery(
          "MATCH (m:Meeting {id: $nodeId}) SET m.micDefault = $mic, m.camDefault = $cam",
          { nodeId, mic: b.micDefault || "allow", cam: b.camDefault || "allow" }
        );
        return json({ ok: true });
      } catch (e) { return json({ error: String(e) }, 500); }
    }

    // 404
    return new Response(
      "<!doctype html><html><body style='font-family:sans-serif;padding:40px;text-align:center'>" +
      "<h2 style='color:#D15000'>404 — Page Not Found</h2>" +
      "<a href='/' style='color:#D15000'>Back to home</a></body></html>",
      { status: 404, headers: { "Content-Type": "text/html" } }
    );
  },
});

console.log(`Meeting Forest running on port ${PORT}`);
