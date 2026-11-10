import type { UserProfile } from "../api";
import { APP_URLS } from "../apps";
import { brandBar, communityCard, copyHint, qrPanel, stepHeader, storeLinks, welcomeCard } from "../components";
import { COPY_ICON, DOWNLOAD_ICON, IMPORT_ICON } from "../icons";
import { state } from "../state";
import { buildDeepLink, detectPlatform, escapeAttr, html, t } from "../util";

// Iranian ISP IP ranges for Hiddify's Slipstream custom-range scan.
const SLIPSTREAM_IR_RANGES = `194.53.122.0-194.53.122.255
89.46.216.0-89.46.219.255
2.176.192.0-2.177.255.255
2.178.0.0-2.178.255.255
2.179.0.0-2.180.255.255
2.190.0.0-2.191.255.255
2.182.0.0-2.184.255.255
2.185.0.0-2.189.255.255
151.234.0.0-151.235.255.255
5.74.0.0-5.74.255.255
5.159.48.0-5.159.55.255
5.233.0.0-5.234.255.255
5.236.0.0-5.237.255.255
5.238.0.0-5.239.255.255
37.148.0.0-37.148.255.255
37.202.159.0-37.202.191.255
37.255.194.0-37.255.255.255
46.100.0.0-46.100.255.255
78.38.0.0-78.39.255.255
79.175.129.0-79.175.191.255
80.191.0.0-80.210.255.255
85.185.0.0-85.185.255.255
89.219.64.0-89.219.127.255
91.92.121.0-91.92.215.255
93.118.108.0-93.118.191.255
94.182.0.0-94.183.255.255
185.173.168.0-185.173.171.255
188.211.0.0-188.213.255.255
217.218.0.0-217.219.255.255
95.38.0.0-95.38.255.255`;

export function renderSetupWizard(profile: UserProfile): string {
  return state.chosenApp === "amneziavpn" ? renderAmneziaWizard(profile) : renderSubWizard(profile);
}

function wizardFooter(): string {
  return html`
    ${communityCard()}
    <button type="button" class="btn btn-primary" id="wizard-done">${t("go_to_dashboard")}</button>
  `;
}

function slipstreamCard(domain: string): string {
  const steps = [1, 2, 3, 4, 5, 6, 7, 8]
    .map((n) => html`<li>${t(`slipstream_step_${n}`, { domain: escapeAttr(domain) })}</li>`)
    .join("");
  return html`
    <div class="card step-card">
      ${stepHeader("⚡", t("slipstream_title"))}
      <p>${t("slipstream_desc")}</p>
      <ol class="mini-steps">${steps}</ol>

      <button type="button" class="collapsible-header" data-action="toggle-collapse" aria-expanded="false" aria-controls="slipstream-ranges">
        ${t("slipstream_custom_title")}
        <span class="collapsible-arrow" aria-hidden="true">▼</span>
      </button>
      <div class="collapsible-content" id="slipstream-ranges">
        <p class="hint">${t("slipstream_custom_desc")}</p>
        <div class="ip-ranges-box">
          <pre id="ip-ranges-text" dir="ltr">${SLIPSTREAM_IR_RANGES}</pre>
          <button type="button" class="btn btn-secondary copy-action" data-copy-from="ip-ranges-text" data-hint="ip-ranges-hint">
            ${COPY_ICON} ${t("copy_ip_ranges")}
          </button>
          ${copyHint("ip-ranges-hint", "copied")}
        </div>
        <p class="hint">${t("slipstream_repeat_hint")}</p>
      </div>
    </div>
  `;
}

