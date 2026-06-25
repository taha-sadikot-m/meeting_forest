// src/auth.ts — Authentication utilities
// Password hashing uses Bun.password (bcrypt, built-in).
// Sessions are in-memory (Map). Emails via Resend.
//
// Required .env vars:
//   RESEND_API_KEY=re_xxxxxxxxxxxx
//   RESEND_EMAIL_ADDRESS=noreply@yourdomain.com
//   APP_URL=http://localhost:3000  (optional, defaults to localhost:3000)

import { randomBytes } from "crypto";
import { Resend } from "resend";

// ── Session store ─────────────────────────────────────────────────────────────

export interface SessionData {
  userId: string;   // user's email (unique identifier)
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

// ── Cookie helpers ────────────────────────────────────────────────────────────

export function getSessionCookie(req: Request): string | undefined {
  return req.headers.get("cookie")?.match(/(?:^|;\s*)mf_session=([^;]+)/)?.[1];
}

export function setSessionCookie(token: string): string {
  return `mf_session=${token}; HttpOnly; SameSite=Lax; Max-Age=604800; Path=/`;
}

export function clearSessionCookie(): string {
  return `mf_session=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/`;
}

// ── Token generation ──────────────────────────────────────────────────────────

export function generateSecureToken(): string {
  return randomBytes(32).toString("hex");
}

// ── Password hashing (Bun built-in bcrypt) ────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, { algorithm: "bcrypt", cost: 10 });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return Bun.password.verify(password, hash);
}

// ── Email (Resend) ────────────────────────────────────────────────────────────

const APP_URL    = process.env.APP_URL || `http://localhost:${process.env.PORT || "3000"}`;
const FROM_EMAIL = process.env.RESEND_EMAIL_ADDRESS || "noreply@meetingforest.app";
const DEV_MODE   = !process.env.RESEND_API_KEY;

const resend = DEV_MODE ? null : new Resend(process.env.RESEND_API_KEY);

async function sendEmail(to: string, subject: string, html: string) {
  if (DEV_MODE || !resend) {
    // Dev fallback: log link to console so you can click it manually
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

export async function sendVerificationEmail(email: string, name: string, token: string) {
  const link = `${APP_URL}/verify-email?token=${token}`;
  await sendEmail(email, "Verify your Meeting Forest account", emailBase(`
    <h2 style="font-size:22px;font-weight:700;margin:0 0 8px">Verify your email</h2>
    <p style="color:#6B7280;font-size:14px;line-height:1.6;margin:0 0 24px">
      Hi ${name}, thanks for signing up! Click below to verify your email address and activate your account.
    </p>
    <a href="${link}" style="display:inline-block;background:#D15000;color:white;text-decoration:none;
       padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px">
      Verify Email Address
    </a>
    <p style="font-size:12px;color:#9CA3AF;margin-top:16px">
      Link expires in <strong>24 hours</strong>.
      Can't click? Copy: <a href="${link}" style="color:#D15000">${link}</a>
    </p>`));
}

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

export async function sendResetEmail(email: string, name: string, token: string) {
  const link = `${APP_URL}/reset-password?token=${token}`;
  await sendEmail(email, "Reset your Meeting Forest password", emailBase(`
    <h2 style="font-size:22px;font-weight:700;margin:0 0 8px">Reset your password</h2>
    <p style="color:#6B7280;font-size:14px;line-height:1.6;margin:0 0 24px">
      Hi ${name}, we received a request to reset your password. Click below to set a new one.
    </p>
    <a href="${link}" style="display:inline-block;background:#D15000;color:white;text-decoration:none;
       padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px">
      Reset Password
    </a>
    <p style="font-size:12px;color:#9CA3AF;margin-top:16px">
      Link expires in <strong>1 hour</strong>.
      Can't click? Copy: <a href="${link}" style="color:#D15000">${link}</a>
    </p>`));
}
