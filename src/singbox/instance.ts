import { config } from "../config.js";
import { dirname, resolve } from "node:path";
import { SingBoxClient } from "./client.js";

// Clean domain for direct protocol TLS (Trojan, Hysteria2, TUIC).
// Falls back to the ShadowTLS domain if not configured.
const directDomain = config.directTlsDomain || config.shadowTlsDomain;
const CADDY_CERT_DIR = "/etc/sing-box/certs/caddy/certificates/acme-v02.api.letsencrypt.org-directory";
const directCertBase = directDomain ? `${CADDY_CERT_DIR}/${directDomain}` : "";
const shadowTlsCertBase = `${CADDY_CERT_DIR}/${config.shadowTlsDomain}`;

export const singbox: SingBoxClient | null =
  config.shadowTlsDomain
    ? new SingBoxClient({
        domain: config.shadowTlsDomain,
        port: config.shadowTlsPort,
        handshakeServer: config.shadowTlsHandshakeServer,
        strictMode: config.shadowTlsStrictMode,
        method: config.shadowTlsMethod,
        // Next to the database: /app/data in the container, where compose mounts it into sing-box.
        configPath: resolve(dirname(config.databasePath), "shadowtls-config.json"),
        hysteria2Port: config.hysteria2Port,
        tuicPort: config.tuicPort,
        trojanPort: config.trojanPort,
        tlsCertPath: `${shadowTlsCertBase}/${config.shadowTlsDomain}.crt`,
        tlsKeyPath: `${shadowTlsCertBase}/${config.shadowTlsDomain}.key`,
        sniRouterPort: config.sniRouterPort,
        dnsttEnabled: !!config.dnsttTunnelDomain,
        directTlsDomain: directDomain,
        directTlsCertPath: directCertBase ? `${directCertBase}/${directDomain}.crt` : "",
        directTlsKeyPath: directCertBase ? `${directCertBase}/${directDomain}.key` : "",
      })
    : null;
