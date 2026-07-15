// src/admin-auth.ts — Platform admin sessions (env credentials, separate from user auth)
import { randomBytes, timingSafeEqual } from "crypto";
import { config } from "./config";

export interface AdminSessionData {
  email: string;
  expiresAt: number;
}

const adminSessions = new Map<string, AdminSessionData>();

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;
const loginAttempts = new Map<string, { count: number; windowStart: number }>();

export function createAdminSession(email: string): string {
  const token = randomBytes(32).toString("hex");
  adminSessions.set(token, {
    email,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });
  return token;
}

export function getAdminSession(token: string | undefined): AdminSessionData | null {
  if (!token) return null;
  const s = adminSessions.get(token);
  if (!s) return null;
  if (Date.now() > s.expiresAt) {
    adminSessions.delete(token);
    return null;
  }
  return s;
}

export function destroyAdminSession(token: string) {
  adminSessions.delete(token);
}

export function getAdminSessionCookie(req: Request): string | undefined {
  return req.headers.get("cookie")?.match(/(?:^|;\s*)mf_admin_session=([^;]+)/)?.[1];
}

export function setAdminSessionCookie(token: string): string {
  return `mf_admin_session=${token}; HttpOnly; SameSite=Lax; Max-Age=604800; Path=/`;
}

export function clearAdminSessionCookie(): string {
  return `mf_admin_session=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/`;
}

export function requireAdmin(req: Request): AdminSessionData | null {
  return getAdminSession(getAdminSessionCookie(req));
}

function safeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    // Still run a compare to reduce timing skew on length mismatch
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export function isAdminLoginConfigured(): boolean {
  return Boolean(config.admin.email.trim() && config.admin.password);
}

/** Returns true if this IP is currently rate-limited. */
export function isAdminLoginRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry) return false;
  if (now - entry.windowStart > LOGIN_WINDOW_MS) {
    loginAttempts.delete(ip);
    return false;
  }
  return entry.count >= LOGIN_MAX_ATTEMPTS;
}

export function recordAdminLoginAttempt(ip: string) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now - entry.windowStart > LOGIN_WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, windowStart: now });
    return;
  }
  entry.count += 1;
}

export function clearAdminLoginAttempts(ip: string) {
  loginAttempts.delete(ip);
}

export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Validate env admin credentials. Returns session email on success, null otherwise.
 * Always fails if ADMIN_EMAIL / ADMIN_PASSWORD are unset.
 */
export function verifyAdminCredentials(email: string, password: string): string | null {
  if (!isAdminLoginConfigured()) return null;
  const expectedEmail = config.admin.email.trim().toLowerCase();
  const givenEmail = email.trim().toLowerCase();
  const emailOk = safeEqualString(givenEmail, expectedEmail);
  const passwordOk = safeEqualString(password, config.admin.password);
  if (!emailOk || !passwordOk) return null;
  return expectedEmail;
}
