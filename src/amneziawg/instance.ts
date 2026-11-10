import { config } from "../config.js";
import { AmneziaWgClient } from "./client.js";

export const amneziaWg: AmneziaWgClient | null =
  config.awgServerIp ? new AmneziaWgClient() : null;