function renderSubWizard(profile: UserProfile): string {
  const app = state.chosenApp === "hiddify" ? "hiddify" : "singbox";
  const isHiddify = app === "hiddify";
  const subUrl = `${location.origin}${profile.singboxUrl}`;
  const platform = detectPlatform();
  const iphoneUrl = isHiddify ? APP_URLS.hiddify_iphone : APP_URLS.singbox_iphone;
  const androidUrl = isHiddify ? APP_URLS.hiddify_android : APP_URLS.singbox_android;
  const slipstreamDomain = profile.dnsttConfig?.slipstreamDomain;

  return html`
    <div class="screen active" id="screen-setup-wizard" data-wizard="${app}">
      ${brandBar()}
      ${welcomeCard("setup_title", "setup_subtitle")}

      <div class="card step-card">
        ${stepHeader(1, t("wiz_step_download"))}
        <p>${t(isHiddify ? "wiz_download_hiddify" : "wiz_download_singbox")}</p>
        <div class="dl-links">
          ${storeLinks(platform === "android" ? null : iphoneUrl, platform === "ios" ? null : androidUrl)}
        </div>
      </div>

      <div class="card step-card">
        ${stepHeader(2, t("wiz_add_profile"))}
        <p>${t("wiz_one_tap_desc")}</p>
        <a href="${escapeAttr(buildDeepLink(app, subUrl))}" class="btn btn-primary deeplink-action">
          ${IMPORT_ICON} ${t(isHiddify ? "open_in_hiddify" : "open_in_singbox")}
        </a>
        <p class="hint mt-12">${t("wiz_manual_hint")}</p>
        <button type="button" class="btn btn-secondary copy-action" data-copy="${escapeAttr(subUrl)}" data-hint="wiz-singbox-hint">
          ${COPY_ICON} ${t(isHiddify ? "copy_hiddify_link" : "copy_singbox_link")}
        </button>
        <button type="button" class="btn btn-secondary download-json-action" data-url="${escapeAttr(subUrl)}" data-filename="${isHiddify ? "hiddify-config.json" : "sing-box.json"}">
          ${DOWNLOAD_ICON} ${t("download_json")}
        </button>
        ${isHiddify ? html`<p class="hint mt-8">${t("download_json_hint")}</p>` : ""}
        ${copyHint("wiz-singbox-hint", isHiddify ? "hiddify_copied_hint" : "singbox_copied_hint")}
      </div>

      <div class="card step-card">
        ${stepHeader(3, t("wiz_step_ready"))}
        <p>${t(isHiddify ? "wiz_step_ready_desc_hiddify" : "wiz_step_ready_desc")}</p>
        <p>${t("wiz_step_ready_hint")}</p>
        <p class="hint">${t("wiz_unified_note")}</p>
      </div>

      ${isHiddify && slipstreamDomain ? slipstreamCard(slipstreamDomain) : ""}
      ${wizardFooter()}
    </div>
  `;
}

function renderAmneziaWizard(profile: UserProfile): string {
  const hasAwg = !!profile.amneziaVpnUri;
  const hasOvpn = !!profile.ovpnCloakVpnUri;
  let stepNum = 2;

  return html`
    <div class="screen active" id="screen-setup-wizard" data-wizard="amneziavpn">
      ${brandBar()}
      ${welcomeCard("setup_title", "setup_subtitle")}

      <div class="card step-card">
        ${stepHeader(1, t("wiz_step_download"))}
        <p>${t("wiz_download_amnezia")}</p>
        <div class="dl-links">${storeLinks(APP_URLS.amnezia_iphone, APP_URLS.amnezia_android)}</div>
      </div>

      ${hasAwg ? html`
        <div class="card step-card">
          ${stepHeader(stepNum++, t("wiz_awg_title"))}
          <ol class="mini-steps">
            <li>${t("wiz_awg_step_1")}</li>
            <li>${t("wiz_awg_step_2")}</li>
            <li>${t("wiz_awg_step_3")}</li>
          </ol>
          <button type="button" class="btn btn-primary copy-action" data-copy="${escapeAttr(profile.amneziaVpnUri || "")}" data-hint="wiz-awg-hint">
            ${COPY_ICON} ${t("copy_config")}
          </button>
          ${copyHint("wiz-awg-hint", "config_copied")}
          ${qrPanel("wiz-qr-area", profile.amneziaQrData || "")}
        </div>
      ` : ""}

      ${hasOvpn ? html`
        <div class="card step-card">
          ${stepHeader(stepNum++, t("wiz_ovpn_title"))}
          <p>${t("wiz_ovpn_intro")}</p>
          <p class="hint">${t("wiz_ovpn_step")}</p>
          <button type="button" class="btn btn-primary copy-action" data-copy="${escapeAttr(profile.ovpnCloakVpnUri || "")}" data-hint="wiz-ovpn-hint">
            ${COPY_ICON} ${t("copy_ovpn")}
          </button>
          ${copyHint("wiz-ovpn-hint", "ovpn_copied_hint")}
        </div>
      ` : ""}

      <div class="card step-card">
        ${stepHeader(stepNum, t("wiz_step_ready"))}
        <p>${t("wiz_ready_amnezia")}</p>
        <p>${t("wiz_step_ready_hint")}</p>
      </div>

      ${wizardFooter()}
    </div>
  `;
}
