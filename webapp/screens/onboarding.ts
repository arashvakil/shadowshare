import { communityLinkEl } from "../components";
import { escapeAttr, getRefCodeFromUrl, html, t } from "../util";

export function renderLoading(): string {
  return html`
    <div class="screen active loading" id="screen-loading" role="status" aria-live="polite">
      <div class="spinner" aria-hidden="true"></div>
      <div class="loading-text">${t("loading")}</div>
    </div>
  `;
}

export function renderCreatingKeys(): string {
  return html`
    <div class="screen active creating-key" id="screen-creating" role="status" aria-live="polite">
      <div class="spinner" aria-hidden="true"></div>
      <div class="loading-text">${t("creating_keys")}</div>
    </div>
  `;
}

export function renderLanguagePicker(afterPick: "code-entry" | "dashboard"): string {
  return html`
    <div class="screen active" id="screen-language" data-after="${afterPick}">
      <div class="spacer-lg"></div>
      <div class="text-center">
        <img src="/app/icons/shield-128.png" alt="" class="logo-hero" width="80" height="80" />
        <h1>${t("choose_language")}</h1>
      </div>
      <div class="lang-grid" role="group" aria-label="${escapeAttr(t("choose_language"))}">
        <button type="button" class="lang-btn" data-lang="en" lang="en">
          <span class="lang-flag" aria-hidden="true">🇺🇸</span>
          <span class="lang-label">English</span>
        </button>
        <button type="button" class="lang-btn" data-lang="pi" lang="fa-Latn">
          <span class="lang-flag" aria-hidden="true">🇮🇷</span>
          <span class="lang-label">Finglish</span>
        </button>
        <button type="button" class="lang-btn" data-lang="fa" lang="fa" dir="rtl">
          <span class="lang-flag" aria-hidden="true">🇮🇷</span>
          <span class="lang-label">فارسی</span>
        </button>
      </div>

      <div class="spacer-lg"></div>
      ${communityLinkEl("banner")}
    </div>
  `;
}

export function renderCodeEntry(): string {
  const prefill = getRefCodeFromUrl();
  return html`
    <div class="screen active code-entry" id="screen-code-entry">
      <img src="/app/icons/shield-128.png" alt="" class="shield-icon" width="72" height="72" />
      <h1>${t("app_title")}</h1>
      <p class="subtitle" id="code-help">${t("enter_code")}</p>
      <div class="form-group">
        <label for="code-input" class="sr-only">${t("code_input_label")}</label>
        <input
          type="text"
          class="form-input"
          id="code-input"
          placeholder="${escapeAttr(t("code_placeholder"))}"
          value="${escapeAttr(prefill)}"
          aria-describedby="code-help code-error"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          dir="ltr"
        />
        <div class="form-error" id="code-error" role="alert" aria-live="assertive"></div>
      </div>
      <button type="button" class="btn btn-primary" id="submit-code">${t("submit")}</button>
      <div class="spacer"></div>
      <button type="button" class="btn btn-secondary" data-action="change-lang">${t("change_language")}</button>

      <div class="spacer-lg"></div>
      <button type="button" class="collapsible-header collapsible-header-center" data-action="toggle-collapse" aria-expanded="false" aria-controls="vpn-explainer">
        ${t("what_is_vpn")}
        <span class="collapsible-arrow" aria-hidden="true">▼</span>
      </button>
      <div class="collapsible-content" id="vpn-explainer">
        <div class="tip-card">
          <p>${t("vpn_explainer")}</p>
        </div>
      </div>
    </div>
  `;
}
