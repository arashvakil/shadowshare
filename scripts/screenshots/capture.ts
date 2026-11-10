// Regenerates the README screenshots in docs/images/ from a seeded demo.
//
//   npm run build && npm run screenshots
//
// The web app talks to mocked API responses (fixtures.ts); the admin panel runs
// against a real server with a seeded throwaway database (seed.ts) and a fake
// Marzban (server.ts). Nothing here touches a real deployment. Uses your
// installed Chrome, or Playwright's bundled Chromium if CHROME=bundled.
import { chromium, type Browser, type Page } from "playwright";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { startDemo, ADMIN_PASSWORD } from "./server.js";
import { flags, profile, redeemed } from "./fixtures.js";

const OUT = "docs/images";
const HOST = "go.example.org";
const PHONE = { width: 390, height: 844 };

mkdirSync(OUT, { recursive: true });
const only = process.argv.slice(2);
const want = (name: string) => only.length === 0 || only.includes(name);

/** Encode a PNG buffer as WebP using Chrome's own encoder (no image deps). */
async function save(page: Page, png: Buffer, name: string, maxWidth?: number, cropHeight?: number) {
  const dataUrl = await page.evaluate(async ({ b64, maxWidth, cropHeight }) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const srcH = cropHeight ? Math.min(cropHeight, img.height) : img.height;
    const scale = maxWidth && img.width > maxWidth ? maxWidth / img.width : 1;
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(srcH * scale);
    const ctx = c.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, img.width, srcH, 0, 0, c.width, c.height);
    return c.toDataURL("image/webp", 0.86);
  }, { b64: png.toString("base64"), maxWidth, cropHeight });
  const buf = Buffer.from(dataUrl.split(",")[1], "base64");
  writeFileSync(`${OUT}/${name}.webp`, buf);
  console.log(`${name}.webp  ${(buf.length / 1024).toFixed(0)} KB`);
}

async function phone(browser: Browser, opts: { lang?: string; withToken?: boolean } = {}) {
  const ctx = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "en-US" });
  const page = await ctx.newPage();
  const me = { ...profile, language: opts.lang ?? "en" };
  await page.route("**/api/flags", (r) => r.fulfill({ json: flags }));
  await page.route("**/api/web/**", (r) => {
    const url = r.request().url();
    if (url.endsWith("/redeem")) return r.fulfill({ json: { ...redeemed, language: opts.lang ?? "en" } });
    if (url.endsWith("/me")) return r.fulfill({ json: me });
    return r.fulfill({ json: { ok: true } });
  });
  if (opts.withToken) {
    await ctx.addInitScript(() => {
      localStorage.setItem("shadowshare_token", "a".repeat(64));
      localStorage.setItem("shadowshare_onboarding_done", "1");
    });
  }
  return page;
}

// Screens fade in; wait past the animation so nothing is captured half-transparent.
const settle = (page: Page) => page.waitForTimeout(1000);

async function webShots(browser: Browser) {
  // 1. Invite link → language picker
  let page = await phone(browser);
  await page.goto(`http://${HOST}/app/?ref=3fa2c91b`);
  await settle(page);
  if (want("web-language")) await save(page, await page.screenshot(), "web-language");

  // 2. Language → app picker (invite redeemed automatically)
  await page.click("[data-lang=en]");
  await settle(page);
  if (want("web-picker")) await save(page, await page.screenshot(), "web-picker");

  // 3. Guided setup for sing-box
  await page.click("[data-pick-app=singbox]");
  await settle(page);
  if (want("web-wizard")) await save(page, await page.screenshot(), "web-wizard");
  await page.context().close();

  // 4. Manual code entry (no invite link in the URL)
  page = await phone(browser);
  await page.goto(`http://${HOST}/app/`);
  await settle(page);
  await page.click("[data-lang=en]");
  await settle(page);
  await page.locator("input").first().fill("3fa2c91b");
  // Content ends ~500px down; drop the empty bottom half of the phone.
  if (want("web-code")) await save(page, await page.screenshot(), "web-code", undefined, 1120);
  await page.context().close();

  // 5. Dashboard, invite card, backup tunnels (returning user)
  page = await phone(browser, { withToken: true });
  await page.goto(`http://${HOST}/app/`);
  await settle(page);
  if (want("web-dashboard")) await save(page, await page.screenshot(), "web-dashboard");
  const invite = page.locator(".footer-card").first();
  if (want("web-invite")) { await invite.scrollIntoViewIfNeeded(); await save(page, await invite.screenshot(), "web-invite"); }
  const tunnels = page.locator("#backup-tunnels");
  if (want("web-tunnels") && (await tunnels.count())) {
    const trigger = tunnels.locator("summary, .dnstt-trigger, button").first();
    if (await trigger.count()) await trigger.click().catch(() => {});
    await settle(page);
    // The full card is ~1600px tall; keep the header, tabs and first step.
    const box = (await tunnels.boundingBox())!;
    const step2 = await tunnels.locator(".step-num").nth(1).boundingBox();
    const cssHeight = step2 ? step2.y - box.y - 16 : 640;
    await save(page, await tunnels.screenshot(), "web-tunnels", undefined, Math.round(cssHeight * 2));
  }
  await page.context().close();

  // 6. Farsi, right-to-left
  page = await phone(browser, { withToken: true, lang: "fa" });
  await page.goto(`http://${HOST}/app/`);
  await settle(page);
  if (want("web-dashboard-fa")) await save(page, await page.screenshot(), "web-dashboard-fa");
  await page.context().close();
}

