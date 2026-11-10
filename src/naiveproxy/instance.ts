import { config } from "../config.js";
import { NaiveProxyClient } from "./client.js";

export const naiveProxy: NaiveProxyClient | null =
  config.naiveProxyDomain
    ? new NaiveProxyClient(
        config.naiveProxyDomain,
        config.naiveProxyCaddyAdmin,
        "/etc/caddy/naive-users",
      )
    : null;
