import { config } from "../config.js";
import { MarzbanClient } from "./client.js";

export const marzban: MarzbanClient | null =
  config.marzbanApiUrl && config.marzbanUsername && config.marzbanPassword
    ? new MarzbanClient(config.marzbanApiUrl, config.marzbanUsername, config.marzbanPassword)
    : null;
