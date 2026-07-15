import { serve } from "bun";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { homePage } from "./src/pages/home";
import { roomPage } from "./src/pages/room";
import { pastMeetingsPage } from "./src/pages/past-meetings";
import { invitationsPage } from "./src/pages/invitations";
import { aiMeetingSetupPage } from "./src/pages/ai-meeting-setup";
import { aiRepSettingsPage } from "./src/pages/ai-rep-settings";
import { debriefsPage } from "./src/pages/debriefs";
import { settingsPage } from "./src/pages/settings";
import { loginPage } from "./src/pages/login";
import { registerPage } from "./src/pages/register";
import { forgotPasswordPage } from "./src/pages/forgot-password";
import { resetPasswordPage } from "./src/pages/reset-password";
import { adminLoginPage } from "./src/pages/admin-login";
import { adminDashboardPage } from "./src/pages/admin-dashboard";
import { adminUsersPage } from "./src/pages/admin-users";
import {
  createSession, getSession, destroySession,
  getSessionCookie, setSessionCookie, clearSessionCookie,
  generateSecureToken, hashPassword, verifyPassword,
  sendVerificationEmail, sendResetEmail, sendMeetingInviteEmail,
} from "./src/auth";
import {
  requireAdmin, createAdminSession, destroyAdminSession,
  getAdminSessionCookie, setAdminSessionCookie, clearAdminSessionCookie,
  verifyAdminCredentials, isAdminLoginRateLimited, recordAdminLoginAttempt,
  clearAdminLoginAttempts, clientIp,
} from "./src/admin-auth";
import { config } from "./src/config";
import { runQuery } from "./src/db/memgraph";
import { getAdminOverview, listAdminUsers, listAdminMeetings } from "./src/db/admin-queries";
import { generateId, createDefaultAssistant } from "./src/db/ai-queries";
import { generateToken } from "./src/livekit/tokens";
import {
  createRing, normEmail, getRingById, getRingByEmail, deleteRingByEmail,
} from "./src/rings";
import {
  ensureActiveSession, removeActiveSession, touchActiveSession,
  getActiveSessions, isSessionActive, pruneStaleSessions,
} from "./src/sessions";
import {
  handlePostAiMeetings, handleGetAiMeetings, handleEndAiMeeting,
  handleGetAiRep, handlePostAiRep, handleDeleteAiRep,
  handlePostAiRepContext, handleDeleteAiRepContext, handleDeployAiRep,
  handleGetDebriefs, handleGetDebrief, handleInternalRing,
  handleInternalParticipantStatus, handleInternalRingStatus,
  signalParticipantJoined,
} from "./src/api/ai-handlers";
import { handleGetUserSettings, handlePatchUserSettings } from "./src/api/user-handlers";

const PORT = config.port;
const APP_URL = config.appUrl;
const LIVEKIT_URL = config.livekit.url;

// ── Waiting room (in-memory, private meetings) ────────────────────────────────
interface WaitingUser {
  waitingId: string;
  name:      string;
  email:     string;
  knockedAt: number;
  status:    "waiting" | "admitted" | "rejected" | "entered";
}
const waitingRooms = new Map<string, Map<string, WaitingUser>>();

// Auto-clean entries older than 10 minutes every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  waitingRooms.forEach((users, mid) => {
    users.forEach((u, wid) => { if (u.knockedAt < cutoff) users.delete(wid); });
    if (users.size === 0) waitingRooms.delete(mid);
  });
}, 5 * 60 * 1000);

