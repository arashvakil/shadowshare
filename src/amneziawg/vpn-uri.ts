/**
 * Build AmneziaVPN vpn:// URI from raw AmneziaWG .conf text.
 *
 * Strategy: Encode the raw .conf text directly as vpn:// URI.
 * AmneziaVPN's extractWireGuardConfig() natively parses .conf files,
 * detects AWG obfuscation params (Jc, S1, H1 etc.), and builds the
 * correct internal Amnezia config with isThirdPartyConfig=true.
 *
 * This avoids building the Amnezia JSON config ourselves (which was
 * causing error 900 due to format incompatibilities).
 *
 * Encoding: raw .conf text → base64url → "vpn://" prefix
 */

/** Build a full vpn:// URI from raw AmneziaWG .conf text. */
export function buildAwgVpnUri(conf: string): string {
  return "vpn://" + Buffer.from(conf).toString("base64url");
}
