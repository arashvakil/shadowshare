// Fictional API responses for the web app screenshots. Hosts use example.org and
// TEST-NET addresses (203.0.113.0/24); keys and passwords are random-looking filler.

const TOKEN = "a".repeat(64);

export const flags = {
  "feature.miniApp": false,
  "feature.referralSystem": true,
  "feature.manualCodeEntry": true,
  "feature.qrCodes": true,
  "feature.languagePicker": true,
  "feature.inviteLinks": true,
  "feature.webApp": true,
  "feature.networkEmergency": false,
  "feature.dnstt": true,
  "feature.npvTunnel": true,
  "feature.mtprotoProxy": true,
  "feature.masterDnsTunnel": true,
  "bot.shareMessageText": "Free, private internet access. Open the link and follow the steps:",
  "web.communityLink": "https://t.me/example_community",
  "web.supportContact": "",
};

const awgConfig = [
  "[Interface]",
  "PrivateKey = EXAMPLE0private0key0for0screenshots0only00=",
  "Address = 10.8.0.14/32",
  "DNS = 1.1.1.1",
  "Jc = 4", "Jmin = 40", "Jmax = 70", "S1 = 52", "S2 = 117",
  "",
  "[Peer]",
  "PublicKey = EXAMPLE0public0key0for0screenshots0only000=",
  "Endpoint = 203.0.113.10:51820",
  "AllowedIPs = 0.0.0.0/0",
].join("\n");

export const profile = {
  language: "en",
  hasKey: true,
  isActive: true,
  singboxUrl: `/api/web/singbox?token=${TOKEN}`,
  v2raySubUrl: `/sub/Zm9vYmFyYmF6cXV4MTIzNDU2`,
  hiddifySubUrl: `/api/web/hiddify?token=${TOKEN}`,
  amneziaVpnUri: "vpn://EXAMPLE-amnezia-config-for-screenshots-only",
  amneziaQrData: awgConfig,
  ovpnCloakVpnUri: null,
  dnsttConfig: {
    tunnelDomain: "example.org",
    slipstreamDomain: "t2.example.org",
    dnsttDomain: "d2.example.org",
    dnsttSshDomain: "d3.example.org",
    pubkey: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    dohUrl: "https://cloudflare-dns.com/dns-query",
    dnsResolvers: ["8.8.8.8", "1.1.1.1", "9.9.9.9"],
    socksUsername: "u_7f3a91",
    socksPassword: "demo-password",
    sshUsername: "tunnel",
    sshPassword: "demo-password",
    slipnetDnsttUri: "slipnet://dnstt?domain=d2.example.org&pubkey=0123456789abcdef&user=u_7f3a91",
  },
  npvTunnelConfig: { name: "Server 1", sshHost: "s.example.net", sshPort: 2222, udpgwPort: 7300, sshUsername: "tunnel", sshPassword: "demo-password" },
  npvTunnelServers: [
    { name: "Server 1", sshHost: "s.example.net", sshPort: 2222, udpgwPort: 7300, sshUsername: "tunnel", sshPassword: "demo-password" },
  ],
  masterDnsConfig: null,
  mtprotoProxyUrl: "tg://proxy?server=203.0.113.10&port=443&secret=ee000000000000000000000000000000006578616d706c652e6f7267",
  referralCode: "3fa2c91b",
  referralCount: 3,
  maxReferrals: 10,
  remainingInvites: 7,
  inviteDomain: "https://go.example.org/app",
};

/** Profile as returned right after redeeming an invite (has a token, no setup done yet). */
export const redeemed = { ...profile, webToken: TOKEN, referralCount: 0, remainingInvites: 10 };
