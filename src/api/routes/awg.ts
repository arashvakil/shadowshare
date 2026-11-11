import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { buildAwgVpnUri } from "../../amneziawg/vpn-uri.js";

const app = new Hono();

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Lookup user by referral code, return null if not found/inactive. */
async function findUser(code: string) {
  const clean = code.toLowerCase().trim();
  if (!clean || clean.length > 20) return null;
  const user = await db.query.users.findFirst({
    where: eq(users.referralCode, clean),
  });
  if (!user || !user.isActive) return null;
  return user;
}

/**
 * GET /awg/:code — main config page with single QR code + protocol details.
 */
app.get("/:code", async (c) => {
  const user = await findUser(c.req.param("code"));
  const code = c.req.param("code").toLowerCase().trim();

  if (!user) {
    return c.html(page("Not Available", `
      <div class="card" style="text-align:center">
        <div class="err-icon">!</div>
        <h2>This link isn't working</h2>
        <p>This VPN config may have been removed or the link is incorrect. Ask the person who shared it with you for a new one.</p>
        <a href="/app" class="btn btn-secondary">Go to ShadowShare</a>
      </div>
    `));
  }

  const hasAwg = !!user.amneziaWgConfig;
  const hasOvpn = !!user.ovpnCloakConfig;

  if (!hasAwg && !hasOvpn) {
    return c.html(page("Not Available", `
      <div class="card" style="text-align:center">
        <div class="err-icon">!</div>
        <h2>Your VPN isn't ready yet</h2>
        <p>Your account doesn't have AmneziaVPN configs yet. Try refreshing this page in a minute, or contact the person who invited you.</p>
        <a href="/app" class="btn btn-secondary">Go to Dashboard</a>
      </div>
    `));
  }

  const awgVpnUri = hasAwg ? buildAwgVpnUri(user.amneziaWgConfig!) : "";
  const ovpnVpnUri = hasOvpn ? "vpn://" + Buffer.from(user.ovpnCloakConfig!).toString("base64url") : "";

  let body = `
    <div class="brand-bar">
      <img src="/app/icons/shield-64.png" alt="" class="brand-icon" />
      <span class="brand-name">ShadowShare</span>
    </div>

    <div class="card welcome-card">
      <h1>Let's get you connected</h1>
      <p>Follow these simple steps to set up your VPN. It only takes a minute!</p>
    </div>

    <!-- Step 1: Download app -->
    <div class="card step-card">
      <div class="step-header">
        <span class="step-num">1</span>
        <h2>Get the app</h2>
      </div>
      <p>Download <strong>AmneziaVPN</strong> — it's free and works on all devices.</p>
      <div class="dl-links">
        <a href="https://apps.apple.com/app/amneziavpn/id1600529900" class="btn btn-store" target="_blank">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
          iPhone
        </a>
        <a href="https://play.google.com/store/apps/details?id=org.amnezia.vpn" class="btn btn-store" target="_blank">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 20.5v-17c0-.59.34-1.11.84-1.35L13.69 12l-9.85 9.85c-.5-.24-.84-.76-.84-1.35m13.81-5.38L6.05 21.34l8.49-8.49 2.27 2.27m3.35-4.31c.34.27.56.69.56 1.19s-.22.92-.56 1.19l-2.29 1.32-2.5-2.5 2.5-2.5 2.29 1.3M6.05 2.66l10.76 6.22-2.27 2.27-8.49-8.49z"/></svg>
          Android
        </a>
      </div>
    </div>

    <!-- Step 2: Copy your config -->
    <div class="card step-card">
      <div class="step-header">
        <span class="step-num">2</span>
        <h2>Add your VPN config</h2>
      </div>
      <ol class="mini-steps">
        <li>Tap the button below to copy your config</li>
        <li>Open AmneziaVPN and tap the <strong>+</strong> button</li>
        <li>Tap <strong>"Insert key"</strong> — it will automatically detect what you copied</li>
      </ol>
      ${hasAwg ? `
      <button class="btn btn-primary copy-full-btn" onclick="copyConfig('awg')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
        Copy VPN Config (WireGuard)
      </button>
      <button class="btn btn-secondary copy-full-btn" onclick="downloadConfig('awg', 'amneziawg.conf')" style="margin-top:8px">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 3v12m0 0l-4-4m4 4l4-4"/><path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/></svg>
        Download Config File
      </button>
      <p id="copy-hint-awg" class="copy-success">Copied! Now open AmneziaVPN and tap + then "Insert key".</p>
      ` : ""}
      ${hasOvpn ? `
      <button class="btn btn-primary copy-full-btn" onclick="copyConfig('ovpn')" style="${hasAwg ? "margin-top:10px;background:#5C5650;" : ""}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
        Copy VPN Config (OpenVPN + Cloak)
      </button>
      <button class="btn btn-secondary copy-full-btn" onclick="downloadConfig('ovpn', 'openvpn-cloak.vpn')" style="margin-top:8px">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 3v12m0 0l-4-4m4 4l4-4"/><path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/></svg>
        Download Config File
      </button>
      <p id="copy-hint-ovpn" class="copy-success">Copied! Now open AmneziaVPN and tap + then "Insert key".</p>
      ` : ""}
      ${hasAwg && hasOvpn ? `
      <div class="tip-card" style="margin-top:14px">
        <p><strong>Which one should I use?</strong> Start with WireGuard — it's faster. If it doesn't connect (e.g. UDP is blocked in your country), try OpenVPN + Cloak instead — it uses TCP and disguises traffic as HTTPS.</p>
      </div>
      ` : ""}
      ${hasAwg ? `
      <div class="qr-section">
        <button class="qr-toggle" onclick="toggleQr()">Or scan a QR code instead</button>
        <div id="qr-area" class="qr-area" style="display:none">
          <p class="hint">Open AmneziaVPN, tap <strong>+</strong>, choose <strong>"Scan QR code"</strong>, and point your camera here:</p>
          <div id="qr-main" class="qr-wrap"></div>
        </div>
      </div>
      ` : ""}
    </div>
  `;

  // Final step: Connect
  const connectStep = "3";
  body += `
    <div class="card step-card">
      <div class="step-header">
        <span class="step-num">${connectStep}</span>
        <h2>You're ready!</h2>
      </div>
      <p>Go back to AmneziaVPN and tap the big <strong>Connect</strong> button. That's it — you're online!</p>
      <p>The app runs quietly in the background. Whenever you need the VPN, just open the app.</p>
    </div>
  `;

  body += `
    <div class="back-link">
      <a href="/app">Back to your dashboard</a>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"><\/script>
    <script>
      var configs = { awg: ${JSON.stringify(awgVpnUri)}, ovpn: ${JSON.stringify(ovpnVpnUri)} };
      function copyConfig(type) {
        var uri = configs[type];
        if (!uri) return;
        navigator.clipboard.writeText(uri).then(function() {
          var hint = document.getElementById('copy-hint-' + type);
          if (hint) {
            hint.classList.add('visible');
            setTimeout(function() { hint.classList.remove('visible'); }, 4000);
          }
        });
      }

      function downloadConfig(type, filename) {
        var uri = configs[type];
        if (!uri) return;
        try {
          var b64 = uri.replace(/^vpn:\/\//, '');
          var raw = atob(b64.replace(/-/g, '+').replace(/_/g, '/'));
          var bytes = new Uint8Array(raw.length);
          for (var i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
          var blob = new Blob([bytes], { type: 'application/octet-stream' });
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = filename;
          a.click();
          URL.revokeObjectURL(a.href);
        } catch(e) {
          console.error('Download failed:', e);
        }
      }

      function toggleQr() {
        var area = document.getElementById('qr-area');
        if (!area) return;
        var visible = area.style.display !== 'none';
        area.style.display = visible ? 'none' : 'block';
        if (!visible && !area.dataset.loaded) {
          area.dataset.loaded = '1';
          try {
            var data = ${JSON.stringify(awgVpnUri)};
            if (!data) { document.getElementById('qr-main').innerHTML = '<p class="hint">No QR available</p>'; return; }
            var q = qrcode(0, 'L');
            q.addData(data);
            q.make();
            document.getElementById('qr-main').innerHTML = q.createSvgTag(4, 0);
          } catch(e) {
            document.getElementById('qr-main').innerHTML = '<p class="hint">QR generation failed</p>';
          }
        }
      }
    <\/script>
  `;

  return c.html(page("VPN Setup — ShadowShare", body));
});

