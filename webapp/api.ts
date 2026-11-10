export interface DnsttConfig {
  tunnelDomain: string;
  slipstreamDomain: string;
  dnsttDomain: string;
  dnsttSshDomain?: string;
  pubkey: string;
  dohUrl: string;
  dnsRelayIp?: string;
  dnsResolvers?: string[];
  resolverUpdatedAt?: string;
  socksUsername: string;
  socksPassword: string;
  sshUsername?: string;
  sshPassword?: string;
  xrayUuid?: string;
  slipnetDnsttUri?: string;
}

export interface NpvTunnelConfig {
  name?: string;
  sshHost: string;
  sshPort: number;
  udpgwPort: number;
  sshUsername: string;
  sshPassword: string;
}

export interface MasterDnsConfig {
  tunnelDomain: string;
  encryptionKey: string;
  configDownloadUrl: string;
  dnsResolvers: string[];
  resolverUpdatedAt?: string;
}

export interface UserProfile {
  language: string;
  hasKey: boolean;
  isActive: boolean;
  singboxUrl: string | null;
  v2raySubUrl: string | null;
  hiddifySubUrl: string | null;
  amneziaVpnUri: string | null;
  amneziaQrData: string | null;
  ovpnCloakVpnUri: string | null;
  dnsttConfig: DnsttConfig | null;
  npvTunnelConfig: NpvTunnelConfig | null;
  npvTunnelServers: NpvTunnelConfig[] | null;
  masterDnsConfig: MasterDnsConfig | null;
  mtprotoProxyUrl: string | null;
  referralCode: string | null;
  referralCount: number;
  maxReferrals: number;
  remainingInvites: number;
  inviteDomain: string | null;
}

export interface RedeemResponse extends UserProfile {
  webToken: string;
}

export interface ApiError {
  error: string;
}

export interface FeatureFlags {
  "feature.miniApp": boolean;
  "feature.referralSystem": boolean;
  "feature.manualCodeEntry": boolean;
  "feature.qrCodes": boolean;
  "feature.languagePicker": boolean;
  "feature.inviteLinks": boolean;
  "feature.webApp": boolean;
  "feature.networkEmergency": boolean;
  "bot.shareMessageText": string;
  "web.communityLink": string;
  "web.supportContact": string;
  [key: string]: unknown;
}

let webToken: string | null = null;

export function setWebToken(token: string | null) {
  webToken = token;
}

export function getWebToken(): string | null {
  return webToken;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (webToken) {
    headers["Authorization"] = `Bearer ${webToken}`;
  }

  const res = await fetch(`/api/web${path}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  const body = await res.json();

  if (!res.ok) {
    throw { status: res.status, ...(body as ApiError) };
  }

  return body as T;
}

export function getMe(): Promise<UserProfile> {
  return request<UserProfile>("/me");
}

export function redeemReferral(
  referralCode: string,
  language?: string,
): Promise<RedeemResponse> {
  return request<RedeemResponse>("/redeem", {
    method: "POST",
    body: JSON.stringify({ referralCode, language }),
  });
}

export function setLanguage(
  language: string,
): Promise<{ ok: boolean; language: string }> {
  return request("/language", {
    method: "POST",
    body: JSON.stringify({ language }),
  });
}

export async function getFlags(): Promise<FeatureFlags> {
  const res = await fetch("/api/flags");
  return res.json();
}
