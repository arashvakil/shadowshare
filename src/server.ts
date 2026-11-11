import { initSettings, getBoolean } from "./settings.js";
import { config } from "./config.js";
import { eq, and, isNull, or } from "drizzle-orm";
import { db } from "./db/index.js";
import { users } from "./db/schema.js";

// Initialize settings from DB, then start everything
await initSettings();

// Sync sing-box config on startup (if configured)
import { singbox } from "./singbox/instance.js";
if (singbox) {
  // Backfill any missing sing-box credentials for active users
  try {
    const needsBackfill = await db
      .select({
        id: users.id,
        shadowTlsUsername: users.shadowTlsUsername,
        hysteria2Password: users.hysteria2Password,
        tuicUuid: users.tuicUuid,
        trojanPassword: users.trojanPassword,
      })
      .from(users)
      .where(
        and(
          eq(users.isActive, true),
          or(
            isNull(users.shadowTlsUsername),
            isNull(users.hysteria2Password),
            isNull(users.tuicUuid),
            isNull(users.trojanPassword),
          ),
        ),
      );

    if (needsBackfill.length > 0) {
      console.log(`[backfill] Filling missing sing-box credentials for ${needsBackfill.length} users`);
      for (const user of needsBackfill) {
        const updates: Record<string, string> = {};
        if (!user.shadowTlsUsername) {
          const creds = singbox.generateCredentials();
          updates.shadowTlsUsername = creds.username;
          updates.shadowTlsPassword = creds.password;
          updates.shadowTlsSsPassword = creds.ssPassword;
        }
        if (!user.hysteria2Password) {
          updates.hysteria2Password = singbox.generateHysteria2Password();
        }
        if (!user.tuicUuid) {
          const creds = singbox.generateTuicCredentials();
          updates.tuicUuid = creds.uuid;
          updates.tuicPassword = creds.password;
        }
        if (!user.trojanPassword) {
          updates.trojanPassword = singbox.generateTrojanPassword();
        }
        await db.update(users).set(updates).where(eq(users.id, user.id));
      }
      console.log(`[backfill] Done — ${needsBackfill.length} users updated`);
    }
  } catch (err) {
    console.error("[backfill] Failed to backfill sing-box credentials:", err);
  }

  // Backfill missing dnstt SOCKS5 credentials for active users
  if (config.dnsttTunnelDomain) {
    try {
      const needsDnstt = await db
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.isActive, true),
            isNull(users.dnsttSocksUsername),
          ),
        );

      if (needsDnstt.length > 0) {
        console.log(`[backfill] Filling missing dnstt credentials for ${needsDnstt.length} users`);
        for (const user of needsDnstt) {
          const creds = singbox.generateDnsttCredentials();
          await db
            .update(users)
            .set({
              dnsttSocksUsername: creds.username,
              dnsttSocksPassword: creds.password,
            })
            .where(eq(users.id, user.id));
        }
        console.log(`[backfill] dnstt backfill done`);
      }
    } catch (err) {
      console.error("[backfill] Failed to backfill dnstt credentials:", err);
    }
  }

  singbox.syncConfig().catch((err) => console.error("sing-box config sync failed:", err));
}

// Initialize AmneziaWG (generate server keys, write config with active peers)
import { amneziaWg } from "./amneziawg/instance.js";
if (amneziaWg) {
  amneziaWg.init().catch((err) => console.error("[awg] init failed:", err));
}

// Backfill missing webTokens for active users (admin-created users may lack them)
import { randomBytes } from "crypto";
try {
  const missingTokens = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.isActive, true), isNull(users.webToken)));

  if (missingTokens.length > 0) {
    console.log(`[backfill] Generating webTokens for ${missingTokens.length} users`);
    for (const user of missingTokens) {
      await db
        .update(users)
        .set({ webToken: randomBytes(32).toString("hex") })
        .where(eq(users.id, user.id));
    }
    console.log(`[backfill] webToken backfill done`);
  }
} catch (err) {
  console.error("[backfill] Failed to backfill webTokens:", err);
}

// API server (serves web app + REST API)
import { startApiServer } from "./api/index.js";
startApiServer();

// Telegram bot (optional — runs alongside web app if BOT_TOKEN is set)
if (config.botToken) {
  import("./bot/index.js").catch((err) => {
    console.error("Failed to start Telegram bot:", err);
  });
}

// Periodic usage snapshots
import { startUsageSnapshots } from "./jobs/snapshot-usage.js";
startUsageSnapshots();

// Connectivity monitoring
import { startConnectivityPolling } from "./jobs/poll-connectivity.js";
startConnectivityPolling();

// DNS resolver scanner (finds working Iranian resolvers for DNS tunnel)
import { startDnsResolverScanner } from "./jobs/scan-dns-resolvers.js";
startDnsResolverScanner();

// MasterDNS usage history (5-min snapshots, 30-day retention)
import { startMasterdnsSnapshots } from "./jobs/snapshot-masterdns.js";
startMasterdnsSnapshots();

// Start admin panel if configured
if (config.adminPassword) {
  if (config.adminPassword.length < 12) {
    console.error("[FATAL] ADMIN_PASSWORD must be at least 12 characters");
    process.exit(1);
  }
  import("./admin/index.js").then(({ startAdminServer }) => {
    startAdminServer();
  });
}
