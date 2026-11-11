// Event wiring for rendered screens.
import { getWebToken, redeemReferral, setLanguage, setWebToken } from "./api";
import type { Language } from "./i18n";
import { CHECK_ICON } from "./icons";
import { generateQrSvg } from "./qr";
import { state, type ChosenApp } from "./state";
import {
  clearToken, downloadSingboxJson, downloadVpnConfig, getRefCodeFromUrl, ONBOARDING_KEY,
  saveToken, setDir, storageSet, t,
} from "./util";

type Render = (screen: string, ...args: any[]) => void;

function $all<T extends Element = HTMLElement>(root: ParentNode, sel: string): T[] {
  return Array.from(root.querySelectorAll<T>(sel)) as T[];
}

export function bindLanguagePicker(root: HTMLElement, render: Render) {
  const afterPick = document.getElementById("screen-language")?.dataset.after || "code-entry";
  $all<HTMLButtonElement>(root, ".lang-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      state.lang = btn.dataset.lang as Language;
      setDir();
      if (getWebToken()) {
        try { await setLanguage(state.lang); } catch {}
      }
      render(afterPick === "dashboard" && state.profile ? "dashboard" : "code-entry");
    });
  });
}

/** Normalize what people paste: raw code, ref_CODE, or a full invite link. */
export function normalizeReferralInput(raw: string): string {
  let code = raw.trim();
  if (code.includes("ref=")) code = code.split("ref=").pop() || "";
  else if (code.includes("ref_")) code = code.split("ref_").pop() || "";
  return code.replace(/^ref_/, "").replace(/[&#].*$/, "").trim().toLowerCase();
}

function errorMessage(err: any): string {
  if (err?.status === 429) return t("rate_limited");
  switch (err?.error) {
    case "invalid_referral": return t("invalid_code");
    case "referral_full": return t("referral_full");
    case "registration_closed": {
      const contact = state.flags?.["web.supportContact"];
      return t("registration_closed") + (contact ? " " + t("registration_contact", { contact }) : "");
    }
    default: return t("error_generic");
  }
}

export function bindCodeEntry(render: Render) {
  const input = document.getElementById("code-input") as HTMLInputElement;
  const submitBtn = document.getElementById("submit-code") as HTMLButtonElement;
  const errorEl = document.getElementById("code-error") as HTMLElement;

  const showError = (msg: string) => {
    errorEl.textContent = msg;
    errorEl.classList.add("visible");
    input.setAttribute("aria-invalid", "true");
  };

  async function submit() {
    errorEl.classList.remove("visible");
    input.removeAttribute("aria-invalid");
    const raw = input.value.trim();
    if (!raw) return;
    const code = normalizeReferralInput(raw);
    // Codes are short lowercase hex; reject anything else before spending a rate-limited attempt.
    if (!/^[a-f0-9]{4,32}$/.test(code)) return showError(t("invalid_code"));

    submitBtn.disabled = true;
    render("creating");
    try {
      const result = await redeemReferral(code, state.lang);
      saveToken(result.webToken);
      setWebToken(result.webToken);
      state.profile = result;
      state.lang = (result.language as Language) || state.lang;
      setDir();
      render("pick-app");
    } catch (err) {
      render("code-entry");
      (document.getElementById("code-input") as HTMLInputElement).value = raw;
      const el = document.getElementById("code-error") as HTMLElement;
      el.textContent = errorMessage(err);
      el.classList.add("visible");
      document.getElementById("code-input")?.setAttribute("aria-invalid", "true");
    }
  }

  submitBtn.addEventListener("click", submit);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
  if (input.value && getRefCodeFromUrl()) setTimeout(submit, 300);
}

export function bindAppPicker(root: HTMLElement, render: Render) {
  $all<HTMLButtonElement>(root, "[data-pick-app]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.chosenApp = btn.dataset.pickApp as ChosenApp;
      render("setup-wizard");
    });
  });
  $all<HTMLButtonElement>(root, "[data-action='go-dashboard']").forEach((btn) => {
    btn.addEventListener("click", () => {
      render("dashboard");
      requestAnimationFrame(() => {
        (document.getElementById("masterdns") || document.getElementById("backup-tunnels"))
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  });
}

function bindTabs(root: HTMLElement) {
  const tabs = $all<HTMLButtonElement>(root, ".backup-tunnel-tab");
  const select = (tab: HTMLButtonElement) => {
    tabs.forEach((other) => {
      const on = other === tab;
      other.classList.toggle("active", on);
      other.setAttribute("aria-selected", String(on));
      other.tabIndex = on ? 0 : -1;
      root.querySelector(`[data-tunnel-pane="${other.dataset.tunnel}"]`)?.classList.toggle("active", on);
    });
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => select(tab));
    tab.addEventListener("keydown", (e) => {
      const rtl = document.documentElement.dir === "rtl";
      const delta = e.key === "ArrowRight" ? (rtl ? -1 : 1) : e.key === "ArrowLeft" ? (rtl ? 1 : -1) : 0;
      if (!delta) return;
      e.preventDefault();
      const next = tabs[(i + delta + tabs.length) % tabs.length];
      select(next);
      next.focus();
    });
  });
}

export function bindActions(root: HTMLElement, render: Render) {
  $all<HTMLButtonElement>(root, "[data-action='toggle-collapse']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const expanded = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!expanded));
      btn.nextElementSibling?.classList.toggle("open");
    });
  });

  bindTabs(root);

  $all<HTMLButtonElement>(root, "[data-action='share']").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const link = btn.dataset.link || "";
      const shareText = state.flags?.["bot.shareMessageText"] || t("share_default_text");
      const text = `${shareText}\n${link}`;
      if (navigator.share) {
        try { await navigator.share({ text }); } catch {}
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
        const original = btn.textContent;
        btn.textContent = t("link_copied");
        setTimeout(() => { btn.textContent = original; }, 2000);
      } catch {}
    });
  });

  $all<HTMLButtonElement>(root, "[data-action='change-lang']").forEach((btn) => {
    btn.addEventListener("click", () => render("language", state.profile ? "dashboard" : "code-entry"));
  });

  $all<HTMLButtonElement>(root, "[data-action='start-over']").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!confirm(t("start_over_confirm"))) return;
      clearToken();
      setWebToken(null);
      state.profile = null;
      state.chosenApp = null;
      render("language", "code-entry");
    });
  });
}