async function adminShots(browser: Browser, adminUrl: string) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(adminUrl + "/");
  await page.locator("input[type=password]").fill(ADMIN_PASSWORD);
  await page.keyboard.press("Enter");
  await page.waitForSelector("#app", { state: "visible" });
  await page.waitForTimeout(1200);
  const tab = async (name: string) => { await page.click(`[data-tab="${name}"]`); await page.waitForTimeout(1200); };

  for (const name of ["dashboard", "users", "invites", "monitoring"]) {
    await tab(name);
    if (want(`admin-${name}`)) await save(page, await page.screenshot(), `admin-${name}`, 1600);
  }
  await tab("settings");
  const flagsSection = page.locator("#settings-protocols").locator("xpath=..");
  if (want("admin-settings")) {
    // Put the "VPN Protocols" heading just under the sticky header.
    await flagsSection.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 90));
    await page.waitForTimeout(300);
    await save(page, await page.screenshot(), "admin-settings", 1600);
  }
  await ctx.close();
}

/** Banner for the top of the README, composed from the screenshots above. */
async function heroShot(browser: Browser) {
  const img = (name: string) => `data:image/webp;base64,${readFileSync(`${OUT}/${name}.webp`).toString("base64")}`;
  const page = await browser.newPage({ viewport: { width: 1600, height: 820 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><head><style>
    * { box-sizing: border-box; margin: 0; }
    body { width: 1600px; height: 820px; overflow: hidden; font-family: -apple-system, system-ui, sans-serif;
      background: radial-gradient(1200px 700px at 70% 30%, #1f7a5c 0%, #0f3d2e 45%, #071a14 100%); position: relative; }
    body::before { content: ""; position: absolute; inset: 0; opacity: .12;
      background-image: linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px);
      background-size: 48px 48px; mask-image: radial-gradient(800px 500px at 60% 40%, #000, transparent); }
    .admin { position: absolute; left: 760px; top: 90px; width: 800px; border-radius: 14px; overflow: hidden;
      box-shadow: 0 30px 80px rgba(0,0,0,.55); transform: perspective(1800px) rotateY(-14deg) rotateX(4deg); opacity: .92; }
    .admin img { display: block; width: 100%; }
    .phone { position: absolute; width: 300px; height: 640px; border-radius: 48px; background: #0b0b0c; padding: 11px;
      box-shadow: 0 40px 90px rgba(0,0,0,.6), inset 0 0 0 2px #2a2a2e; }
    .phone .screen { width: 100%; height: 100%; border-radius: 38px; overflow: hidden; background: #f7f5f0; padding-top: 40px; }
    .phone img { width: 100%; display: block; }
    .phone::after { content: ""; position: absolute; top: 21px; left: 50%; width: 86px; height: 24px; margin-left: -43px;
      background: #0b0b0c; border-radius: 20px; }
    .p1 { left: 70px;  top: 125px; transform: rotate(-5deg); }
    .p2 { left: 400px; top: 85px;  z-index: 2; }
    .p3 { left: 730px; top: 125px; transform: rotate(5deg); z-index: 3; }
  </style></head><body>
    <div class="admin"><img src="${img("admin-dashboard")}"></div>
    <div class="phone p1"><div class="screen"><img src="${img("web-language")}"></div></div>
    <div class="phone p2"><div class="screen"><img src="${img("web-wizard")}"></div></div>
    <div class="phone p3"><div class="screen"><img src="${img("web-dashboard")}"></div></div>
  </body></html>`);
  await page.waitForTimeout(300);
  await save(page, await page.screenshot(), "hero");
  await page.close();
}

const demo = await startDemo();
const browser = await chromium.launch({
  channel: process.env.CHROME === "bundled" ? undefined : "chrome",
  args: [`--host-resolver-rules=MAP ${HOST} 127.0.0.1:3191`],
});
try {
  await webShots(browser);
  await adminShots(browser, demo.admin);
  if (want("hero")) await heroShot(browser);
} finally {
  await browser.close();
  demo.stop();
}
