import type { UserProfile } from "../api";
import { APP_URLS, getAvailableApps, type AppGroup } from "../apps";
import { brandBar, communityLinkEl, copyHint, qrPanel, sectionDivider, statusBanner, storeLinks } from "../components";
import { ANDROID_ICON, COPY_ICON, DOWNLOAD_ICON, GLOBE_ICON, IMPORT_ICON } from "../icons";
import { isNetworkEmergency, state } from "../state";
import { buildDeepLink, escapeAttr, getBaseUrl, html, t } from "../util";
import { renderBackupTunnelsSection, renderDnsttSection, renderMasterDnsSection, renderNpvTunnelSection } from "./tunnels";

function appCard(opts: { name: string; badge: string; recommended?: boolean; descKey: string; body: string; downloads: string }): string {
  return html`
    <div class="card app-section-card${opts.recommended ? " app-section-card-recommended" : ""}">
      <div class="app-section-header">
        <h3 class="app-section-name">${opts.name}</h3>
        <span class="app-section-badge${opts.recommended ? " app-section-badge-recommended" : ""}">${opts.badge}</span>
      </div>
      <p class="hint mb-12">${t(opts.descKey)}</p>
      ${opts.body}
      <div class="app-section-download">
        <span class="hint">${t("app_download")}:</span>
        <div class="dl-links">${opts.downloads}</div>
      </div>
    </div>
  `;
}

function renderSubAppCard(appGroup: AppGroup, profile: UserProfile): string {
  const isHiddify = appGroup.appId === "hiddify";
  const subUrl = `${location.origin}${profile.singboxUrl}`;
  const hintId = isHiddify ? "dash-hiddify" : "dash-singbox";
  return appCard({
    name: appGroup.name,
    badge: appGroup.platformBadge,
    recommended: appGroup.appId === "singbox",
    descKey: isHiddify ? "dash_hiddify_desc" : "dash_singbox_desc",
    body: html`
      <a href="${escapeAttr(buildDeepLink(appGroup.appId, subUrl))}" class="btn btn-primary deeplink-action">
        ${IMPORT_ICON} ${t(isHiddify ? "open_in_hiddify" : "open_in_singbox")}
      </a>
      <div class="btn-row">
        <button type="button" class="btn btn-secondary copy-action" data-copy="${escapeAttr(subUrl)}" data-hint="${hintId}">
          ${COPY_ICON} ${t(isHiddify ? "copy_hiddify_link" : "copy_singbox_link")}
        </button>
        <button type="button" class="btn btn-secondary download-json-action" data-url="${escapeAttr(subUrl)}" data-filename="${isHiddify ? "hiddify-config.json" : "sing-box.json"}">
          ${DOWNLOAD_ICON} ${t("download_json")}
        </button>
      </div>
      ${copyHint(hintId, isHiddify ? "hiddify_copied_hint" : "singbox_copied_hint")}
    `,
    downloads: storeLinks(appGroup.iphoneUrl, appGroup.androidUrl, true),
  });
}

function renderAmneziaCard(appGroup: AppGroup, profile: UserProfile): string {
  const awg = profile.amneziaVpnUri || "";
  const ovpn = profile.ovpnCloakVpnUri || "";
  if (!awg && !ovpn) return "";
  return appCard({
    name: appGroup.name,
    badge: appGroup.platformBadge,
    descKey: "dash_amnezia_desc",
    body: html`
      ${awg ? html`
        <button type="button" class="btn btn-primary copy-action" data-copy="${escapeAttr(awg)}" data-hint="dash-awg">
          ${COPY_ICON} ${t("copy_config")}
        </button>
        <button type="button" class="btn btn-secondary download-vpn-action" data-vpnuri="${escapeAttr(awg)}" data-filename="amneziawg.conf">
          ${DOWNLOAD_ICON} ${t("download_awg")}
        </button>
        ${copyHint("dash-awg", "config_copied")}
        ${qrPanel("dash-qr-area", profile.amneziaQrData || "")}
      ` : ""}
      ${ovpn ? html`
        <div class="${awg ? "mt-16" : ""}">
          <p class="hint mb-8">${t("wiz_ovpn_title")}</p>
          <button type="button" class="btn btn-secondary copy-action" data-copy="${escapeAttr(ovpn)}" data-hint="dash-ovpn">
            ${COPY_ICON} ${t("copy_ovpn")}
          </button>
          <button type="button" class="btn btn-secondary download-vpn-action" data-vpnuri="${escapeAttr(ovpn)}" data-filename="openvpn-cloak.vpn">
            ${DOWNLOAD_ICON} ${t("download_ovpn")}
          </button>
          ${copyHint("dash-ovpn", "ovpn_copied_hint")}
        </div>
      ` : ""}
    `,
    downloads: storeLinks(APP_URLS.amnezia_iphone, APP_URLS.amnezia_android, true),
  });
}

function renderV2RayCard(profile: UserProfile): string {
  if (!profile.v2raySubUrl) return "";
  const url = `${location.origin}${profile.v2raySubUrl}`;
  return appCard({
    name: "V2rayNG",
    badge: t("v2ray_badge"),
    descKey: "dash_v2ray_desc",
    body: html`
      <button type="button" class="btn btn-primary copy-action" data-copy="${escapeAttr(url)}" data-hint="dash-v2ray">
        ${COPY_ICON} ${t("copy_v2ray_link")}
      </button>
      ${copyHint("dash-v2ray", "v2ray_copied_hint")}
    `,
    downloads: html`<a href="${APP_URLS.v2rayng_android}" class="btn-store btn-store-sm" target="_blank" rel="noopener noreferrer">${ANDROID_ICON} V2rayNG</a>`,
  });
}