function flashHint(hintId: string) {
  const hint = hintId ? document.getElementById(hintId) : null;
  if (!hint) return;
  hint.classList.add("visible");
  setTimeout(() => hint.classList.remove("visible"), 4000);
}

export function bindCopyActions(root: HTMLElement) {
  $all<HTMLButtonElement>(root, ".copy-action").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const fromId = btn.dataset.copyFrom;
      const data = fromId ? document.getElementById(fromId)?.textContent || "" : btn.dataset.copy || "";
      if (!data) return;
      try {
        await navigator.clipboard.writeText(data);
      } catch {
        return;
      }
      if (btn.classList.contains("dnstt-copy-btn")) {
        const original = btn.innerHTML;
        btn.innerHTML = CHECK_ICON;
        btn.classList.add("dnstt-copy-success");
        setTimeout(() => {
          btn.innerHTML = original;
          btn.classList.remove("dnstt-copy-success");
        }, 2000);
      }
      flashHint(btn.dataset.hint || "");
    });
  });

  $all<HTMLButtonElement>(root, ".download-json-action").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.url) downloadSingboxJson(btn.dataset.url, btn.dataset.filename || "sing-box.json");
    });
  });

  $all<HTMLButtonElement>(root, ".download-vpn-action").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.vpnuri) downloadVpnConfig(btn.dataset.vpnuri, btn.dataset.filename || "config.conf");
    });
  });
}

export function bindQrToggles(root: HTMLElement) {
  $all<HTMLButtonElement>(root, ".qr-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const area = document.getElementById(btn.dataset.qrTarget || "");
      if (!area) return;
      const show = area.hidden;
      area.hidden = !show;
      btn.setAttribute("aria-expanded", String(show));
      btn.textContent = t(show ? "hide_qr" : "show_qr");
      if (show && !area.dataset.loaded) {
        area.dataset.loaded = "1";
        const wrap = area.querySelector<HTMLElement>(".qr-wrap");
        const data = area.dataset.qrData || "";
        if (data && wrap) wrap.innerHTML = generateQrSvg(data);
      }
    });
  });
}

export function bindSetupWizard(root: HTMLElement, render: Render) {
  bindCopyActions(root);
  bindQrToggles(root);
  bindActions(root, render);
  document.getElementById("wizard-done")?.addEventListener("click", () => {
    storageSet(ONBOARDING_KEY, "1");
    render("dashboard");
  });
}
