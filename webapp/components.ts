// Shared UI building blocks. Every screen composes these instead of repeating markup.
import { communityLink } from "./state";
import { escapeAttr, html, t } from "./util";
import { ANDROID_ICON, APPLE_ICON, COPY_ICON, telegramIcon } from "./icons";

export function brandBar(): string {
  return html`
    <div class="brand-bar">
      <img src="/app/icons/shield-64.png" alt="" class="brand-icon" width="32" height="32" />
      <span class="brand-name">${t("app_title")}</span>
    </div>
  `;
}

export function welcomeCard(titleKey: string, subtitleKey: string): string {
  return html`
    <div class="card welcome-card">
      <h1>${t(titleKey)}</h1>
      <p>${t(subtitleKey)}</p>
    </div>
  `;
}

/** Numbered step header used in wizards and tunnel guides. */
export function stepHeader(num: string | number, title: string, level: "h2" | "h3" = "h2", alt = false): string {
  const cls = level === "h2" ? "step-header" : "dnstt-step-header";
  return html`
    <div class="${cls}">
      <span class="step-num${alt ? " step-num-alt" : ""}" aria-hidden="true">${num}</span>
      <${level}>${title}</${level}>
    </div>
  `;
}

/** Collapsible <details> block with a styled summary. */
export function disclosure(summary: string, body: string): string {
  return html`
    <details class="disclosure">
      <summary class="disclosure-summary">${summary}</summary>
      <div class="disclosure-body">${body}</div>
    </details>
  `;
}

/** App-store download links. */
export function storeLinks(iphoneUrl: string | null, androidUrl: string | null, small = false): string {
  const cls = small ? "btn-store btn-store-sm" : "btn-store";
  return html`
    ${iphoneUrl ? html`<a href="${escapeAttr(iphoneUrl)}" class="${cls}" target="_blank" rel="noopener noreferrer">${APPLE_ICON} ${t("get_iphone")}</a>` : ""}
    ${androidUrl ? html`<a href="${escapeAttr(androidUrl)}" class="${cls}" target="_blank" rel="noopener noreferrer">${ANDROID_ICON} ${t("get_android")}</a>` : ""}
  `;
}

/** "Copied!" confirmation line toggled by bindCopyActions. */
export function copyHint(id: string, textKey: string): string {
  return html`<p class="copy-success" id="${id}" role="status" aria-live="polite">${t(textKey)}</p>`;
}

/** Labeled read-only value with a copy button. */
export function copyField(label: string, value: string, hintId: string): string {
  return html`
    <div class="dnstt-field">
      <span class="dnstt-field-label">${escapeAttr(label)}</span>
      <div class="dnstt-field-value-row">
        <code class="dnstt-field-value" dir="ltr">${escapeAttr(value)}</code>
        <button type="button" class="dnstt-copy-btn copy-action" data-copy="${escapeAttr(value)}" data-hint="${hintId}" aria-label="${escapeAttr(t("copy_value", { label }))}">
          ${COPY_ICON}
        </button>
      </div>
    </div>
  `;
}

/** Group of copyFields. `indent` aligns it under a numbered list item. */
export function fieldGroup(fields: string, indent = false): string {
  return html`<div class="dnstt-fields-group${indent ? " field-indent" : ""}">${fields}</div>`;
}

/** Download card for a third-party client app. */
export function clientAppCard(opts: { icon: string; name: string; badge: string; desc: string; url: string; cta: string; ctaIcon: string }): string {
  return html`
    <div class="dnstt-app-card">
      <div class="dnstt-app-header">
        <span class="dnstt-app-icon">${opts.icon}</span>
        <div>
          <h4 class="dnstt-app-name">${opts.name}</h4>
          <span class="dnstt-app-platform">${opts.badge}</span>
        </div>
      </div>
      <p class="dnstt-app-desc">${opts.desc}</p>
      <a href="${escapeAttr(opts.url)}" class="btn btn-secondary dnstt-dl-btn" target="_blank" rel="noopener noreferrer">
        ${opts.ctaIcon} ${opts.cta}
      </a>
    </div>
  `;
}

/** Toggleable QR code panel (rendered lazily by bindQrToggles). */
export function qrPanel(id: string, data: string): string {
  if (!data) return "";
  return html`
    <div class="qr-section">
      <button type="button" class="qr-toggle" data-qr-target="${id}" aria-expanded="false" aria-controls="${id}">${t("show_qr")}</button>
      <div class="qr-area" id="${id}" hidden data-qr-data="${escapeAttr(data)}">
        <p class="hint">${t("qr_instructions")}</p>
        <div class="qr-wrap"></div>
      </div>
    </div>
  `;
}

export function statusBanner(): string {
  return html`
    <div class="status-banner" role="status">
      <span class="status-banner-icon" aria-hidden="true">⚠️</span>
      <div class="status-banner-body">
        <div class="status-banner-title">${t("network_status_title")}</div>
        <div class="status-banner-text">${t("network_status_body")}</div>
      </div>
    </div>
  `;
}

export function sectionDivider(withSubtitle: boolean): string {
  return html`
    <div class="section-divider">
      <h3 class="section-divider-title">${t("other_options_title")}</h3>
      ${withSubtitle ? html`<p class="section-divider-subtitle">${t("other_options_subtitle")}</p>` : ""}
    </div>
  `;
}

type CommunityVariant = "banner" | "button" | "footer";

/** Link to the configured community channel; renders nothing when unset. */
export function communityLinkEl(variant: CommunityVariant): string {
  const link = communityLink();
  if (!link) return "";
  const href = escapeAttr(link);
  const label = t("btn_join_beta");
  if (variant === "banner") {
    return html`<a href="${href}" class="telegram-banner" target="_blank" rel="noopener noreferrer">${telegramIcon("telegram-logo")}<span>${label}</span></a>`;
  }
  if (variant === "footer") {
    return html`<a href="${href}" class="footer-row footer-row-link" target="_blank" rel="noopener noreferrer">${telegramIcon("footer-row-icon")}<span>${label}</span></a>`;
  }
  return html`<a href="${href}" class="btn btn-secondary" target="_blank" rel="noopener noreferrer">${label}</a>`;
}

/** Wizard card inviting users to the community channel (hidden when unset). */
export function communityCard(): string {
  if (!communityLink()) return "";
  return html`
    <div class="card step-card beta-card">
      <p>${t("join_beta")}</p>
      ${communityLinkEl("button")}
    </div>
  `;
}