// ── Static / helpers ──────────────────────────────────────────────────────────
const MIME: Record<string, string> = {
  ".css": "text/css", ".js": "text/javascript", ".html": "text/html",
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
        const existing = await runQuery(
          "MATCH (u:User {email: $email}) RETURN u.emailVerified AS ev", { email }
        );
        if (existing.length) {
          const verified = existing[0].get("ev");
          if (!verified) {
            // Registered but never verified — signal the frontend to offer resend
            return json({ error: "This email is registered but not yet verified.", unverified: true }, 409);
          }
          return json({ error: "An account with this email already exists" }, 409);
        }
        const id          = "user-" + Date.now().toString(36);
        const passwordHash = await hashPassword(pw);
        const verifyToken  = generateSecureToken();
        const now          = Date.now();
        await runQuery(
          "CREATE (u:User { id: $id, name: $name, email: $email, passwordHash: $passwordHash, " +
          "emailVerified: false, verifyToken: $verifyToken, createdAt: $now, ringingEnabled: true })",
          { id, name, email, passwordHash, verifyToken, now }
        );
        await createDefaultAssistant(email, name);
        await sendVerificationEmail(email, name, verifyToken);
        return json({ ok: true });
      } catch (e) { return json({ error: String(e) }, 500); }
    }

    // POST /api/auth/resend-verification
    if (path === "/api/auth/resend-verification" && req.method === "POST") {
      try {
        const b     = await req.json() as { email?: string };
        const email = (b.email || "").trim().toLowerCase();
        if (email) {
          const recs = await runQuery(
            "MATCH (u:User {email: $email}) RETURN u.name AS name, u.emailVerified AS ev",
            { email }
          );
          // Only resend if account exists and is still unverified
          if (recs.length && !recs[0].get("ev")) {
            const name        = recs[0].get("name") as string;
            const verifyToken = generateSecureToken();
            await runQuery(
              "MATCH (u:User {email: $email}) SET u.verifyToken = $verifyToken",
              { email, verifyToken }
            );
            await sendVerificationEmail(email, name, verifyToken);
          }
        }
        // Always respond OK — no enumeration
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

    // ── Platform admin (env credentials; separate from user sessions) ─────────

    if (path === "/admin/login") {
      if (requireAdmin(req)) return redirect("/admin");
      return html(adminLoginPage());
    }

    if (path === "/api/admin/login" && req.method === "POST") {
      try {
        const ip = clientIp(req);
        if (isAdminLoginRateLimited(ip)) {
          return json({ error: "Too many login attempts. Try again later." }, 429);
        }
        const b = await req.json() as { email?: string; password?: string };
        const email = (b.email || "").trim();
        const pw = b.password || "";
        if (!email || !pw) return json({ error: "Email and password are required" }, 400);
        const adminEmail = verifyAdminCredentials(email, pw);
        if (!adminEmail) {
          recordAdminLoginAttempt(ip);
          return json({ error: "Invalid email or password" }, 401);
        }
        clearAdminLoginAttempts(ip);
        const token = createAdminSession(adminEmail);
        return json({ ok: true }, 200, { "Set-Cookie": setAdminSessionCookie(token) });
      } catch (e) { return json({ error: String(e) }, 500); }
    }

    if (path === "/api/admin/logout" && req.method === "POST") {
      const token = getAdminSessionCookie(req);
      if (token) destroyAdminSession(token);
      return json({ ok: true }, 200, { "Set-Cookie": clearAdminSessionCookie() });
    }

    if (path === "/admin" || path === "/admin/") {
      const admin = requireAdmin(req);
      if (!admin) return redirect("/admin/login");
      return html(adminDashboardPage({ email: admin.email }));
    }

    if (path === "/admin/users") {
      const admin = requireAdmin(req);
      if (!admin) return redirect("/admin/login");
      return html(adminUsersPage({ email: admin.email }));
    }

    if (path === "/api/admin/overview" && req.method === "GET") {
      if (!requireAdmin(req)) return json({ error: "Unauthorized" }, 401);
      try {
        return json(await getAdminOverview());
      } catch (e) {
        console.error("[admin/overview]", e);
        return json({ error: String(e) }, 500);
      }
    }

    if (path === "/api/admin/users" && req.method === "GET") {
      if (!requireAdmin(req)) return json({ error: "Unauthorized" }, 401);
      try {
        const q = url.searchParams.get("q") || undefined;
        const page = parseInt(url.searchParams.get("page") || "1", 10);
        const limit = parseInt(url.searchParams.get("limit") || "25", 10);
        return json(await listAdminUsers({ q, page, limit }));
      } catch (e) {
        console.error("[admin/users]", e);
        return json({ error: String(e) }, 500);
      }
    }

    if (path === "/api/admin/meetings" && req.method === "GET") {
      if (!requireAdmin(req)) return json({ error: "Unauthorized" }, 401);
      try {
        const page = parseInt(url.searchParams.get("page") || "1", 10);
        const limit = parseInt(url.searchParams.get("limit") || "25", 10);
        return json(await listAdminMeetings({ page, limit }));
      } catch (e) {
        console.error("[admin/meetings]", e);
        return json({ error: String(e) }, 500);
      }
    }

    // ── Session check (protected routes) ─────────────────────────────────────
    const sessionToken = getSessionCookie(req);
    const session      = sessionToken ? getSession(sessionToken) : null;

    // Protected pages
    if (path === "/" || path === "/home") {
      if (!session) return redirect("/login?redirect=" + encodeURIComponent(path));
      return html(homePage({ name: session.name, email: session.email }));
    }
    if (path === "/meetings/past") {
      if (!session) return redirect("/login?redirect=" + encodeURIComponent(path));
      return html(pastMeetingsPage({ name: session.name, email: session.email }));
    }
    if (path === "/meetings/invitations") {
      if (!session) return redirect("/login?redirect=" + encodeURIComponent(path));
      return html(invitationsPage({ name: session.name, email: session.email }));
    }
    if (path === "/ai-meeting") {
      if (!session) return redirect("/login?redirect=" + encodeURIComponent(path));
      return html(aiMeetingSetupPage({ name: session.name, email: session.email }));
    }
    if (path === "/settings/ai-rep") {
      if (!session) return redirect("/login?redirect=" + encodeURIComponent(path));
      return html(aiRepSettingsPage({ name: session.name, email: session.email }));
    }
    if (path === "/debriefs") {
      if (!session) return redirect("/login?redirect=" + encodeURIComponent(path));
      return html(debriefsPage({ name: session.name, email: session.email }));
    }
    if (path === "/settings") {
      if (!session) return redirect("/login?redirect=" + encodeURIComponent(path));
      return html(settingsPage({ name: session.name, email: session.email }));
    }
    if (path === "/room" || path.startsWith("/room/")) {
      if (!session) return redirect("/login?redirect=" + encodeURIComponent(req.url));
      const roomId = path.replace(/^\/room\/?/, "") || "";
      let serverRole: string | undefined;
      let meetingPrivacy = "public";

      if (roomId) {
        // 1. Check if user is creator
        let isCreator = false;
        try {
          const cr = await runQuery(
            "MATCH (u:User {email: $email})-[:CREATED]->(m:Meeting {id: $roomId}) RETURN m.privacy AS privacy",
            { email: session.email, roomId }
          );
          if (cr.length > 0) {
            serverRole   = "superadmin";
            isCreator    = true;
            meetingPrivacy = (cr[0].get("privacy") as string) || "public";
          }
        } catch { /* non-critical */ }

        // 2. Non-creator: fetch meeting privacy
        if (!isCreator && roomId) {
          try {
            const mr = await runQuery(
              "MATCH (m:Meeting {id: $roomId}) RETURN m.privacy AS privacy",
              { roomId }
            );
            if (mr.length > 0) meetingPrivacy = (mr[0].get("privacy") as string) || "public";
          } catch { /* fall through */ }

          if (meetingPrivacy === "private") {
            // Check if already admitted (via waiting room)
            const waitingMap  = waitingRooms.get(roomId);
            const admittedEntry = waitingMap
              ? Array.from(waitingMap.values()).find(
                  w => w.email === session.email && (w.status === "admitted" || w.status === "entered")
                )
              : undefined;

            if (admittedEntry) {
              // Mark as entered so refreshes don't bounce back
              admittedEntry.status = "entered";
              // fall through to serve the actual room page
            } else {
              // Check if user is a sub-meeting admin (PARTICIPATES_IN with admin role)
              let isSubAdmin = false;
              try {
                const ar = await runQuery(
                  "MATCH (u:User {email: $email})-[r:PARTICIPATES_IN]->(m:Meeting {id: $roomId}) " +
                  "WHERE r.role IN ['admin', 'superadmin'] RETURN r.role AS role",
                  { email: session.email, roomId }
                );
                isSubAdmin = ar.length > 0;
                if (isSubAdmin) serverRole = "admin";
              } catch { /* non-critical */ }

              if (!isSubAdmin) {
                // Serve room page with pre-admitted=false so lobby shows "Ask to Join" flow
                return html(roomPage(roomId, { name: session.name, email: session.email }, serverRole, meetingPrivacy, false));
              }
            }
          }
        }
      }

      return html(roomPage(roomId, { name: session.name, email: session.email }, serverRole, meetingPrivacy));
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
      if (!session) return json({ error: "Unauthorized" }, 401);
      try {
        const b = await req.json() as { label?: string; adminName?: string; micDefault?: string; camDefault?: string; privacy?: string };
        const label = (b.label || "").trim();
        if (!label) return json({ error: "label required" }, 400);
        const admin   = (b.adminName || session.name || "Host").trim();
        const email   = session.email;
        const id      = generateId(label);
        const now     = Date.now();
        const privacy = b.privacy === "private" ? "private" : "public";
        await runQuery(
          "MATCH (u:User {email: $email}) " +
          "CREATE (m:Meeting { id: $id, label: $label, adminName: $admin, status: 'active', " +
          "privacy: $privacy, micDefault: $mic, camDefault: $cam, createdAt: $now }) " +
          "CREATE (u)-[:CREATED {at: $now}]->(m)",
          { email, admin, id, label, privacy, mic: b.micDefault || "allow", cam: b.camDefault || "allow", now }
        );
        return json({ ok: true, id, label, privacy });
      } catch (e) { return json({ error: String(e) }, 500); }
    }

    if (path === "/api/meetings" && req.method === "GET") {
      if (!session) return json({ error: "Unauthorized" }, 401);
      try {
        // Only return root meetings the logged-in user created or participated in
        const recs = await runQuery(
          "MATCH (u:User {email: $email})-[:CREATED|PARTICIPATES_IN]->(m:Meeting) " +
          "WHERE NOT ()-[:HAS_CHILD]->(m) " +
          "OPTIONAL MATCH (p:User)-[r:PARTICIPATES_IN]->(m) WHERE r.leftAt IS NULL " +
          "WITH m, count(DISTINCT p) AS participants " +
          "RETURN m.id AS id, m.label AS label, m.adminName AS adminName, " +
          "m.status AS status, m.createdAt AS createdAt, m.privacy AS privacy, participants " +
          "ORDER BY m.createdAt DESC LIMIT 50",
          { email: session.email }
        );
        return json(recs.map(r => ({
          id: r.get("id"), label: r.get("label"), adminName: r.get("adminName"),
          status: r.get("status"), createdAt: r.get("createdAt"), participants: r.get("participants"),
          privacy: r.get("privacy") || "public",
        })));
      } catch (e) { return json({ error: String(e) }, 500); }
    }

    // GET /api/meetings/past — meetings the user created or participated in
    if (path === "/api/meetings/past" && req.method === "GET") {
      if (!session) return json({ error: "Unauthorized" }, 401);
      try {
        // Match any meeting the user has a relationship with (created OR joined)
        // Use DISTINCT to avoid duplicates when both CREATED and PARTICIPATES_IN exist
        const recs = await runQuery(
          "MATCH (u:User {email: $email})-[:CREATED|PARTICIPATES_IN]->(m:Meeting) " +
          "WHERE NOT ()-[:HAS_CHILD]->(m) " +
          "WITH DISTINCT u, m " +
          "OPTIONAL MATCH (u)-[rp:PARTICIPATES_IN]->(m) " +
          "RETURN m.id AS id, m.label AS label, m.adminName AS adminName, " +
          "m.status AS status, m.createdAt AS createdAt, " +
          "COALESCE(rp.role, 'creator') AS role, " +
          "rp.joinedAt AS joinedAt, rp.leftAt AS leftAt " +
          "ORDER BY m.createdAt DESC LIMIT 100",
          { email: session.email }
        );
        return json(recs.map(r => ({
          id: r.get("id"), label: r.get("label"), adminName: r.get("adminName"),
          status: r.get("status"), createdAt: r.get("createdAt"),
          joinedAt: r.get("joinedAt"), leftAt: r.get("leftAt"), role: r.get("role"),
        })));
      } catch (e) { return json({ error: String(e) }, 500); }
    }

    // GET /api/meetings/invitations — meetings the user was invited to
    if (path === "/api/meetings/invitations" && req.method === "GET") {
      if (!session) return json({ error: "Unauthorized" }, 401);
      try {
        const recs = await runQuery(
          "MATCH (u:User {email: $email})-[r:INVITED_TO]->(m:Meeting) " +
          "WHERE NOT ()-[:HAS_CHILD]->(m) " +
          "RETURN m.id AS id, m.label AS label, m.adminName AS adminName, " +
          "m.status AS status, m.createdAt AS createdAt, " +
          "r.by AS invitedBy, r.at AS invitedAt " +
          "ORDER BY r.at DESC LIMIT 50",
          { email: session.email }
        );
        return json(recs.map(r => ({
          id: r.get("id"), label: r.get("label"), adminName: r.get("adminName"),
          status: r.get("status"), createdAt: r.get("createdAt"),
          invitedBy: r.get("invitedBy"), invitedAt: r.get("invitedAt"),
        })));
      } catch (e) { return json({ error: String(e) }, 500); }
    }

    const joinMatch = path.match(/^\/api\/meetings\/([^/]+)\/join$/);
    if (joinMatch && req.method === "POST") {
      if (!session) return json({ error: "Unauthorized" }, 401);
      const mid = decodeURIComponent(joinMatch[1]);
      try {
        const b    = await req.json() as { name?: string; role?: string };
        const name = (b.name || session.name || "").trim();
        if (!name) return json({ error: "name required" }, 400);
        const now  = Date.now();
        // If user is the original creator of this meeting, always assign superadmin
        const creatorCheck = await runQuery(
          "MATCH (u:User {email: $email})-[:CREATED]->(m:Meeting {id: $mid}) RETURN u.email AS e",
          { email: session.email, mid }
        );
        const role = creatorCheck.length > 0 ? "superadmin" : (b.role || "participant");
        await runQuery(
          "MATCH (u:User {email: $email}) " +
          "WITH u MATCH (m:Meeting {id: $mid}) " +
          "MERGE (u)-[r:PARTICIPATES_IN]->(m) " +
          "ON CREATE SET r.role = $role, r.joinedAt = $now, r.leftAt = null " +
          "ON MATCH  SET r.leftAt = null, r.joinedAt = $now, r.role = $role",
          { email: session.email, mid, role, now }
        );
        // Track in activeSessions for @ring validation
        ensureActiveSession(mid, normEmail(session.email), name);
        signalParticipantJoined(mid, session.email).catch(() => {});
        return json({ ok: true, role });
      } catch (e) { return json({ error: String(e) }, 500); }
    }

    const leaveMatch = path.match(/^\/api\/meetings\/([^/]+)\/leave$/);
    if (leaveMatch && req.method === "POST") {
      if (!session) return json({ error: "Unauthorized" }, 401);
      const mid = decodeURIComponent(leaveMatch[1]);
      try {
        await runQuery(
          "MATCH (u:User {email: $email})-[r:PARTICIPATES_IN]->(m:Meeting {id: $mid}) SET r.leftAt = $now",
          { email: session.email, mid, now: Date.now() }
        );
        // Remove from activeSessions
        removeActiveSession(mid, normEmail(session.email));
        return json({ ok: true });
      } catch (e) { return json({ error: String(e) }, 500); }
    }

    const heartbeatMatch = path.match(/^\/api\/meetings\/([^/]+)\/heartbeat$/);
    if (heartbeatMatch && req.method === "POST") {
      if (!session) return json({ error: "Unauthorized" }, 401);
      const mid   = decodeURIComponent(heartbeatMatch[1]);
      const email = normEmail(session.email);
      if (!touchActiveSession(mid, email)) return json({ error: "Not in meeting" }, 404);
      return json({ ok: true });
    }

    // ── Ring endpoints ────────────────────────────────────────────────────────

    // POST /api/rings — create a ring (caller must be in the meeting)
    if (path === "/api/rings" && req.method === "POST") {
      if (!session) return json({ error: "Unauthorized" }, 401);
      try {
        const b = await req.json() as { targetEmail?: string; meetingId?: string; meetingLabel?: string };
        const targetEmail  = normEmail(b.targetEmail || "");
        const meetingId    = (b.meetingId    || "").trim();
        const meetingLabel = (b.meetingLabel || meetingId).trim();
        const callerEmail  = normEmail(session.email);
        if (!targetEmail || !targetEmail.includes("@")) {
          console.log("[ring-api] create", { caller: callerEmail, target: targetEmail, meetingId, status: 400, reason: "invalid email" });
          return json({ error: "Valid email required" }, 400);
        }
        if (!meetingId) {
          console.log("[ring-api] create", { caller: callerEmail, target: targetEmail, meetingId, status: 400, reason: "missing meetingId" });
          return json({ error: "meetingId required" }, 400);
        }

        const roomSessions = getActiveSessions(meetingId);
        if (roomSessions) pruneStaleSessions(roomSessions);
        if (!isSessionActive(roomSessions, callerEmail)) {
          console.log("[ring-api] create", { caller: callerEmail, target: targetEmail, meetingId, status: 403, reason: "caller not in meeting" });
          return json({ error: "You must join the meeting before ringing someone" }, 403);
        }

        const result = await createRing(
          callerEmail,
          session.name || session.email,
          targetEmail,
          meetingId,
          meetingLabel,
          async (email) => {
            const userRows = await runQuery(
              "MATCH (u:User {email: $email}) RETURN u.name AS name",
              { email }
            );
            return userRows.length ? (userRows[0].get("name") as string) : null;
          },
          (email) => isSessionActive(roomSessions, email)
        );

        if ("error" in result) {
          console.log("[ring-api] create", { caller: callerEmail, target: targetEmail, meetingId, status: result.status, reason: result.error });
          return json({ error: result.error }, result.status);
        }

        console.log("[ring-api] create", { caller: callerEmail, target: targetEmail, meetingId, status: 200, ringId: result.ringId, toName: result.toName });
        return json({ ringId: result.ringId, toName: result.toName });
      } catch (e) {
        console.log("[ring-api] create", { status: 500, error: String(e) });
        return json({ error: String(e) }, 500);
      }
    }

    // GET /api/rings/incoming — target polls to check for an incoming ring
    if (path === "/api/rings/incoming" && req.method === "GET") {
      if (!session) return json({ ring: null });
      const ring = getRingByEmail(normEmail(session.email));
      if (!ring || ring.status !== "ringing") return json({ ring: null });
      // Check expiry
      if (Date.now() - ring.startedAt > 2 * 60 * 1000) {
        ring.status = "expired"; deleteRingByEmail(normEmail(session.email));
        return json({ ring: null });
      }
      return json({
        ring: {
          ringId:       ring.ringId,
          fromName:     ring.fromName,
          fromEmail:    ring.fromEmail,
          meetingId:    ring.meetingId,
          meetingLabel: ring.meetingLabel,
          startedAt:    ring.startedAt,
        }
      });
    }

    // POST /api/rings/:id/respond — accept or reject a ring
    const ringRespondMatch = path.match(/^\/api\/rings\/([^/]+)\/respond$/);
    if (ringRespondMatch && req.method === "POST") {
      if (!session) return json({ error: "Unauthorized" }, 401);
      const ringId = ringRespondMatch[1];
      const ring   = getRingById(ringId);
      if (!ring) return json({ error: "Ring not found" }, 404);
      if (ring.toEmail !== normEmail(session.email)) return json({ error: "Forbidden" }, 403);
      try {
        const b = await req.json() as { action?: string };
        const action = b.action; // "accept" | "reject"
        if (action !== "accept" && action !== "reject") return json({ error: "action must be accept or reject" }, 400);
        ring.status = action === "accept" ? "accepted" : "rejected";
        deleteRingByEmail(normEmail(session.email));
        return json({ ok: true });
      } catch (e) { return json({ error: String(e) }, 500); }
    }

    // GET /api/rings/:id/status — caller polls to see if ring was answered
    const ringStatusMatch = path.match(/^\/api\/rings\/([^/]+)\/status$/);
    if (ringStatusMatch && req.method === "GET") {
      if (!session) return json({ error: "Unauthorized" }, 401);
      const ringId = ringStatusMatch[1];
      const ring   = getRingById(ringId);
      if (!ring) return json({ status: "expired" });
      // Auto-expire after 2 min
      if (ring.status === "ringing" && Date.now() - ring.startedAt > 2 * 60 * 1000) {
        ring.status = "expired"; deleteRingByEmail(ring.toEmail);
      }
      return json({ status: ring.status, toName: ring.toName });
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
        const link = `${APP_URL}/room/${encodeURIComponent(mid)}`;
        await sendMeetingInviteEmail(email, inviterName, meetingLabel, link);
        // If the invited person is a registered user, record invitation in Memgraph
        try {
          const invRecs = await runQuery(
            "MATCH (invited:User {email: $invitedEmail}) RETURN invited.email AS e",
            { invitedEmail: email }
          );
          if (invRecs.length > 0) {
            await runQuery(
              "MATCH (invited:User {email: $invitedEmail}), (m:Meeting {id: $mid}) " +
              "MERGE (invited)-[r:INVITED_TO]->(m) " +
              "ON CREATE SET r.by = $inviterName, r.at = $now " +
              "ON MATCH  SET r.by = $inviterName, r.at = $now",
              { invitedEmail: email, mid, inviterName, now: Date.now() }
            );
          }
        } catch { /* non-critical — email was already sent */ }
        return json({ ok: true });
      } catch (e) {
        console.error("[invite] Failed to send email invite:", e);
        return json({ error: String(e) }, 500);
      }
    }

    // ── AI Host & Rep APIs ────────────────────────────────────────────────────

    if (path === "/api/internal/rings" && req.method === "POST") {
      try {
        const b = await req.json() as { fromEmail?: string; fromName?: string; toEmail?: string; meetingId?: string; meetingLabel?: string };
        const result = await handleInternalRing(req.headers.get("X-Worker-Secret"), b);
        if ("error" in result && result.status !== 200) {
          return json({ error: result.error }, result.status);
        }
        return json({ ringId: result.ringId, toName: result.toName });
      } catch (e) { return json({ error: String(e) }, 500); }
    }

    const internalRingStatusMatch = path.match(/^\/api\/internal\/rings\/([^/]+)\/status$/);
    if (internalRingStatusMatch && req.method === "GET") {
      try {
        const ringId = decodeURIComponent(internalRingStatusMatch[1]);
        const result = await handleInternalRingStatus(req.headers.get("X-Worker-Secret"), ringId);
        if ("error" in result && result.status !== 200) {
          return json({ error: result.error }, result.status);
        }
        return json({ ringStatus: result.ringStatus });
      } catch (e) { return json({ error: String(e) }, 500); }
    }

    const internalParticipantStatusMatch = path.match(
      /^\/api\/internal\/meetings\/([^/]+)\/participants\/([^/]+)\/status$/
    );
    if (internalParticipantStatusMatch && req.method === "GET") {
      try {
        const meetingId = decodeURIComponent(internalParticipantStatusMatch[1]);
        const email = decodeURIComponent(internalParticipantStatusMatch[2]);
        const result = await handleInternalParticipantStatus(
          req.headers.get("X-Worker-Secret"),
          meetingId,
          email
        );
        if ("error" in result && result.status !== 200) {
          return json({ error: result.error }, result.status);
        }
        return json({ inRoom: result.inRoom, joined: result.joined });
      } catch (e) { return json({ error: String(e) }, 500); }
    }

    if (path === "/api/ai-meetings" && req.method === "POST") {
      if (!session) return json({ error: "Unauthorized" }, 401);
      try {
        const b = await req.json();
        const result = await handlePostAiMeetings(session, b);
        if (result.status !== 200) return json({ error: result.error }, result.status);
        return json({ meetingId: result.meetingId, workflowId: result.workflowId });
      } catch (e) { return json({ error: String(e) }, 500); }
    }

    if (path === "/api/ai-meetings" && req.method === "GET") {
      if (!session) return json({ error: "Unauthorized" }, 401);
      try {
        const result = await handleGetAiMeetings(session);
        return json({ meetings: result.meetings });
      } catch (e) { return json({ error: String(e) }, 500); }
    }

    const aiMeetingEndMatch = path.match(/^\/api\/ai-meetings\/([^/]+)\/end$/);
    if (aiMeetingEndMatch && req.method === "POST") {
      if (!session) return json({ error: "Unauthorized" }, 401);
      const meetingId = decodeURIComponent(aiMeetingEndMatch[1]);
      try {
        const result = await handleEndAiMeeting(session, meetingId);
        if (result.status !== 200) return json({ error: result.error }, result.status);
        return json({ ok: true });
      } catch (e) { return json({ error: String(e) }, 500); }
    }

    if (path === "/api/user/settings" && req.method === "GET") {
      if (!session) return json({ error: "Unauthorized" }, 401);
      try {
        const result = await handleGetUserSettings(session);
        if (result.status !== 200) return json({ error: result.error }, result.status);
        return json({ settings: result.settings });
      } catch (e) { return json({ error: String(e) }, 500); }
    }

    if (path === "/api/user/settings" && req.method === "PATCH") {
      if (!session) return json({ error: "Unauthorized" }, 401);
      if (!sessionToken) return json({ error: "Unauthorized" }, 401);
      try {
        const b = await req.json();
        const result = await handlePatchUserSettings(session, sessionToken, b);
        if (result.status !== 200) return json({ error: result.error }, result.status);
        return json({ settings: result.settings });
      } catch (e) { return json({ error: String(e) }, 500); }
    }

    if (path === "/api/ai-rep" && req.method === "GET") {
      if (!session) return json({ error: "Unauthorized" }, 401);
      try {
        const result = await handleGetAiRep(session);
        return json({ rep: result.rep, contexts: result.contexts });
      } catch (e) { return json({ error: String(e) }, 500); }
    }

    if (path === "/api/ai-rep" && req.method === "POST") {
      if (!session) return json({ error: "Unauthorized" }, 401);
      try {
        const b = await req.json();
        const result = await handlePostAiRep(session, b);
        if (result.status !== 200) return json({ error: result.error }, result.status);
        return json({ repId: result.repId });
      } catch (e) { return json({ error: String(e) }, 500); }
    }

    if (path === "/api/ai-rep" && req.method === "DELETE") {
      if (!session) return json({ error: "Unauthorized" }, 401);
      try {
        const result = await handleDeleteAiRep(session);
        return json({ ok: true });
      } catch (e) { return json({ error: String(e) }, 500); }
    }

    if (path === "/api/ai-rep/context" && req.method === "POST") {
      if (!session) return json({ error: "Unauthorized" }, 401);
      try {
        const b = await req.json();
        const result = await handlePostAiRepContext(session, b);
        if (result.status !== 200) return json({ error: result.error }, result.status);
        return json({ contextId: result.contextId });
      } catch (e) { return json({ error: String(e) }, 500); }
    }

    const aiRepContextDeleteMatch = path.match(/^\/api\/ai-rep\/context\/([^/]+)$/);
    if (aiRepContextDeleteMatch && req.method === "DELETE") {
      if (!session) return json({ error: "Unauthorized" }, 401);
      const contextId = decodeURIComponent(aiRepContextDeleteMatch[1]);
      try {
        await handleDeleteAiRepContext(session, contextId);
        return json({ ok: true });
      } catch (e) { return json({ error: String(e) }, 500); }
    }

    if (path === "/api/ai-rep/deploy" && req.method === "POST") {
      if (!session) return json({ error: "Unauthorized" }, 401);
      try {
        const b = await req.json() as { meetingId?: string };
        const meetingId = (b.meetingId || "").trim();
        if (!meetingId) return json({ error: "meetingId required" }, 400);
        const result = await handleDeployAiRep(session, meetingId);
        if (result.status !== 200) return json({ error: result.error }, result.status);
        return json({ workflowId: result.workflowId });
      } catch (e) { return json({ error: String(e) }, 500); }
    }

    if (path === "/api/debriefs" && req.method === "GET") {
      if (!session) return json({ error: "Unauthorized" }, 401);
      try {
        const result = await handleGetDebriefs(session);
        return json({ debriefs: result.debriefs });
      } catch (e) { return json({ error: String(e) }, 500); }
    }

    const debriefGetMatch = path.match(/^\/api\/debriefs\/([^/]+)$/);
    if (debriefGetMatch && req.method === "GET") {
      if (!session) return json({ error: "Unauthorized" }, 401);
      const debriefId = decodeURIComponent(debriefGetMatch[1]);
      try {
        const result = await handleGetDebrief(session, debriefId);
        if (result.status !== 200) return json({ error: result.error }, result.status);
        return json({ debrief: result.debrief });
      } catch (e) { return json({ error: String(e) }, 500); }
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
          micDefault?: string; camDefault?: string; privacy?: string;
        };
        const nodeId  = generateId(b.label);
        const now     = Date.now();
        const privacy = b.privacy === "private" ? "private" : "public";
        await runQuery(
          "MATCH (parent:Meeting {id: $parentId}) " +
          "CREATE (child:Meeting { id: $nodeId, label: $label, adminName: $admin, status: 'active', " +
          "privacy: $privacy, micDefault: $mic, camDefault: $cam, createdAt: $now }) " +
          "CREATE (parent)-[:HAS_CHILD]->(child)",
          { parentId: b.parentId, nodeId, label: b.label,
            admin: b.adminName || "Admin", privacy,
            mic: b.micDefault || "allow", cam: b.camDefault || "allow", now }
        );
        return json({ ok: true, node: { id: nodeId, label: b.label, parentId: b.parentId,
          adminName: b.adminName || "Admin", participants: 0, status: "active", privacy,
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

    // PATCH /api/meetings/:id/privacy — admin changes privacy mid-meeting
    const privacyPatchMatch = path.match(/^\/api\/meetings\/([^/]+)\/privacy$/);
    if (privacyPatchMatch && req.method === "PATCH") {
      if (!session) return json({ error: "Unauthorized" }, 401);
      const mid = decodeURIComponent(privacyPatchMatch[1]);
      try {
        const b = await req.json() as { privacy?: string };
        const newPrivacy = b.privacy === "private" ? "private" : "public";
        // Only the meeting creator can change this
        const cr = await runQuery(
          "MATCH (u:User {email: $email})-[:CREATED]->(m:Meeting {id: $mid}) RETURN u.email AS e",
          { email: session.email, mid }
        );
        if (!cr.length) return json({ error: "Forbidden" }, 403);
        await runQuery(
          "MATCH (m:Meeting {id: $mid}) SET m.privacy = $privacy",
          { mid, privacy: newPrivacy }
        );
        // Switching to public → auto-admit everyone currently waiting so they're not stuck
        if (newPrivacy === "public") {
          const users = waitingRooms.get(mid);
          if (users) users.forEach(u => { if (u.status === "waiting") u.status = "admitted"; });
        }
        return json({ ok: true, privacy: newPrivacy });
      } catch (e) { return json({ error: String(e) }, 500); }
    }

    // ── Waiting room APIs ─────────────────────────────────────────────────────

    // POST /api/meetings/:id/knock — non-creator user requests entry to private meeting
    const knockMatch2 = path.match(/^\/api\/meetings\/([^/]+)\/knock$/);
    if (knockMatch2 && req.method === "POST") {
      if (!session) return json({ error: "Unauthorized" }, 401);
      const mid = decodeURIComponent(knockMatch2[1]);
      try {
        const mr = await runQuery(
          "MATCH (m:Meeting {id: $mid}) RETURN m.privacy AS privacy", { mid }
        );
        if (!mr.length) return json({ error: "Meeting not found" }, 404);
        if ((mr[0].get("privacy") as string) !== "private")
          return json({ error: "Meeting is public — join directly" }, 400);

        if (!waitingRooms.has(mid)) waitingRooms.set(mid, new Map());
        const users = waitingRooms.get(mid)!;

        // If already in the map, return existing entry (unless rejected — allow re-knock)
        for (const [wid, u] of users.entries()) {
          if (u.email === session.email) {
            if (u.status === "rejected") { users.delete(wid); break; }
            return json({ waitingId: wid, status: u.status });
          }
        }

        const waitingId = "w-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
        users.set(waitingId, {
          waitingId, name: session.name, email: session.email,
          knockedAt: Date.now(), status: "waiting",
        });
        return json({ waitingId, status: "waiting" });
      } catch (e) { return json({ error: String(e) }, 500); }
    }

    // GET /api/meetings/:id/knock-status/:waitingId — waiting user polls their status
    const knockStatusMatch2 = path.match(/^\/api\/meetings\/([^/]+)\/knock-status\/([^/]+)$/);
    if (knockStatusMatch2 && req.method === "GET") {
      if (!session) return json({ error: "Unauthorized" }, 401);
      const mid = decodeURIComponent(knockStatusMatch2[1]);
      const wid = decodeURIComponent(knockStatusMatch2[2]);
      const users = waitingRooms.get(mid);
      const entry = users?.get(wid);
      if (!entry) return json({ status: "expired" });
      if (entry.email !== session.email) return json({ error: "Unauthorized" }, 403);
      return json({ status: entry.status });
    }

    // GET /api/meetings/:id/waiting — admin polls list of waiting users
    const waitingListMatch2 = path.match(/^\/api\/meetings\/([^/]+)\/waiting$/);
    if (waitingListMatch2 && req.method === "GET") {
      if (!session) return json({ error: "Unauthorized" }, 401);
      const mid = decodeURIComponent(waitingListMatch2[1]);
      try {
        const cr = await runQuery(
          "MATCH (u:User {email: $email})-[:CREATED]->(m:Meeting {id: $mid}) RETURN u.email AS e",
          { email: session.email, mid }
        );
        if (!cr.length) return json({ error: "Forbidden" }, 403);
        const users = waitingRooms.get(mid);
        const waiting = users
          ? Array.from(users.values()).filter(u => u.status === "waiting")
          : [];
        return json(waiting.map(u => ({
          waitingId: u.waitingId, name: u.name, knockedAt: u.knockedAt,
        })));
      } catch (e) { return json({ error: String(e) }, 500); }
    }

    // POST /api/meetings/:id/admit/:waitingId — admin admits a waiting user
    const admitMatch2 = path.match(/^\/api\/meetings\/([^/]+)\/admit\/([^/]+)$/);
    if (admitMatch2 && req.method === "POST") {
      if (!session) return json({ error: "Unauthorized" }, 401);
      const mid = decodeURIComponent(admitMatch2[1]);
      const wid = decodeURIComponent(admitMatch2[2]);
      try {
        const cr = await runQuery(
          "MATCH (u:User {email: $email})-[:CREATED]->(m:Meeting {id: $mid}) RETURN u.email AS e",
          { email: session.email, mid }
        );
        if (!cr.length) return json({ error: "Forbidden" }, 403);
        const users = waitingRooms.get(mid);
        const entry = users?.get(wid);
        if (!entry) return json({ error: "Not found" }, 404);
        entry.status = "admitted";
        return json({ ok: true });
      } catch (e) { return json({ error: String(e) }, 500); }
    }

    // POST /api/meetings/:id/reject/:waitingId — admin rejects a waiting user
    const rejectMatch2 = path.match(/^\/api\/meetings\/([^/]+)\/reject\/([^/]+)$/);
    if (rejectMatch2 && req.method === "POST") {
      if (!session) return json({ error: "Unauthorized" }, 401);
      const mid = decodeURIComponent(rejectMatch2[1]);
      const wid = decodeURIComponent(rejectMatch2[2]);
      try {
        const cr = await runQuery(
          "MATCH (u:User {email: $email})-[:CREATED]->(m:Meeting {id: $mid}) RETURN u.email AS e",
          { email: session.email, mid }
        );
        if (!cr.length) return json({ error: "Forbidden" }, 403);
        const users = waitingRooms.get(mid);
        const entry = users?.get(wid);
        if (!entry) return json({ error: "Not found" }, 404);
        entry.status = "rejected";
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
