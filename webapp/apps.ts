// Third-party client apps and which ones a profile can use.
import type { UserProfile } from "./api";
import { type ChosenApp } from "./state";
import { t } from "./util";

export const APP_URLS = {
  singbox_iphone: "https://apps.apple.com/app/sing-box-vt/id6673731168",
  singbox_android: "https://play.google.com/store/apps/details?id=io.nekohasekai.sfa",
  hiddify_iphone: "https://apps.apple.com/app/hiddify-proxy-vpn/id6596777532",
  hiddify_android: "https://play.google.com/store/apps/details?id=app.hiddify.com",
  amnezia_iphone: "https://apps.apple.com/app/amneziavpn/id1600529900",
  amnezia_android: "https://play.google.com/store/apps/details?id=org.amnezia.vpn",
  v2rayng_android: "https://play.google.com/store/apps/details?id=com.v2ray.ang",
  slipnet_android: "https://github.com/anonvector/SlipNet/releases/latest",
  http_injector_ios: "https://apps.apple.com/app/http-injector/id1659992827",
  napsternetv_android: "https://play.google.com/store/apps/details?id=com.napsternetlabs.napsternetv",
  npvtunnel_ios: "https://apps.apple.com/app/npv-tunnel/id1629465476",
};

const MASTERDNS_BASE = "https://github.com/masterking32/MasterDnsVPN/releases/latest/download";
export const MASTERDNS_DOWNLOADS = {
  windowsAmd64: `${MASTERDNS_BASE}/MasterDnsVPN_Client_Windows_AMD64.zip`,
  windowsX86: `${MASTERDNS_BASE}/MasterDnsVPN_Client_Windows_X86.zip`,
  macArm64: `${MASTERDNS_BASE}/MasterDnsVPN_Client_MacOS_ARM64.zip`,
  macAmd64: `${MASTERDNS_BASE}/MasterDnsVPN_Client_MacOS_AMD64.zip`,
  linuxAmd64: `${MASTERDNS_BASE}/MasterDnsVPN_Client_Linux_AMD64.zip`,
  linuxArm64: `${MASTERDNS_BASE}/MasterDnsVPN_Client_Linux_ARM64.zip`,
  termuxArm64: `${MASTERDNS_BASE}/MasterDnsVPN_Client_Termux_ARM64.zip`,
  termuxArmv7: `${MASTERDNS_BASE}/MasterDnsVPN_Client_Termux_ARMV7.zip`,
};

export interface AppGroup {
  appId: ChosenApp;
  name: string;
  desc: string;
  platformBadge: string;
  iphoneUrl: string;
  androidUrl: string;
  features: string[];
}

export function getAvailableApps(profile: UserProfile): AppGroup[] {
  const apps: AppGroup[] = [];
  const hasAwg = !!profile.amneziaVpnUri;
  const hasOvpn = !!profile.ovpnCloakVpnUri;

  if (profile.singboxUrl) {
    const features = [t("config_singbox_unified")];
    apps.push({
      appId: "singbox",
      name: "sing-box",
      desc: t("app_singbox_desc"),
      platformBadge: t("recommended"),
      iphoneUrl: APP_URLS.singbox_iphone,
      androidUrl: APP_URLS.singbox_android,
      features,
    });
    apps.push({
      appId: "hiddify",
      name: "Hiddify",
      desc: t("app_hiddify_desc"),
      platformBadge: t("works_everywhere"),
      iphoneUrl: APP_URLS.hiddify_iphone,
      androidUrl: APP_URLS.hiddify_android,
      features,
    });
  }

  if (hasAwg || hasOvpn) {
    const features: string[] = [];
    if (hasAwg) features.push(t("config_wireguard"));
    if (hasOvpn) features.push(t("config_classic"));
    apps.push({
      appId: "amneziavpn",
      name: "AmneziaVPN",
      desc: t("app_amneziavpn_desc"),
      platformBadge: t("works_everywhere"),
      iphoneUrl: APP_URLS.amnezia_iphone,
      androidUrl: APP_URLS.amnezia_android,
      features,
    });
  }

  return apps;
}