function page(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>${esc(title)}</title>
  <meta name="theme-color" content="#F7F5F0">
  <link rel="icon" type="image/png" sizes="32x32" href="/app/icons/favicon-32.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Source+Serif+4:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #F7F5F0;
      --card: #FFFFFF;
      --text: #2D2A26;
      --text-secondary: #5C5650;
      --hint: #8A8279;
      --btn: #1B8A6B;
      --btn-hover: #167A5E;
      --btn-text: #FFFFFF;
      --border: #DDD8CE;
      --shadow-sm: 0 1px 3px rgba(45,42,38,0.06);
      --shadow-md: 0 4px 12px rgba(45,42,38,0.08);
      --radius: 16px;
      --radius-sm: 10px;
      --font: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      --font-display: 'Source Serif 4', Georgia, serif;
      --accent-amber-bg: #FDF4E3;
      --accent-teal-bg: #E6F5F0;
      --success: #1B8A6B;
    }

    body {
      font-family: var(--font);
      background: var(--bg);
      color: var(--text);
      line-height: 1.65;
      font-size: 17px;
      -webkit-font-smoothing: antialiased;
      min-height: 100vh;
      padding: 0;
    }

    .page-wrap {
      max-width: 520px;
      margin: 0 auto;
      padding: 24px 20px 48px;
      padding-top: calc(24px + env(safe-area-inset-top, 0px));
      padding-bottom: calc(48px + env(safe-area-inset-bottom, 0px));
    }

    /* Brand bar */
    .brand-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1.5px solid var(--border);
    }
    .brand-icon { width: 32px; height: 32px; }
    .brand-name {
      font-family: var(--font-display);
      font-size: 20px;
      font-weight: 700;
      color: var(--text);
      letter-spacing: -0.3px;
    }

    /* Cards */
    .card {
      background: var(--card);
      border-radius: var(--radius);
      padding: 22px;
      margin-bottom: 16px;
      box-shadow: var(--shadow-md);
      border: 1px solid rgba(0,0,0,0.04);
    }

    h1 {
      font-family: var(--font-display);
      font-size: 28px;
      font-weight: 700;
      line-height: 1.25;
      margin-bottom: 8px;
      color: var(--text);
      letter-spacing: -0.3px;
    }

    h2 {
      font-family: var(--font-display);
      font-size: 22px;
      font-weight: 600;
      line-height: 1.3;
      color: var(--text);
      margin: 0;
    }

    p {
      color: var(--text-secondary);
      font-size: 17px;
      line-height: 1.6;
      margin-bottom: 12px;
    }
    p:last-child { margin-bottom: 0; }
    p strong { color: var(--text); }

    /* Welcome card */
    .welcome-card { text-align: center; }
    .welcome-card p { max-width: 380px; margin-left: auto; margin-right: auto; }

    /* Step cards */
    .step-header {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 14px;
    }
    .step-num {
      flex-shrink: 0;
      width: 36px; height: 36px;
      background: var(--accent-teal-bg);
      color: var(--success);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 16px;
      border: 2px solid rgba(27,138,107,0.2);
    }

    /* Download buttons */
    .dl-links { display: flex; gap: 10px; margin-top: 8px; flex-wrap: wrap; }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 14px 20px;
      border-radius: var(--radius-sm);
      font-size: 16px;
      font-weight: 600;
      text-decoration: none;
      border: none;
      cursor: pointer;
      transition: background 0.2s, transform 0.12s;
      font-family: var(--font);
      color: var(--text);
      min-height: 48px;
    }
    .btn:active { transform: scale(0.97); }
    .btn-store {
      background: var(--card);
      border: 2px solid var(--border);
      flex: 1;
    }
    .btn-store:hover { border-color: var(--btn); }
    .btn-primary {
      background: var(--btn);
      color: var(--btn-text);
      width: 100%;
      padding: 16px 24px;
      font-size: 17px;
      border-radius: var(--radius);
      box-shadow: var(--shadow-sm);
    }
    .btn-primary:hover { background: var(--btn-hover); }
    .btn-secondary {
      background: #E8E4DC;
      color: var(--text);
      width: 100%;
    }

    /* QR */
    .qr-wrap {
      background: #fff;
      padding: 12px;
      border-radius: var(--radius-sm);
      display: flex;
      justify-content: center;
      margin-top: 8px;
      border: 1.5px solid var(--border);
      max-width: 220px;
    }
    .qr-wrap svg { display: block; width: 100%; height: auto; }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .badge-amber { background: var(--accent-amber-bg); color: #B8860B; border: 1px solid #E8D5A8; }
    .badge-teal { background: var(--accent-teal-bg); color: var(--success); border: 1px solid rgba(27,138,107,0.25); }

    .proto-tag {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
      font-size: 14px;
      color: var(--hint);
    }
    .proto-tags { display: flex; gap: 16px; margin-top: 14px; flex-wrap: wrap; }

    /* Mini steps */
    .mini-steps {
      margin: 8px 0 16px 20px;
      font-size: 16px;
      color: var(--text-secondary);
      line-height: 2;
    }
    .mini-steps strong { color: var(--text); }

    /* Copy button */
    .copy-full-btn { margin-top: 4px; }
    .copy-success {
      font-size: 15px;
      color: var(--success);
      text-align: center;
      margin-top: 8px;
      opacity: 0;
      transition: opacity 0.3s;
    }
    .copy-success.visible { opacity: 1; }

    /* Tip card */
    .tip-card {
      background: var(--accent-amber-bg);
      border: 1.5px solid #E8D5A8;
      border-radius: var(--radius);
      padding: 18px 20px;
      margin-bottom: 16px;
    }
    .tip-card p {
      font-size: 15px;
      color: var(--text-secondary);
      margin-bottom: 0;
      line-height: 1.55;
    }
    .tip-card strong { color: var(--text); }

    /* Error */
    .err-icon {
      width: 56px; height: 56px;
      border-radius: 50%;
      background: #FDE8E6;
      color: #C4392A;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      font-weight: 700;
      margin: 0 auto 16px;
    }

    /* QR toggle section */
    .qr-section { margin-top: 16px; }
    .qr-toggle {
      background: none;
      border: none;
      color: var(--hint);
      font-size: 15px;
      font-family: var(--font);
      cursor: pointer;
      padding: 8px 0;
      text-decoration: underline;
      text-underline-offset: 3px;
    }
    .qr-toggle:hover { color: var(--text-secondary); }
    .qr-area {
      margin-top: 12px;
      animation: fadeIn 0.25s ease;
    }
    .qr-area .hint { font-size: 14px; }
    .qr-area .hint strong { color: var(--text); }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    /* Back link */
    .back-link {
      text-align: center;
      margin-top: 8px;
      padding: 16px;
    }
    .back-link a {
      color: var(--hint);
      font-size: 15px;
      text-decoration: underline;
    }

    .hint { font-size: 14px; color: var(--hint); }

    /* Mobile */
    @media (max-width: 400px) {
      h1 { font-size: 24px; }
      .card { padding: 18px; }
    }
  </style>
</head>
<body>
  <div class="page-wrap">
    ${body}
  </div>
</body>
</html>`;
}

export { app as awgRoutes };
