// Entry point: screen router + init. Screens live in ./screens, shared markup in ./components.
import { getFlags, getMe, setWebToken } from "./api";
import type { Language } from "./i18n";
import {
  bindActions, bindAppPicker, bindCodeEntry, bindCopyActions, bindLanguagePicker, bindQrToggles, bindSetupWizard,
} from "./bindings";
import { getAvailableApps } from "./apps";
import { renderDashboard } from "./screens/dashboard";
import { renderCodeEntry, renderCreatingKeys, renderLanguagePicker, renderLoading } from "./screens/onboarding";
import { pickerHasSingleChoice, renderAppPicker } from "./screens/picker";
import { renderSetupWizard } from "./screens/wizard";
import { state } from "./state";
import { clearToken, detectLanguage, loadToken, ONBOARDING_KEY, setDir, storageSet } from "./util";

const root = document.getElementById("app")!;

function render(screen: string, ...args: any[]) {
  switch (screen) {
    case "loading":
      root.innerHTML = renderLoading();
      break;
    case "language":
      root.innerHTML = renderLanguagePicker(args[0] || "code-entry");
      bindLanguagePicker(root, render);
      break;
    case "code-entry":
      root.innerHTML = renderCodeEntry();
      bindCodeEntry(render);
      bindActions(root, render);
      break;
    case "creating":
      root.innerHTML = renderCreatingKeys();
      break;
    case "pick-app": {
      const profile = state.profile!;
      // Skip the picker when there is only one real choice.
      if (pickerHasSingleChoice(profile)) {
        state.chosenApp = getAvailableApps(profile)[0].appId;
        render("setup-wizard");
        return;
      }
      root.innerHTML = renderAppPicker(profile);
      bindAppPicker(root, render);
      break;
    }
    case "setup-wizard":
      root.innerHTML = renderSetupWizard(state.profile!);
      bindSetupWizard(root, render);
      break;
    case "dashboard":
      root.innerHTML = renderDashboard(state.profile!);
      bindActions(root, render);
      bindCopyActions(root);
      bindQrToggles(root);
      break;
  }
  // Move focus to the new screen's heading so screen readers announce the change.
  const heading = root.querySelector<HTMLElement>("h1");
  if (heading && screen !== "loading" && screen !== "creating") {
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }
  window.scrollTo(0, 0);
}

async function init() {
  state.lang = detectLanguage();
  setDir();
  render("loading");

  try { state.flags = await getFlags(); } catch {}

  const token = loadToken();
  if (token) {
    setWebToken(token);
    try {
      state.profile = await getMe();
      state.lang = (state.profile.language as Language) || state.lang;
      setDir();
    } catch {
      clearToken();
      setWebToken(null);
    }
  }

  if (state.profile?.hasKey) {
    storageSet(ONBOARDING_KEY, "1");
    render("dashboard");
    return;
  }
  render("language", "code-entry");
}

init();
