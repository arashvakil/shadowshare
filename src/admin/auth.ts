import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import type { Context, Next } from "hono";
import { config } from "../config.js";
import { getNumber } from "../settings.js";

const COOKIE_NAME = "admin_session";

// In-memory brute-force tracking with progressive lockout (never persisted)
const attempts = new Map<string, { count: number; windowStart: number; banCount: number; banUntil: number }>();

// Security event log (capped ring buffer)
const MAX_SECURITY_EVENTS = 200;
interface SecurityEvent {
  type: "failed_login" | "rate_limited" | "successful_login";
  ip: string;
  timestamp: number;
}
const securityEvents: SecurityEvent[] = [];

function addSecurityEvent(event: SecurityEvent) {
  securityEvents.push(event);
  if (securityEvents.length > MAX_SECURITY_EVENTS) {
    securityEvents.shift();
  }
}

export function getSecurityStats() {
  const now = Date.now();
  const windowMs = getNumber("bot.rateLimitWindowMins") * 60 * 1000;

  // Collect currently blocked IPs
  const blockedIps: Array<{ ip: string; attempts: number; banUntil: number; banCount: number }> = [];
  const activeAttempts: Array<{ ip: string; attempts: number; windowStart: number }> = [];

  for (const [ip, entry] of attempts) {
    if (entry.banUntil > now) {
      blockedIps.push({ ip, attempts: entry.count, banUntil: entry.banUntil, banCount: entry.banCount });
    } else if (now - entry.windowStart <= windowMs && entry.count > 0) {
      activeAttempts.push({ ip, attempts: entry.count, windowStart: entry.windowStart });
    }
  }

  // Recent events (last 24h)
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const recentEvents = securityEvents.filter((e) => e.timestamp > dayAgo);

  const failedLast24h = recentEvents.filter((e) => e.type === "failed_login").length;
  const blockedLast24h = recentEvents.filter((e) => e.type === "rate_limited").length;
  const successLast24h = recentEvents.filter((e) => e.type === "successful_login").length;

  // Unique IPs that attempted login
  const uniqueIps = new Set(recentEvents.filter((e) => e.type === "failed_login").map((e) => e.ip)).size;

  return {
    blockedIps: blockedIps.sort((a, b) => b.banUntil - a.banUntil),
    activeAttempts: activeAttempts.sort((a, b) => b.attempts - a.attempts),
    recentEvents: recentEvents.reverse().slice(0, 50),
    stats: {
      failedLast24h,
      blockedLast24h,
      successLast24h,
      uniqueAttackerIps: uniqueIps,
      currentlyBlocked: blockedIps.length,
    },
    config: {
      windowMins: getNumber("bot.rateLimitWindowMins"),
      maxAttempts: getNumber("bot.rateLimitAttempts"),
      progressiveLockout: true,
      maxBanHours: 24,
    },
  };
}

function getSecret(): string {
  return config.adminSessionSecret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

// Derive CSRF token deterministically from nonce so it survives restarts
function deriveCsrfToken(nonce: string): string {
  return createHmac("sha256", getSecret()).update(`csrf:${nonce}`).digest("hex");
}

export function verifyPassword(input: string): boolean {
  const expected = Buffer.from(config.adminPassword);
  const actual = Buffer.from(input);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = getNumber("bot.rateLimitWindowMins") * 60 * 1000;
  const maxAttempts = getNumber("bot.rateLimitAttempts");
  const entry = attempts.get(ip);

  // Check if IP is currently banned (progressive lockout)
  if (entry && entry.banUntil > now) {
    addSecurityEvent({ type: "rate_limited", ip, timestamp: now });
    console.warn(`[SECURITY] Blocked login from banned IP: ${ip} (ban ${entry.banCount}, until ${new Date(entry.banUntil).toISOString()})`);
    return false;
  }

  if (!entry || now - entry.windowStart > windowMs) {
    attempts.set(ip, { count: 1, windowStart: now, banCount: entry?.banCount || 0, banUntil: 0 });
    return true;
  }
  entry.count++;
  if (entry.count > maxAttempts) {
    // Progressive ban: 15min, 30min, 1h, 2h, 4h, 8h, 16h, 24h (max)
    entry.banCount++;
    const baseBanMs = 15 * 60 * 1000; // 15 minutes
    const maxBanMs = 24 * 60 * 60 * 1000; // 24 hours
    const banMs = Math.min(baseBanMs * Math.pow(2, entry.banCount - 1), maxBanMs);
    entry.banUntil = now + banMs;
    addSecurityEvent({ type: "rate_limited", ip, timestamp: now });
    console.warn(`[SECURITY] Rate limit exceeded for IP: ${ip} — banned for ${Math.round(banMs / 60000)}min (ban #${entry.banCount})`);
  }
  return entry.count <= maxAttempts;
}

export function logFailedLogin(ip: string): void {
  addSecurityEvent({ type: "failed_login", ip, timestamp: Date.now() });
  console.warn(`[SECURITY] Failed login attempt from IP: ${ip}`);
}

export function logSuccessfulLogin(ip: string): void {
  addSecurityEvent({ type: "successful_login", ip, timestamp: Date.now() });
  console.log(`[SECURITY] Successful login from IP: ${ip}`);
}

export function createSessionCookie(): { cookie: string; csrfToken: string } {
  const sessionTtlMs = getNumber("bot.sessionTtlHrs") * 60 * 60 * 1000;
  const nonce = randomBytes(16).toString("hex");
  const payload = Buffer.from(
    JSON.stringify({ exp: Date.now() + sessionTtlMs, nonce }),
  ).toString("base64url");
  const sig = sign(payload);
  const csrfToken = deriveCsrfToken(nonce);
  const cookie = `${COOKIE_NAME}=${payload}.${sig}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${sessionTtlMs / 1000}`;
  return { cookie, csrfToken };
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

function extractSessionNonce(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match) return null;
  const [payload, sig] = match[1].split(".");
  if (!payload || !sig) return null;
  const expectedSig = sign(payload);
  if (sig.length !== expectedSig.length) return null;
  if (!timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expectedSig, "hex"))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof data.exp !== "number" || data.exp <= Date.now()) return null;
    return data.nonce || null;
  } catch {
    return null;
  }
}

function verifySession(cookieHeader: string | undefined): boolean {
  return extractSessionNonce(cookieHeader) !== null;
}

export async function authMiddleware(c: Context, next: Next) {
  const cookie = c.req.header("cookie");
  if (!verifySession(cookie)) {
    return c.json({ error: "unauthorized" }, 401);
  }
  await next();
}

export async function csrfMiddleware(c: Context, next: Next) {
  const method = c.req.method;
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    await next();
    return;
  }

  const cookie = c.req.header("cookie");
  const nonce = extractSessionNonce(cookie);
  if (!nonce) {
    return c.json({ error: "unauthorized" }, 401);
  }

  const expectedToken = deriveCsrfToken(nonce);
  const providedToken = c.req.header("x-csrf-token");
  if (!providedToken || providedToken.length !== expectedToken.length ||
      !timingSafeEqual(Buffer.from(providedToken), Buffer.from(expectedToken))) {
    return c.json({ error: "csrf_invalid" }, 403);
  }

  await next();
}

export function getCsrfTokenForSession(cookieHeader: string | undefined): string | null {
  const nonce = extractSessionNonce(cookieHeader);
  if (!nonce) return null;
  return deriveCsrfToken(nonce);
}