function renderMtprotoCard(proxyUrl: string): string {
  return html`
    <div class="card card-stacked">
      <div class="card-header">
        <h3 class="card-title"><span aria-hidden="true">📡</span> ${t("mtproto_card_title")}</h3>
      </div>
      <p class="hint mb-12">${t("mtproto_card_desc")}</p>
      <a href="${escapeAttr(proxyUrl)}" class="btn btn-primary">${t("mtproto_open_telegram")}</a>
      <button type="button" class="btn btn-secondary copy-action" data-copy="${escapeAttr(proxyUrl)}" data-hint="dash-mtproto">
        ${COPY_ICON} ${t("mtproto_copy_link")}
      </button>
      ${copyHint("dash-mtproto", "mtproto_copied_hint")}
    </div>
  `;
}

function renderFooter(profile: UserProfile): string {
  const remaining = profile.remainingInvites;
  const inviteLink = profile.referralCode ? `${profile.inviteDomain || getBaseUrl()}?ref=${profile.referralCode}` : "";
  const community = communityLinkEl("footer");

  return html`
    <div class="card footer-card">
      ${state.flags?.["feature.inviteLinks"] !== false ? html`
        <div class="footer-section">
          <h3 class="footer-section-title">${t("invite_title")}</h3>
          ${remaining > 0 ? html`
            <p class="footer-meta"><strong>${remaining}</strong> ${t("invites_remaining")}</p>
            <div class="invite-link-display" dir="ltr">${escapeAttr(inviteLink)}</div>
            <button type="button" class="btn btn-primary share-btn" data-action="share" data-link="${escapeAttr(inviteLink)}">${t("share")}</button>
          ` : html`<p class="hint">${t("invites_used_up")}</p>`}
        </div>
        <div class="footer-divider"></div>
      ` : ""}

      ${community ? community + html`<div class="footer-divider"></div>` : ""}

      ${state.flags?.["feature.languagePicker"] !== false ? html`
        <button type="button" class="footer-row" data-action="change-lang">
          ${GLOBE_ICON}
          <span>${t("change_language")}</span>
        </button>
        <div class="footer-divider"></div>
      ` : ""}

      <button type="button" class="footer-row footer-row-danger" data-action="start-over">
        <span>${t("start_over")}</span>
      </button>
    </div>
  `;
}

export function renderDashboard(profile: UserProfile): string {
  const isActive = profile.hasKey && profile.isActive;

  const appSections = getAvailableApps(profile)
    .map((a) => (a.appId === "amneziavpn" ? renderAmneziaCard(a, profile) : profile.singboxUrl ? renderSubAppCard(a, profile) : ""))
    .join("");
  const v2rayCard = renderV2RayCard(profile);

  const dnsttContent = profile.dnsttConfig ? renderDnsttSection(profile.dnsttConfig) : "";
  const npvServers = profile.npvTunnelServers || (profile.npvTunnelConfig ? [profile.npvTunnelConfig] : null);
  const npvContent = npvServers?.length ? renderNpvTunnelSection(npvServers) : "";
  const masterDnsContent = profile.masterDnsConfig ? renderMasterDnsSection(profile.masterDnsConfig) : "";
  // During an emergency MasterDNS is hoisted into its own hero; otherwise it sits with the backup tunnels.
  const masterDnsIsPrimary = !!masterDnsContent && isNetworkEmergency();
  const backupTunnels = renderBackupTunnelsSection(npvContent, dnsttContent, masterDnsIsPrimary ? "" : masterDnsContent);

  return html`
    <div class="screen active" id="screen-dashboard">
      ${brandBar()}
      <h1>${t("dashboard_title")}</h1>

      <div class="card card-status">
        <div class="card-header">
          <h2 class="card-title">${t("key_label")}</h2>
          <span class="status-badge ${isActive ? "status-active" : "status-inactive"}">${t(isActive ? "active" : "inactive")}</span>
        </div>
        <p class="hint mb-0">${t(isActive ? "vpn_connected_hint" : "vpn_setup_hint")}</p>
      </div>

      ${masterDnsIsPrimary ? html`
        ${statusBanner()}
        <div class="card masterdns-hero-card" id="masterdns">
          <div class="masterdns-hero-header">
            <h2 class="masterdns-hero-title">${t("masterdns_primary_name")}</h2>
            <span class="masterdns-hero-badge">${t("works_now_badge")}</span>
          </div>
          ${masterDnsContent}
        </div>
      ` : ""}

      ${appSections ? (masterDnsIsPrimary ? html`
        ${sectionDivider(true)}
        <details class="degraded-apps-details">
          <summary class="degraded-apps-summary">
            ${t("connections_title")}
            <span class="collapsible-arrow" aria-hidden="true">▼</span>
          </summary>
          <div class="degraded-apps-content">${appSections}${v2rayCard}</div>
        </details>
      ` : html`
        <h2 class="section-header">${t("connections_title")}</h2>
        ${appSections}
        ${v2rayCard}
      `) : ""}

      ${backupTunnels}
      ${profile.mtprotoProxyUrl ? renderMtprotoCard(profile.mtprotoProxyUrl) : ""}
      ${renderFooter(profile)}

      <p class="footer-bookmark">${t("bookmark_hint")}</p>
    </div>
  `;
}
