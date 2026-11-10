import { config } from "../config.js";
import { MieruClient } from "./client.js";

export const mieru: MieruClient | null =
  config.mieruServerIp
    ? new MieruClient({
        serverIp: config.mieruServerIp,
        tcpPorts: config.mieruTcpPorts,
        udpPorts: config.mieruUdpPorts,
        configPath: "./data/mieru-server.json",
        containerName: config.mieruContainerName,
      })
    : null;
