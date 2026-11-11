import { marzban } from "../marzban/instance.js";
import { amneziaWg } from "../amneziawg/instance.js";
import { naiveProxy } from "../naiveproxy/instance.js";
import { singbox } from "../singbox/instance.js";
import { sshTunnel } from "../ssh-tunnel/instance.js";
import { mieru } from "../mieru/instance.js";
import { getBoolean } from "../settings.js";
import { config } from "../config.js";
import { generateOvpnCloakConfig, isOvpnCloakAvailable } from "../openvpn-cloak/config-generator.js";

export interface ProvisionResult {
  marzbanUsername: string | null;
  marzbanSubUrl: string | null;
  amneziaWgPeerId: string | null;
  amneziaWgConfig: string | null;
  ovpnCloakConfig: string | null;
  naiveUsername: string | null;
  naivePassword: string | null;
  shadowTlsUsername: string | null;
  shadowTlsPassword: string | null;
  shadowTlsSsPassword: string | null;
  hysteria2Password: string | null;
  tuicUuid: string | null;
  tuicPassword: string | null;
  trojanPassword: string | null;
  dnsttSocksUsername: string | null;
  dnsttSocksPassword: string | null;
  sshPublicKey: string | null;
  sshPrivateKey: string | null;
  mieruUsername: string | null;
  mieruPassword: string | null;
}

/**
 * Provision VPN keys on all available providers in parallel.
 * At least one provider must succeed; partial success is OK.
 */
export async function provisionUser(keyName: string): Promise<ProvisionResult> {
  const result: ProvisionResult = {
    marzbanUsername: null,
    marzbanSubUrl: null,
    amneziaWgPeerId: null,
    amneziaWgConfig: null,
    ovpnCloakConfig: null,
    naiveUsername: null,
    naivePassword: null,
    shadowTlsUsername: null,
    shadowTlsPassword: null,
    shadowTlsSsPassword: null,
    hysteria2Password: null,
    tuicUuid: null,
    tuicPassword: null,
    trojanPassword: null,
    dnsttSocksUsername: null,
    dnsttSocksPassword: null,
    sshPublicKey: null,
    sshPrivateKey: null,
    mieruUsername: null,
    mieruPassword: null,
  };

  const tasks: Promise<void>[] = [];

  if (marzban && getBoolean("feature.marzban")) {
    // Marzban usernames must be alphanumeric + underscore
    const marzbanUser = keyName.replace(/[^a-zA-Z0-9_]/g, "_");
    tasks.push(
      marzban
        .createUser(marzbanUser)
        .then((user) => {
          result.marzbanUsername = user.username;
          // Ensure subscription URL is absolute (Marzban may return relative path)
          let subUrl = user.subscription_url;
          if (subUrl && subUrl.startsWith("/") && config.marzbanSubUrlBase) {
            subUrl = config.marzbanSubUrlBase.replace(/\/$/, "") + subUrl;
          }
          // Use less predictable path prefix for new users
          if (subUrl) {
            subUrl = subUrl.replace("/sub/", "/r/");
          }
          result.marzbanSubUrl = subUrl;
        })
        .catch((err) => {
          console.error("[provider] Marzban user creation failed:", err);
        }),
    );
  }

  if (amneziaWg && getBoolean("feature.amneziaWg")) {
    tasks.push(
      amneziaWg
        .createPeer(keyName)
        .then((res) => {
          result.amneziaWgPeerId = res.client.id;
          result.amneziaWgConfig = res.config;
        })
        .catch((err) => {
          console.error("[provider] AmneziaWG peer creation failed:", err);
        }),
    );
  }

  if (config.openvpnCloakEnabled && getBoolean("feature.openvpnCloak") && isOvpnCloakAvailable()) {
    try {
      const ovpnConfig = generateOvpnCloakConfig();
      if (ovpnConfig) {
        result.ovpnCloakConfig = ovpnConfig;
      }
    } catch (err) {
      console.error("[provider] OpenVPN+Cloak config generation failed:", err);
    }
  }

  if (naiveProxy && getBoolean("feature.naiveProxy")) {
    tasks.push(
      (async () => {
        try {
          const creds = naiveProxy.generateCredentials();
          result.naiveUsername = creds.username;
          result.naivePassword = creds.password;
        } catch (err) {
          console.error("[provider] NaiveProxy credential generation failed:", err);
        }
      })(),
    );
  }

  if (singbox && getBoolean("feature.shadowTls")) {
    tasks.push(
      (async () => {
        try {
          const creds = singbox.generateCredentials();
          result.shadowTlsUsername = creds.username;
          result.shadowTlsPassword = creds.password;
          result.shadowTlsSsPassword = creds.ssPassword;
        } catch (err) {
          console.error("[provider] ShadowTLS credential generation failed:", err);
        }
      })(),
    );
  }

  if (singbox && getBoolean("feature.hysteria2")) {
    result.hysteria2Password = singbox.generateHysteria2Password();
  }

  if (singbox && getBoolean("feature.tuic")) {
    const creds = singbox.generateTuicCredentials();
    result.tuicUuid = creds.uuid;
    result.tuicPassword = creds.password;
  }

  if (singbox && getBoolean("feature.trojan")) {
    result.trojanPassword = singbox.generateTrojanPassword();
  }

  if (singbox && getBoolean("feature.dnstt") && config.dnsttTunnelDomain) {
    const creds = singbox.generateDnsttCredentials();
    result.dnsttSocksUsername = creds.username;
    result.dnsttSocksPassword = creds.password;
  }

  if (sshTunnel && getBoolean("feature.sshTunnel")) {
    try {
      const keyPair = sshTunnel.generateKeyPair();
      result.sshPublicKey = keyPair.publicKey;
      result.sshPrivateKey = keyPair.privateKey;
    } catch (err) {
      console.error("[provider] SSH key generation failed:", err);
    }
  }

  if (mieru && getBoolean("feature.mieru")) {
    try {
      const creds = mieru.generateCredentials();
      result.mieruUsername = creds.username;
      result.mieruPassword = creds.password;
    } catch (err) {
      console.error("[provider] Mieru credential generation failed:", err);
    }
  }

  await Promise.all(tasks);

  if (
    !result.marzbanUsername && !result.amneziaWgPeerId &&
    !result.ovpnCloakConfig && !result.naiveUsername && !result.shadowTlsUsername &&
    !result.hysteria2Password && !result.tuicUuid && !result.trojanPassword &&
    !result.dnsttSocksUsername && !result.sshPublicKey && !result.mieruUsername
  ) {
    throw new Error("All VPN providers failed to create a key");
  }

  return result;
}

