// Backup tunnels: DNSTT, NPV (SSH-direct) and MasterDnsVPN.
import type { DnsttConfig, MasterDnsConfig, NpvTunnelConfig } from "../api";
import { APP_URLS, MASTERDNS_DOWNLOADS } from "../apps";
import { clientAppCard, copyField, copyHint, disclosure, fieldGroup, stepHeader } from "../components";
import { ANDROID_ICON, APPLE_ICON, COPY_ICON, DOWNLOAD_ICON, LINK_ICON, SIGNAL_ICON } from "../icons";
import { detectPlatform, escapeAttr, html, listItems, t } from "../util";

function alertBox(icon: string, textKey: string): string {
  return html`
    <div class="dnstt-alert">
      <span class="dnstt-alert-icon" aria-hidden="true">${icon}</span>
      <p>${t(textKey)}</p>
    </div>
  `;
}

/** Order platform cards so the visitor's own platform comes first. */
function byPlatform(ios: string, android: string): string {
  return detectPlatform() === "ios" ? ios + android : android + ios;
}

function guideImg(src: string, alt: string): string {
  return html`<img src="${src}" alt="${escapeAttr(alt)}" class="dnstt-guide-img" loading="lazy" />`;
}

/** A numbered list item continuing from `start`, followed by an indented field group. */
function numberedField(start: number, textKey: string, fields: string): string {
  return html`
    <ol class="dnstt-steps-list" start="${start}"><li>${t(textKey)}</li></ol>
    ${fields ? fieldGroup(fields, true) : ""}
  `;
}

// === DNSTT ===

export function renderDnsttSection(dnstt: DnsttConfig): string {
  const platform = detectPlatform();
  const hasSsh = !!(dnstt.sshUsername && dnstt.sshPassword);
  const hasSlipnet = !!dnstt.slipnetDnsttUri;
  const androidHint = "dnstt-android-hint";
  const iosHint = "dnstt-ios-hint";

  const credFields = (hint: string) => hasSsh
    ? copyField("SSH Username", dnstt.sshUsername!, hint) + copyField("SSH Password", dnstt.sshPassword!, hint)
    : copyField("SOCKS Username", dnstt.socksUsername, hint) + copyField("SOCKS Password", dnstt.socksPassword, hint);

  const androidImport = hasSlipnet ? html`
    <div class="dnstt-step">
      ${stepHeader(2, t("dnstt_step2_import_title"), "h3")}
      <p class="hint mb-12">${t("dnstt_step2_import_desc")}</p>
      <div class="dnstt-import-buttons">
        <a href="${escapeAttr(dnstt.slipnetDnsttUri || "")}" class="btn btn-primary dnstt-import-btn">${LINK_ICON} DNSTT</a>
        <button type="button" class="btn btn-secondary dnstt-import-btn copy-action" data-copy="${escapeAttr(dnstt.slipnetDnsttUri || "")}" data-hint="${androidHint}">
          ${COPY_ICON} ${t("dnstt_copy_link")}
        </button>
      </div>
      <p class="hint mt-12">${t("dnstt_import_hint")}</p>
      ${copyHint(androidHint, "dnstt_copied")}

      <h4 class="subheading">${t("dnstt_manual_setup")}</h4>
      ${fieldGroup(
        copyField("Tunnel Domain", dnstt.dnsttDomain, androidHint) +
        copyField("Public Key", dnstt.pubkey, androidHint) +
        copyField("DNS Resolver", "1.1.1.1:53", androidHint) +
        credFields(androidHint),
      )}
    </div>
    <div class="dnstt-step">
      ${stepHeader(3, t("dnstt_step4_title"), "h3")}
      <ol class="dnstt-steps-list">${listItems(t("dnstt_steps_android_import"))}</ol>
    </div>
  ` : "";

  // iOS: HTTP Injector (Configs → DNS (DNSTT) → SSH)
  const resolverValue = dnstt.dnsRelayIp ? `${dnstt.dnsRelayIp}:53` : "8.8.8.8:53";
  const iosManual = html`
    <div class="dnstt-step">
      ${stepHeader(2, t("dnstt_step2_title"), "h3")}
      <p class="hint mb-12">${t("dnstt_step2_desc")}</p>
      <ol class="dnstt-steps-list">
        <li>${t("dnstt_ios_setup_new_config")}</li>
        <li>${t("dnstt_ios_setup_tunnel_type")}</li>
      </ol>
      ${guideImg("/app/images/hi-tunnel-type.png", "Tunnel Type: DNS (DNSTT) → SSH")}

      <h4 class="subheading">${t("dnstt_ios_section_dns")}</h4>
      ${numberedField(3, "dnstt_ios_setup_resolver", copyField("DNS Resolver", "1.1.1.1:53", iosHint))}
      <p class="hint field-indent">${t("dnstt_alt_resolver_hint")}</p>
      ${fieldGroup(copyField(t("dnstt_alt_resolver_label"), resolverValue, iosHint), true)}

      <h4 class="subheading">${t("dnstt_ios_section_dnstt")}</h4>
      ${numberedField(4, "dnstt_ios_setup_nameserver", copyField("Nameserver", dnstt.dnsttSshDomain || dnstt.dnsttDomain, iosHint))}
      ${numberedField(5, "dnstt_ios_setup_pubkey", copyField("Public Key", dnstt.pubkey, iosHint))}
      ${guideImg("/app/images/hi-dns-settings.png", "DNS Resolver and DNSTT Settings")}

      <h4 class="subheading">${t("dnstt_ios_section_ssh")}</h4>
      ${numberedField(6, "dnstt_ios_setup_sshhost", copyField("SSH Host", "127.0.0.1", iosHint))}
      ${numberedField(7, "dnstt_ios_setup_sshport", copyField("SSH Port", "2222", iosHint))}
      ${numberedField(8, "dnstt_ios_setup_creds", hasSsh ? credFields(iosHint) : "")}
      ${guideImg("/app/images/hi-ssh-settings.png", "SSH Settings")}

      ${numberedField(9, "dnstt_ios_setup_save", "")}
      ${guideImg("/app/images/hi-home.png", "HTTP Injector ready — tap Start")}
      ${copyHint(iosHint, "dnstt_copied")}
    </div>
  `;

  const apps = byPlatform(
    clientAppCard({ icon: APPLE_ICON, name: "HTTP Injector", badge: t("dnstt_ios_badge"), desc: t("dnstt_ios_desc"), url: APP_URLS.http_injector_ios, cta: t("dnstt_ios_download"), ctaIcon: DOWNLOAD_ICON }),
    clientAppCard({ icon: ANDROID_ICON, name: "SlipNet", badge: t("dnstt_android_badge"), desc: t("dnstt_android_desc"), url: APP_URLS.slipnet_android, cta: t("dnstt_android_download"), ctaIcon: DOWNLOAD_ICON }),
  );

  const platformGuide = platform === "ios"
    ? iosManual
    : platform === "android"
      ? androidImport
      : disclosure(`${ANDROID_ICON} Android (SlipNet)`, androidImport) + disclosure(`${APPLE_ICON} iOS (HTTP Injector)`, iosManual);

  return html`
    ${alertBox("⚡", "dnstt_warning")}
    <div class="dnstt-step">
      ${stepHeader(1, t("dnstt_step1_title"), "h3")}
      <div class="dnstt-apps-grid">${apps}</div>
    </div>
    ${platformGuide}
  `;
}

