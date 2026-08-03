// src/auth.ts — Session cookies + product emails (Resend).
// User signup / login / password reset are handled by AWS Cognito (see src/cognito.ts).
//
// Auth emails (verification, password reset) → Cognito
// Product emails (meeting invite, debrief, platform invite) → Resend
//
// Required .env vars for product email:
//   RESEND_API_KEY=re_xxxxxxxxxxxx
//   RESEND_EMAIL_ADDRESS=noreply@yourdomain.com
//   APP_URL=http://localhost:3000  (optional)

import { randomBytes } from "crypto";
import { Resend } from "resend";

// ── Session store ─────────────────────────────────────────────────────────────

export interface SessionData {
  userId: string;
  name: string;
  email: string;
  expiresAt: number;
}

const sessions = new Map<string, SessionData>();

export function createSession(userId: string, name: string, email: string): string {
  const token = randomBytes(32).toString("hex");
  sessions.set(token, {
    userId, name, email,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  return token;
}

export function getSession(token: string | undefined): SessionData | null {
  if (!token) return null;
  const s = sessions.get(token);
  if (!s) return null;
  if (Date.now() > s.expiresAt) { sessions.delete(token); return null; }
  return s;
}

export function destroySession(token: string) {
  sessions.delete(token);
}

export function updateSessionName(token: string, name: string): void {
  const s = sessions.get(token);
  if (s) s.name = name;
}

// ── Cookie helpers ────────────────────────────────────────────────────────────

export function getSessionCookie(req: Request): string | undefined {
  return req.headers.get("cookie")?.match(/(?:^|;\s*)mf_session=([^;]+)/)?.[1];
}

/** Session token from Authorization Bearer (MCP / agents) or mf_session cookie. */
export function getRequestSessionToken(req: Request): string | undefined {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (auth) {
    const match = auth.match(/^Bearer\s+(.+)$/i);
    if (match?.[1]?.trim()) return match[1].trim();
  }
  return getSessionCookie(req);
}

export function setSessionCookie(token: string): string {
  return `mf_session=${token}; HttpOnly; SameSite=Lax; Max-Age=604800; Path=/`;
}

export function clearSessionCookie(): string {
  return `mf_session=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/`;
}

// ── Email (Resend) — product mail only ────────────────────────────────────────

const APP_URL    = process.env.APP_URL || `http://localhost:${process.env.PORT || "3000"}`;
const FROM_EMAIL = process.env.RESEND_EMAIL_ADDRESS || "noreply@meetingforest.app";
const DEV_MODE   = !process.env.RESEND_API_KEY;

const resend = DEV_MODE ? null : new Resend(process.env.RESEND_API_KEY);

async function sendEmail(to: string, subject: string, html: string) {
  if (DEV_MODE || !resend) {
    const linkMatch = html.match(/href="([^"]+)"/);
    console.log(`\n[EMAIL → ${to}]`);
    console.log(`Subject: ${subject}`);
    if (linkMatch) console.log(`Link: ${linkMatch[1]}`);
    console.log();
    return;
  }

  const { error } = await resend.emails.send({
    from: `Meeting Forest <${FROM_EMAIL}>`,
    to,
    subject,
    html,
  });

  if (error) {
    console.error("[Resend] Failed to send email:", error);
    throw new Error(`Email send failed: ${error.message}`);
  }
}

const emailBase = (body: string) => `
  <div style="font-family:Inter,system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#111827">
    <div style="margin-bottom:28px">
      <span style="font-size:20px;font-weight:800;color:#D15000">🌲 Meeting Forest</span>
    </div>
    ${body}
    <hr style="border:none;border-top:1px solid #F3F4F6;margin:28px 0"/>
    <p style="font-size:12px;color:#9CA3AF">
      If you didn't request this email, you can safely ignore it.
    </p>
  </div>`;

export async function sendMeetingInviteEmail(
  email: string, inviterName: string, meetingLabel: string, meetingLink: string
) {
  await sendEmail(email, `${inviterName} invited you to a Meeting Forest room`, emailBase(`
    <h2 style="font-size:22px;font-weight:700;margin:0 0 8px">You're invited to a meeting</h2>
    <p style="color:#6B7280;font-size:14px;line-height:1.6;margin:0 0 24px">
      <strong>${inviterName}</strong> has invited you to join <strong>"${meetingLabel}"</strong> on Meeting Forest.
      Click below to enter the room.
    </p>
    <a href="${meetingLink}" style="display:inline-block;background:#D15000;color:white;text-decoration:none;
       padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px">
      Join Meeting
    </a>
    <p style="font-size:12px;color:#9CA3AF;margin-top:16px">
      Can't click? Copy: <a href="${meetingLink}" style="color:#D15000">${meetingLink}</a>
    </p>`));
}

export async function sendDebriefEmail(
  email: string,
  meetingLabel: string,
  summary: string,
  debriefUrl: string
) {
  await sendEmail(email, `Meeting debrief: ${meetingLabel}`, emailBase(`
    <h2 style="font-size:22px;font-weight:700;margin:0 0 8px">Your Assistant debrief is ready</h2>
    <p style="color:#6B7280;font-size:14px;line-height:1.6;margin:0 0 16px">
      Your Assistant attended <strong>"${meetingLabel}"</strong> on your behalf.
    </p>
    <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 24px;background:#F9FAFB;padding:16px;border-radius:10px">
      ${summary}
    </p>
    <a href="${debriefUrl}" style="display:inline-block;background:#D15000;color:white;text-decoration:none;
       padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px">
      View Full Debrief
    </a>
    <p style="font-size:12px;color:#9CA3AF;margin-top:16px">
      Can't click? Copy: <a href="${debriefUrl}" style="color:#D15000">${debriefUrl}</a>
    </p>`));
}

export async function sendPlatformInviteEmail(email: string, inviterName: string) {
  const link = `${APP_URL}/register?email=${encodeURIComponent(email)}`;
  await sendEmail(email, `${inviterName} invited you to Meeting Forest`, emailBase(`
    <h2 style="font-size:22px;font-weight:700;margin:0 0 8px">You're invited to Meeting Forest</h2>
    <p style="color:#6B7280;font-size:14px;line-height:1.6;margin:0 0 24px">
      <strong>${inviterName}</strong> wants to chat with you on Meeting Forest — a video and messaging platform for teams.
      Create your free account to start messaging.
    </p>
    <a href="${link}" style="display:inline-block;background:#D15000;color:white;text-decoration:none;
       padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px">
      Join Meeting Forest
    </a>
    <p style="font-size:12px;color:#9CA3AF;margin-top:16px">
      Can't click? Copy: <a href="${link}" style="color:#D15000">${link}</a>
    </p>`));
}