export interface RevokeOptions {
  marzbanUsername?: string | null;
  amneziaWgPeerId?: string | null;
  hadNaiveProxy?: boolean;
  hadSingboxCredentials?: boolean;
  hadSshTunnel?: boolean;
  hadMieru?: boolean;
}

/**
 * Revoke VPN access on all providers. Best-effort — logs failures.
 * OpenVPN+Cloak uses shared certs with no per-user server state,
 * so revocation just removes the config from the DB (soft revoke).
 */
export async function revokeUser(opts: RevokeOptions): Promise<void> {
  const tasks: Promise<void>[] = [];

  if (marzban && opts.marzbanUsername) {
    tasks.push(
      marzban.deleteUser(opts.marzbanUsername).catch((err) => {
        console.error("[provider] Marzban user deletion failed:", err);
      }),
    );
  }

  if (amneziaWg && opts.amneziaWgPeerId) {
    tasks.push(
      amneziaWg.deletePeer(opts.amneziaWgPeerId).catch((err) => {
        console.error("[provider] AmneziaWG peer deletion failed:", err);
      }),
    );
  }

  await Promise.all(tasks);

  // Regenerate NaiveProxy users file after DB changes are committed by the caller
  if (naiveProxy && opts.hadNaiveProxy) {
    naiveProxy.syncUsersAndReload().catch((err) => {
      console.error("[provider] NaiveProxy sync/reload after revoke failed:", err);
    });
  }

  if (singbox && opts.hadSingboxCredentials) {
    singbox.syncConfig().catch((err) => {
      console.error("[provider] sing-box sync after revoke failed:", err);
    });
  }

  if (amneziaWg && opts.amneziaWgPeerId) {
    amneziaWg.syncConfig().catch((err) => {
      console.error("[provider] AWG sync after revoke failed:", err);
    });
  }

  if (sshTunnel && opts.hadSshTunnel) {
    sshTunnel.syncAuthorizedKeys().catch((err) => {
      console.error("[provider] SSH tunnel sync after revoke failed:", err);
    });
  }

  if (mieru && opts.hadMieru) {
    mieru.syncConfig().catch((err) => {
      console.error("[provider] Mieru sync after revoke failed:", err);
    });
  }
}

/**
 * Sync all config-based providers (NaiveProxy, sing-box) after DB changes.
 * Call this AFTER inserting/updating credentials in the DB.
 * Fire-and-forget — logs errors but doesn't throw.
 */
export function syncAfterDbChange(provision: ProvisionResult): void {
  if (naiveProxy && provision.naiveUsername) {
    naiveProxy.syncUsersAndReload().catch((err) => {
      console.error("[provider] NaiveProxy sync/reload failed:", err);
    });
  }

  if (singbox && (provision.shadowTlsUsername || provision.hysteria2Password || provision.tuicUuid || provision.trojanPassword || provision.dnsttSocksUsername)) {
    singbox.syncConfig().catch((err) => {
      console.error("[provider] sing-box config sync failed:", err);
    });
  }

  if (amneziaWg && provision.amneziaWgConfig) {
    amneziaWg.syncConfig().catch((err) => {
      console.error("[provider] AWG config sync failed:", err);
    });
  }

  if (sshTunnel && provision.sshPublicKey) {
    sshTunnel.syncAuthorizedKeys().catch((err) => {
      console.error("[provider] SSH tunnel sync failed:", err);
    });
  }

  if (mieru && provision.mieruUsername) {
    mieru.syncConfig().catch((err) => {
      console.error("[provider] Mieru config sync failed:", err);
    });
  }
}