// === NPV Tunnel ===

function renderNpvServer(npv: NpvTunnelConfig, index: number): string {
  const hint = `npv-hint-${index}`;
  return html`
    <div class="dnstt-step">
      ${stepHeader(index + 1, escapeAttr(npv.name || `Server ${index + 1}`), "h3", true)}
      ${fieldGroup(
        copyField("Protocol", "SSH-Direct", hint) +
        copyField("SSH Host", npv.sshHost, hint) +
        copyField("SSH Port", String(npv.sshPort), hint) +
        copyField("Udpgw Port", String(npv.udpgwPort), hint) +
        copyField("SSH Username", npv.sshUsername, hint) +
        copyField("SSH Password", npv.sshPassword, hint),
      )}
      <p class="hint mt-8"><span aria-hidden="true">✅</span> ${t("npv_step3_desc")}</p>
      ${copyHint(hint, "npv_copied")}
    </div>
  `;
}

export function renderNpvTunnelSection(servers: NpvTunnelConfig[]): string {
  const apps = byPlatform(
    clientAppCard({ icon: APPLE_ICON, name: "NpvTunnel", badge: t("dnstt_ios_badge"), desc: t("npv_ios_desc"), url: APP_URLS.npvtunnel_ios, cta: t("npv_ios_download"), ctaIcon: DOWNLOAD_ICON }),
    clientAppCard({ icon: ANDROID_ICON, name: "NapsternetV", badge: t("dnstt_android_badge"), desc: t("npv_android_desc"), url: APP_URLS.napsternetv_android, cta: t("npv_android_download"), ctaIcon: DOWNLOAD_ICON }),
  );
  return html`
    ${alertBox("🔗", "npv_warning")}
    <div class="dnstt-step">
      ${stepHeader(1, t("npv_step1_title"), "h3")}
      <div class="dnstt-apps-grid">${apps}</div>
    </div>
    <div class="dnstt-step">
      ${stepHeader(2, t("npv_step2_title"), "h3")}
      <p class="hint mb-12">${t("npv_step2_desc")}</p>
    </div>
    ${servers.map(renderNpvServer).join("")}
  `;
}

