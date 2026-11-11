import type { UserProfile } from "../api";
import { getAvailableApps } from "../apps";
import { brandBar, sectionDivider, statusBanner, welcomeCard } from "../components";
import { isNetworkEmergency } from "../state";
import { html, t } from "../util";

/** True when the picker has only one real choice and should be skipped. */
export function pickerHasSingleChoice(profile: UserProfile): boolean {
  return getAvailableApps(profile).length === 1 && !profile.masterDnsConfig;
}

export function renderAppPicker(profile: UserProfile): string {
  const apps = getAvailableApps(profile);
  const hasMasterDns = !!profile.masterDnsConfig;
  const emergency = isNetworkEmergency();

  const cards = apps.map((appGroup) => html`
    <button type="button" class="card app-picker-card${emergency ? " app-picker-degraded" : ""}" data-pick-app="${appGroup.appId}">
      <div class="app-picker-header">
        <h2 class="app-picker-name">${appGroup.name}</h2>
        ${emergency ? html`<span class="app-picker-badge app-picker-badge-degraded">${t("currently_degraded_badge")}</span>` : ""}
      </div>
      <p class="app-picker-desc">${appGroup.desc}</p>
      <div class="app-picker-features">
        <span class="app-picker-features-label">${t("includes_label")}</span>
        <ul class="app-picker-list">
          ${appGroup.features.map((f) => html`<li>${f}</li>`).join("")}
        </ul>
      </div>
      <span class="app-picker-action">${t("choose_app")} <span aria-hidden="true">→</span></span>
    </button>
  `).join("");

  // MasterDNS: a green "works now" hero during a network emergency, else a plain option.
  const masterDnsCard = (primary: boolean) => html`
    <button type="button" class="card app-picker-card${primary ? " app-picker-primary app-picker-works-now" : ""}" data-action="go-dashboard">
      <div class="app-picker-header">
        <h2 class="app-picker-name">${t("masterdns_primary_name")}</h2>
        ${primary ? html`<span class="app-picker-badge app-picker-badge-works-now">${t("works_now_badge")}</span>` : ""}
      </div>
      <p class="app-picker-desc">${t("masterdns_primary_desc")}</p>
      <span class="app-picker-action">${t("choose_app")} <span aria-hidden="true">→</span></span>
    </button>
  `;

  const body = emergency && hasMasterDns
    ? masterDnsCard(true) + (apps.length > 0 ? sectionDivider(true) + cards : "")
    : cards + (hasMasterDns ? sectionDivider(false) + masterDnsCard(false) : "");

  return html`
    <div class="screen active" id="screen-pick-app">
      ${brandBar()}
      ${emergency && hasMasterDns ? statusBanner() : ""}
      ${welcomeCard("pick_app_title", "pick_app_subtitle")}
      ${body}
    </div>
  `;
}
