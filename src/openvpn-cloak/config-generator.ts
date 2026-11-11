import { readFileSync } from "node:fs";
import { config } from "../config.js";

/**
 * Reads a file from the OpenVPN PKI volume, returning null if not available.
 */
function readPkiFile(path: string): string | null {
  try {
    return readFileSync(path, "utf-8").trim();
  } catch {
    return null;
  }
}

/**
 * Build the OpenVPN client config (.ovpn) with embedded certs.
 */
function buildOvpnConfig(serverIp: string, cloakPort: number): string | null {
  const ca = readPkiFile("/etc/openvpn/pki/ca.crt");
  const cert = readPkiFile("/etc/openvpn/pki/issued/shared.crt");
  const key = readPkiFile("/etc/openvpn/pki/private/shared.key");
  const ta = readPkiFile("/etc/openvpn/pki/ta.key");

  if (!ca || !cert || !key) {
    console.error("[openvpn-cloak] PKI files not available");
    return null;
  }

  // Extract just the certificate portion (between BEGIN/END markers)
  const extractCert = (pem: string): string => {
    const match = pem.match(/(-----BEGIN [\s\S]*?-----END [^\n]+)/);
    return match ? match[1] : pem;
  };

  let ovpn = `client
dev tun
proto tcp
remote ${serverIp} ${cloakPort}
resolv-retry infinite
nobind
persist-key
persist-tun
remote-cert-tls server
cipher AES-256-GCM
verb 3
sndbuf 0
rcvbuf 0

<ca>
${ca}
</ca>

<cert>
${extractCert(cert)}
</cert>

<key>
${key}
</key>
`;

  // tls-auth removed: OpenVPN 2.6's dyn-tls-crypt protocol flag
  // (triggered by tls-auth) causes AEAD decrypt errors with
  // AmneziaVPN's OpenVPN 3.8.5 fork on iOS.

  return ovpn;
}

/**
 * Build the Cloak client config (ckclient.json).
 */
function buildCloakClientConfig(uid: string, serverIp: string, cloakPort: number): object | null {
  const publicKey = readPkiFile("/etc/cloak/ckpub.key");
  if (!publicKey) {
    console.error("[openvpn-cloak] Cloak public key not available");
    return null;
  }

  return {
    Transport: "direct",
    ProxyMethod: "openvpn",
    EncryptionMethod: "aes-gcm",
    UID: uid,
    PublicKey: publicKey,
    ServerName: "www.bing.com",
    RemoteHost: serverIp,
    RemotePort: String(cloakPort),
    NumConn: 1,
    BrowserSig: "chrome",
    StreamTimeout: 300,
  };
}

/**
 * Build the full AmneziaVPN config JSON for a user.
 * Returns the JSON string (can be base64-encoded for vpn:// URI).
 */
export function generateOvpnCloakConfig(): string | null {
  const serverIp = config.serverIp;
  const cloakPort = config.cloakPort;

  if (!serverIp || !cloakPort) {
    console.error("[openvpn-cloak] Missing serverIp or cloakPort config");
    return null;
  }

  const uid = readPkiFile("/etc/cloak/ckuid.key");
  if (!uid) {
    console.error("[openvpn-cloak] Cloak BypassUID file not available");
    return null;
  }
  const ovpnConfig = buildOvpnConfig(serverIp, cloakPort);
  const cloakConfig = buildCloakClientConfig(uid, serverIp, cloakPort);

  if (!ovpnConfig || !cloakConfig) {
    return null;
  }

  // hostName is required so AmneziaVPN knows where to connect.
  // AmneziaVPN expects all 3 protocol configs for the Cloak container:
  // openvpn, shadowsocks, AND cloak. If any is missing, it tries SSH to
  // generate it (causing error 300/302). ShadowSocks isn't actually used
  // (Cloak wraps OpenVPN directly), but a placeholder config is required.
  const dummySsConfig = JSON.stringify({
    method: "chacha20-ietf-poly1305",
    password: "placeholder",
  });

  // AmneziaVPN parses last_config with QJsonDocument::fromJson().
  // OpenVPN last_config must be JSON: {"config": "<raw ovpn text>"} —
  // the app reads json["config"] to get the actual OpenVPN config.
  // Raw text causes empty parse → empty config → instant disconnect.
  const amneziaConfig = {
    hostName: serverIp,
    containers: [
      {
        container: "amnezia-openvpn-cloak",
        cloak: {
          last_config: JSON.stringify(cloakConfig),
          port: String(cloakPort),
        },
        openvpn: {
          last_config: JSON.stringify({ config: ovpnConfig }),
          transport_proto: "tcp",
        },
        shadowsocks: {
          last_config: dummySsConfig,
        },
      },
    ],
    defaultContainer: "amnezia-openvpn-cloak",
    description: "ShadowShare",
    dns1: "1.1.1.1",
    dns2: "8.8.8.8",
  };

  return JSON.stringify(amneziaConfig);
}

/**
 * Generate a vpn:// URI that AmneziaVPN can import.
 */
export function generateVpnUri(): string | null {
  const json = generateOvpnCloakConfig();
  if (!json) return null;
  return "vpn://" + Buffer.from(json).toString("base64url");
}

/**
 * Check if OpenVPN + Cloak infrastructure is available.
 */
export function isOvpnCloakAvailable(): boolean {
  const ca = readPkiFile("/etc/openvpn/pki/ca.crt");
  const pubKey = readPkiFile("/etc/cloak/ckpub.key");
  const uid = readPkiFile("/etc/cloak/ckuid.key");
  return !!(ca && pubKey && uid && config.serverIp && config.cloakPort);
}