// === MasterDnsVPN ===

function dlButtons(items: [string, string][]): string {
  return html`<div class="masterdns-dl-row">${items.map(([url, label]) =>
    html`<a href="${escapeAttr(url)}" class="btn btn-secondary btn-sm" target="_blank" rel="noopener noreferrer">${DOWNLOAD_ICON} ${label}</a>`,
  ).join("")}</div>`;
}

export function renderMasterDnsSection(cfg: MasterDnsConfig): string {
  const d = MASTERDNS_DOWNLOADS;
  const resolvers = cfg.dnsResolvers?.length ? html`
    <div class="dnstt-step mt-16">
      <h4 class="subheading">${t("masterdns_resolvers_hint")}</h4>
      ${fieldGroup(cfg.dnsResolvers.map((r) => copyField("Resolver", r, "masterdns-hint")).join(""))}
    </div>
  ` : "";

  return html`
    <p class="hint my-12">${t("masterdns_card_desc")}</p>
    <div class="dnstt-step">
      <a href="${escapeAttr(cfg.configDownloadUrl)}" class="btn btn-primary" download>${DOWNLOAD_ICON} ${t("masterdns_download_config")}</a>
    </div>
    <div class="disclosure-stack">
      ${disclosure(t("masterdns_android_title"), dlButtons([[d.termuxArm64, "Termux ARM64"], [d.termuxArmv7, "Termux ARMv7"]]) + html`<ol class="dnstt-steps-list">${listItems(t("masterdns_android_steps"))}</ol>`)}
      ${disclosure(t("masterdns_windows_title"), dlButtons([[d.windowsAmd64, "Windows 64-bit"], [d.windowsX86, "Windows 32-bit"]]) + html`<ol class="dnstt-steps-list">${listItems(t("masterdns_windows_steps"))}</ol>`)}
      ${disclosure(t("masterdns_desktop_title"), dlButtons([[d.macArm64, "macOS (Apple Silicon)"], [d.macAmd64, "macOS (Intel)"], [d.linuxAmd64, "Linux x64"], [d.linuxArm64, "Linux ARM64"]]) + html`<ol class="dnstt-steps-list">${listItems(t("masterdns_desktop_steps"))}</ol>`)}
    </div>
    ${resolvers}
    <p class="hint mt-16"><span aria-hidden="true">💡</span> ${t("masterdns_proxy_hint")}</p>
    ${copyHint("masterdns-hint", "dnstt_copied")}
  `;
}

// === Backup tunnels card (tabbed when more than one) ===

export function renderBackupTunnelsSection(npv: string, dnstt: string, masterDns: string): string {
  const tabs = [
    { key: "npv", label: t("backup_tunnels_tab_npv"), content: npv },
    { key: "dnstt", label: t("backup_tunnels_tab_dnstt"), content: dnstt },
    { key: "masterdns", label: t("backup_tunnels_tab_masterdns"), content: masterDns },
  ].filter((tab) => tab.content);
  if (tabs.length === 0) return "";

  const body = tabs.length === 1 ? tabs[0].content : html`
    <div class="backup-tunnel-tabs" role="tablist">
      ${tabs.map((tab, i) => html`<button type="button" role="tab" id="tunnel-tab-${tab.key}" aria-controls="tunnel-pane-${tab.key}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" class="backup-tunnel-tab${i === 0 ? " active" : ""}" data-tunnel="${tab.key}">${tab.label}</button>`).join("")}
    </div>
    ${tabs.map((tab, i) => html`<div role="tabpanel" id="tunnel-pane-${tab.key}" aria-labelledby="tunnel-tab-${tab.key}" class="backup-tunnel-pane${i === 0 ? " active" : ""}" data-tunnel-pane="${tab.key}">${tab.content}</div>`).join("")}
  `;

  return html`
    <section class="card dnstt-card" id="backup-tunnels" aria-labelledby="backup-tunnels-title">
      <div class="dnstt-header">
        <span class="dnstt-trigger-icon">${SIGNAL_ICON}</span>
        <div class="dnstt-trigger-text">
          <h2 class="dnstt-trigger-title" id="backup-tunnels-title">${t("backup_tunnels_title")}</h2>
          <span class="dnstt-trigger-subtitle">${t("backup_tunnels_subtitle")}</span>
          <span class="dnstt-trigger-badge">${t("backup_tunnels_badge")}</span>
        </div>
      </div>
      ${alertBox("⚡", "backup_tunnels_warning")}
      ${body}
    </section>
  `;
}
