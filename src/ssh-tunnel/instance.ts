import { config } from "../config.js";
import { SshTunnelClient } from "./client.js";

export const sshTunnel: SshTunnelClient | null =
  config.sshTunnelHost
    ? new SshTunnelClient(
        config.sshTunnelHost,
        config.sshTunnelPort,
        config.sshTunnelUser,
        "./data",
      )
    : null;
