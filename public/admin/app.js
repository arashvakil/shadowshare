// Resolve API paths relative to the page's directory
const BASE = new URL(".", document.baseURI).href.replace(/\/$/, "");
function api(path) { return BASE + path; }

// Read a theme color from styles.css so charts follow the same palette.
function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

const TAB_TITLES = {
  dashboard: "Dashboard",
  monitoring: "Monitoring",
  invites: "Invites",
  users: "Users",
  settings: "Settings",
  killswitch: "Kill Switch",
};

const MOBILE_BREAKPOINT = 768;

const app = {
  // State
  currentTab: "dashboard",
  users: [],
  searchTimeout: null,
  selectedUserIds: new Set(),
  userFilter: "all",
  userPage: 0,
  userPageSize: 50,
  userSort: { key: null, dir: "desc" },
  csrfToken: null,
  barChart: null,
  donutChart: null,
  historyChart: null,
  connectivityChart: null,
  workerChart: null,
  masterdnsChart: null,
  masterdnsHistoryHours: 24,
  monitoringPollTimer: null,
  monitoringTimelineHours: 24,
  settingsSnapshot: null,

  // Confirm/prompt state
  _confirmResolve: null,
  _promptResolve: null,

  formatBytes(b) {
    if (!b) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(b) / Math.log(1024));
    return `${(b / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  },

  timeAgo(isoStr) {
    if (!isoStr) return "Never";
    const diff = Date.now() - new Date(isoStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
  },

  tierBadge(tier, marzbanOnlineAt) {
    if (marzbanOnlineAt && tier !== "revoked") {
      const diff = Date.now() - new Date(marzbanOnlineAt).getTime();
      if (diff < 2 * 60 * 1000) {
        return `<span class="badge badge-online">Online</span>`;
      }
    }
    const map = {
      active: { cls: "badge-active", label: "Active" },
      idle: { cls: "badge-idle", label: "Idle" },
      never_connected: { cls: "badge-never", label: "Never Connected" },
      revoked: { cls: "badge-revoked", label: "Revoked" },
    };
    const t = map[tier] || map.never_connected;
    return `<span class="badge ${t.cls}">${t.label}</span>`;
  },

  isMobile() {
    return window.innerWidth <= MOBILE_BREAKPOINT;
  },

  // Helpers for fetch with CSRF
  headers(extra) {
    const h = { "Content-Type": "application/json", ...extra };
    if (this.csrfToken) h["X-CSRF-Token"] = this.csrfToken;
    return h;
  },

  // Custom confirm (replaces native confirm)
  showConfirm(title, message, { danger = false } = {}) {
    return new Promise((resolve) => {
      this._confirmResolve = resolve;
      document.getElementById("confirm-title").textContent = title;
      document.getElementById("confirm-message").textContent = message;
      const actionBtn = document.getElementById("confirm-action-btn");
      actionBtn.className = danger ? "btn btn-danger btn-sm" : "btn btn-primary btn-sm";
      actionBtn.textContent = danger ? title : "Confirm";
      document.getElementById("confirm-overlay").classList.add("active");
    });
  },

  resolveConfirm() {
    document.getElementById("confirm-overlay").classList.remove("active");
    if (this._confirmResolve) { this._confirmResolve(true); this._confirmResolve = null; }
  },

  closeConfirm() {
    document.getElementById("confirm-overlay").classList.remove("active");
    if (this._confirmResolve) { this._confirmResolve(false); this._confirmResolve = null; }
  },

  // Custom prompt (replaces native prompt)
  showPrompt(title, message, defaultValue = "") {
    return new Promise((resolve) => {
      this._promptResolve = resolve;
      document.getElementById("prompt-title").textContent = title;
      document.getElementById("prompt-message").textContent = message;
      const input = document.getElementById("prompt-input");
      input.value = defaultValue;
      document.getElementById("prompt-overlay").classList.add("active");
      setTimeout(() => input.focus(), 100);
    });
  },

  resolvePrompt() {
    const value = document.getElementById("prompt-input").value;
    document.getElementById("prompt-overlay").classList.remove("active");
    if (this._promptResolve) { this._promptResolve(value); this._promptResolve = null; }
  },

  closePrompt() {
    document.getElementById("prompt-overlay").classList.remove("active");
    if (this._promptResolve) { this._promptResolve(null); this._promptResolve = null; }
  },

  // Init
  async init() {
    try {
      const res = await fetch(api("/session"));
      if (res.ok) {
        const data = await res.json();
        this.csrfToken = data.csrfToken || null;
        this.showApp();
        return;
      }
    } catch {}
    this.showLogin();
  },

  showLogin() {
    document.getElementById("login").style.display = "flex";
    document.getElementById("app").style.display = "none";
  },

  showApp() {
    document.getElementById("login").style.display = "none";
    document.getElementById("app").style.display = "flex";
    this.setupTabs();
    this.setupSearch();

    const hash = location.hash.replace("#", "");
    const validTabs = ["dashboard", "monitoring", "invites", "users", "settings", "killswitch"];
    const tab = validTabs.includes(hash) ? hash : "dashboard";
    this.switchTab(tab);
  },

  // Auth
  async login(e) {
    e.preventDefault();
    const pw = document.getElementById("password").value;
    const errEl = document.getElementById("login-error");
    errEl.style.display = "none";

    try {
      const res = await fetch(api("/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (res.ok) {
        const data = await res.json();
        this.csrfToken = data.csrfToken || null;
        this.showApp();
      } else {
        const data = await res.json();
        errEl.textContent = data.error === "too_many_attempts"
          ? "Too many attempts. Wait 15 minutes."
          : "Invalid password.";
        errEl.style.display = "block";
      }
    } catch {
      errEl.textContent = "Connection error.";
      errEl.style.display = "block";
    }
  },

  async logout() {
    await fetch(api("/logout"), { method: "POST", headers: this.headers() });
    this.csrfToken = null;
    document.getElementById("password").value = "";
    this.showLogin();
  },

  // Tabs
  setupTabs() {
    document.querySelectorAll(".nav-item").forEach(item => {
      item.addEventListener("click", () => this.switchTab(item.dataset.tab));
    });
  },

  switchTab(id) {
    document.querySelectorAll(".nav-item").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    const navEl = document.querySelector(`.nav-item[data-tab="${id}"]`);
    if (navEl) navEl.classList.add("active");
    document.getElementById("tab-" + id).classList.add("active");
    document.getElementById("page-title").textContent = TAB_TITLES[id] || id;
    this.currentTab = id;
    location.hash = id;
    document.body.classList.remove("sidebar-open");
    if (id === "dashboard") this.loadDashboard();
    if (id === "monitoring") this.loadMonitoring();
    if (id === "invites") this.loadInvites();
    if (id === "users") this.loadUsers();
    if (id === "settings") this.loadSettings();
    if (id === "killswitch") this.loadKillStatus();
    // Stop monitoring auto-refresh when leaving tab
    if (id !== "monitoring" && this.monitoringPollTimer) {
      clearInterval(this.monitoringPollTimer);
      this.monitoringPollTimer = null;
    }
  },

  toggleSidebar() {
    document.body.classList.toggle("sidebar-open");
  },

  setupSearch() {
    const input = document.getElementById("user-search");
    input.addEventListener("input", () => {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => this.loadUsers(), 300);
    });
  },

  // Dashboard
  async loadDashboard() {
    try {
      const res = await fetch(api("/api/stats"));
      if (!res.ok) throw new Error("Failed to load stats");
      const data = await res.json();

      const grid = document.getElementById("stats-grid");
      grid.innerHTML = `
        ${this.statCard("Total Users", data.totalUsers, "", "default")}
        ${this.statCard("Active", data.activeUsers, "success", "success")}
        ${this.statCard("Revoked", data.revokedUsers, data.revokedUsers > 0 ? "danger" : "", "danger")}
        ${this.statCard("Transfer", data.totalTransferFormatted, "", "warning")}
      `;

      this.loadBandwidthChart();
      this.loadUsageHistory();
      this.loadWorkerAnalytics();
      this.loadSecurity();
      this.loadBilling();

      const ki = document.getElementById("kill-indicator");
      const hs = document.getElementById("header-status");
      if (data.isKilled) {
        ki.innerHTML = '<span class="badge badge-revoked">KILLED</span>';
        hs.innerHTML = '<span class="pulse-dot pulse-dot-dead"></span><span>System Offline</span>';
      } else {
        ki.innerHTML = "";
        hs.innerHTML = '<span class="pulse-dot pulse-dot-ok"></span><span>System Online</span>';
      }

    } catch (err) {
      document.getElementById("stats-grid").innerHTML =
        `<div class="error-banner">Failed to load dashboard: ${this.esc(err.message)}</div>`;
    }
  },

  statCard(label, value, cls, accent) {
    return `<div class="stat-card" data-accent="${accent || 'default'}"><div class="label">${label}</div><div class="value ${cls || ''}">${value}</div></div>`;
  },

  infoRow(key, val) {
    return `<div class="info-row"><span class="key">${key}</span><span>${val}</span></div>`;
  },

  // Chart color palette
  chartColors: [
    "#38bdf8", "#a78bfa", "#34d399", "#fb923c",
    "#f472b6", "#facc15", "#2dd4bf", "#818cf8",
    "#f43f5e", "#94a3b8",
  ],

  // Bandwidth charts
  async loadBandwidthChart() {
    try {
      const res = await fetch(api("/api/users"));
      if (!res.ok) return;
      const users = await res.json();

      const withBandwidth = users
        .filter(u => u.transferBytes > 0)
        .sort((a, b) => b.transferBytes - a.transferBytes)
        .slice(0, 5);

      const section = document.getElementById("bandwidth-section");
      if (withBandwidth.length === 0) {
        section.style.display = "none";
        return;
      }
      section.style.display = "block";
      document.getElementById("bandwidth-updated").textContent =
        new Date().toLocaleTimeString();

      const labels = withBandwidth.map(u => u.referralCode || u.telegramIdHash.slice(0, 8));
      const dataBytes = withBandwidth.map(u => u.transferBytes);
      const barColors = dataBytes.map((_, i) => this.chartColors[i % this.chartColors.length]);

      Chart.defaults.color = cssVar("--text-dim");
      Chart.defaults.borderColor = "#333650";
      Chart.defaults.font.family = "'Sora', sans-serif";

      const tooltipStyle = {
        backgroundColor: cssVar("--surface"),
        borderColor: "#3a3e58",
        borderWidth: 1,
        titleColor: cssVar("--text"),
        bodyColor: cssVar("--text"),
        titleFont: { family: "'Sora', sans-serif", size: 12 },
        bodyFont: { family: "'JetBrains Mono', monospace", size: 12 },
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
        boxPadding: 4,
      };

      const barCtx = document.getElementById("bandwidth-bar").getContext("2d");
      if (this.barChart) this.barChart.destroy();
      this.barChart = new Chart(barCtx, {
        type: "bar",
        data: {
          labels,
          datasets: [{
            label: "Bandwidth",
            data: dataBytes,
            backgroundColor: barColors.map(c => c + "aa"),
            borderColor: barColors,
            borderWidth: 1,
            borderRadius: 4,
            borderSkipped: false,
          }],
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              ...tooltipStyle,
              callbacks: {
                label: (ctx) => " " + this.formatBytes(ctx.raw),
              },
            },
          },
          scales: {
            x: {
              grid: { color: cssVar("--border") },
              ticks: {
                font: { family: "'JetBrains Mono', monospace", size: 10 },
                callback: (v) => this.formatBytes(v),
              },
            },
            y: {
              grid: { display: false },
              ticks: {
                font: { family: "'JetBrains Mono', monospace", size: 11 },
              },
            },
          },
        },
      });

      const barCanvas = document.getElementById("bandwidth-bar");
      barCanvas.parentElement.style.height = Math.max(200, withBandwidth.length * 48 + 40) + "px";

      const donutCtx = document.getElementById("bandwidth-donut").getContext("2d");
      if (this.donutChart) this.donutChart.destroy();
      this.donutChart = new Chart(donutCtx, {
        type: "doughnut",
        data: {
          labels,
          datasets: [{
            data: dataBytes,
            backgroundColor: barColors.map(c => c + "bb"),
            borderColor: "#141620",
            borderWidth: 3,
            hoverOffset: 4,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          cutout: "68%",
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                padding: 14,
                usePointStyle: true,
                pointStyleWidth: 8,
                font: { family: "'JetBrains Mono', monospace", size: 11 },
              },
            },
            tooltip: {
              ...tooltipStyle,
              callbacks: {
                label: (ctx) => " " + this.formatBytes(ctx.raw) +
                  " (" + ((ctx.raw / dataBytes.reduce((a, b) => a + b, 0)) * 100).toFixed(1) + "%)",
              },
            },
          },
        },
      });
    } catch {}
  },

  // Usage over time line chart
  async loadUsageHistory() {
    try {
      const res = await fetch(api("/api/usage-history"));
      if (!res.ok) return;
      const { history, keyLabels } = await res.json();

      const section = document.getElementById("usage-history-section");
      if (history.length < 2) {
        section.style.display = "none";
        return;
      }
      section.style.display = "block";
      document.getElementById("usage-history-info").textContent =
        `${history.length} snapshots`;

      const labels = history.map(h =>
        new Date(h.timestamp).toLocaleDateString("en-US", {
          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
        })
      );

      const allKeys = new Set();
      history.forEach(h => Object.keys(h.byKey).forEach(k => allKeys.add(k)));

      const datasets = Array.from(allKeys).map((keyId, i) => ({
        label: keyLabels[keyId] || keyId,
        data: history.map(h => h.byKey[keyId] || 0),
        borderColor: this.chartColors[i % this.chartColors.length],
        backgroundColor: this.chartColors[i % this.chartColors.length] + "18",
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: this.chartColors[i % this.chartColors.length],
        borderWidth: 2,
      }));

      datasets.unshift({
        label: "Total",
        data: history.map(h => h.total),
        borderColor: cssVar("--text"),
        backgroundColor: "#e8eaf20a",
        fill: false,
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: cssVar("--text"),
        borderWidth: 2,
      });

      const maxLegendItems = this.isMobile() ? 5 : 20;

      const ctx = document.getElementById("usage-history-chart").getContext("2d");
      if (this.historyChart) this.historyChart.destroy();
      this.historyChart = new Chart(ctx, {
        type: "line",
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          plugins: {
            legend: {
              position: "top",
              labels: {
                padding: 12,
                usePointStyle: true,
                pointStyleWidth: 8,
                font: { family: "'JetBrains Mono', monospace", size: 10 },
                filter: (item) => item.datasetIndex < maxLegendItems,
              },
            },
            tooltip: {
              backgroundColor: cssVar("--surface"),
              borderColor: cssVar("--border"),
              borderWidth: 1,
              titleColor: cssVar("--text"),
              bodyColor: cssVar("--text"),
              titleFont: { family: "'Sora', sans-serif", size: 12 },
              bodyFont: { family: "'JetBrains Mono', monospace", size: 12 },
              padding: 12,
              cornerRadius: 8,
              callbacks: {
                label: (ctx) => ` ${ctx.dataset.label}: ${this.formatBytes(ctx.raw)}`,
              },
            },
          },
          scales: {
            x: {
              grid: { color: "#33365000" },
              ticks: {
                maxTicksLimit: 8,
                font: { family: "'JetBrains Mono', monospace", size: 10 },
              },
            },
            y: {
              grid: { color: cssVar("--border") },
              ticks: {
                font: { family: "'JetBrains Mono', monospace", size: 10 },
                callback: (v) => this.formatBytes(v),
              },
            },
          },
        },
      });
    } catch {}
  },

  async loadWorkerAnalytics() {
    try {
      const res = await fetch(api("/api/worker-analytics"));
      if (!res.ok) return;
      const data = await res.json();

      const panel = document.getElementById("worker-analytics");
      panel.style.display = "block";

      const statsRow = document.getElementById("worker-stats-row");
      const pctClass = data.todayPct > 80 ? "danger" : data.todayPct > 50 ? "warning" : "success";
      statsRow.innerHTML = `
        ${this.statCard("Today", data.todayRequests.toLocaleString(), "", "default")}
        ${this.statCard("Limit Used", data.todayPct + "%", pctClass, pctClass === "danger" ? "danger" : pctClass === "warning" ? "warning" : "success")}
        ${this.statCard("7-Day Total", data.totalRequests.toLocaleString(), "", "info")}
        ${this.statCard("Errors", data.totalErrors.toLocaleString(), data.totalErrors > 0 ? "danger" : "", "danger")}
      `;

      if (data.daily.length > 0) {
        const labels = data.daily.map(d => {
          const dt = new Date(d.date + "T00:00:00");
          return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        });
        const requests = data.daily.map(d => d.requests);
        const errors = data.daily.map(d => d.errors);

        const ctx = document.getElementById("worker-chart").getContext("2d");
        if (this.workerChart) this.workerChart.destroy();
        this.workerChart = new Chart(ctx, {
          type: "bar",
          data: {
            labels,
            datasets: [
              {
                label: "Requests",
                data: requests,
                backgroundColor: "#6366f1aa",
                borderColor: "#6366f1",
                borderWidth: 1,
                borderRadius: 4,
              },
              {
                label: "Errors",
                data: errors,
                backgroundColor: "#ef4444aa",
                borderColor: "#ef4444",
                borderWidth: 1,
                borderRadius: 4,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: "top",
                labels: {
                  padding: 12,
                  usePointStyle: true,
                  pointStyleWidth: 8,
                  font: { family: "'JetBrains Mono', monospace", size: 10 },
                },
              },
              tooltip: {
                backgroundColor: cssVar("--surface"),
                borderColor: cssVar("--border"),
                borderWidth: 1,
                titleColor: cssVar("--text"),
                bodyColor: cssVar("--text"),
                titleFont: { family: "'Sora', sans-serif", size: 12 },
                bodyFont: { family: "'JetBrains Mono', monospace", size: 12 },
              },
            },
            scales: {
              x: {
                grid: { color: "#33365000" },
                ticks: { font: { family: "'JetBrains Mono', monospace", size: 10 } },
              },
              y: {
                grid: { color: cssVar("--border") },
                ticks: { font: { family: "'JetBrains Mono', monospace", size: 10 } },
              },
            },
          },
        });
      }
    } catch {}
  },

  // Billing
  async loadSecurity() {
    try {
      const res = await fetch(api("/api/security"));
      if (!res.ok) return;
      const data = await res.json();

      const section = document.getElementById("security-section");
      section.style.display = "block";

      const badge = document.getElementById("security-status-badge");
      if (data.stats.currentlyBlocked > 0) {
        badge.className = "badge badge-revoked";
        badge.textContent = data.stats.currentlyBlocked + " Blocked";
      } else if (data.stats.failedLast24h > 0) {
        badge.className = "badge badge-idle";
        badge.textContent = data.stats.failedLast24h + " Failed (24h)";
      } else {
        badge.className = "badge badge-active";
        badge.textContent = "All Clear";
      }

      const statsRow = document.getElementById("security-stats-row");
      statsRow.innerHTML = `
        ${this.statCard("Failed (24h)", data.stats.failedLast24h, data.stats.failedLast24h > 0 ? "danger" : "", "danger")}
        ${this.statCard("Blocked IPs", data.stats.currentlyBlocked, data.stats.currentlyBlocked > 0 ? "danger" : "", "warning")}
        ${this.statCard("Unique Attackers", data.stats.uniqueAttackerIps, "", "info")}
        ${this.statCard("Logins (24h)", data.stats.successLast24h, "success", "success")}
      `;

      // Blocked IPs table
      const blockedEl = document.getElementById("security-blocked-ips");
      if (data.blockedIps.length > 0) {
        let html = '<div style="margin-bottom:16px"><div style="font-size:13px;font-weight:600;margin-bottom:8px;color:var(--danger)">Currently Blocked</div>';
        for (const b of data.blockedIps) {
          const until = new Date(b.banUntil);
          const remaining = Math.max(0, Math.round((b.banUntil - Date.now()) / 60000));
          html += `<div class="info-row">`;
          html += `<span class="key" style="font-family:'JetBrains Mono',monospace">${this.esc(b.ip)}</span>`;
          html += `<span>${b.attempts} attempts &middot; ban #${b.banCount} &middot; ${remaining}min remaining</span>`;
          html += `</div>`;
        }
        html += '</div>';
        blockedEl.innerHTML = html;
      } else {
        blockedEl.innerHTML = '';
      }

      // Recent events
      const eventsEl = document.getElementById("security-recent-events");
      if (data.recentEvents.length > 0) {
        let html = '<div style="margin-top:8px"><div style="font-size:13px;font-weight:600;margin-bottom:8px">Recent Events</div>';
        const eventIcons = {
          failed_login: '<span style="color:var(--danger)">FAIL</span>',
          rate_limited: '<span style="color:var(--warning)">BLOCK</span>',
          successful_login: '<span style="color:var(--success)">OK</span>',
        };
        for (const ev of data.recentEvents.slice(0, 20)) {
          const time = new Date(ev.timestamp).toLocaleString();
          html += `<div class="info-row">`;
          html += `<span class="key">${eventIcons[ev.type] || ev.type}</span>`;
          html += `<span style="font-family:'JetBrains Mono',monospace;font-size:12px">${this.esc(ev.ip)}</span>`;
          html += `<span class="meta-text" style="margin-left:auto">${time}</span>`;
          html += `</div>`;
        }
        html += '</div>';
        eventsEl.innerHTML = html;
      } else {
        eventsEl.innerHTML = '<div class="meta-text" style="padding:8px 0">No security events recorded since last restart</div>';
      }
    } catch {}
  },

  async loadBilling() {
    try {
      const res = await fetch(api("/api/billing"));
      if (!res.ok) return;
      const data = await res.json();

      const section = document.getElementById("billing-section");
      if (data.items.length === 0 && data.errors.length === 0) return;
      section.style.display = "block";

      document.getElementById("billing-period").textContent = data.period;

      const totals = document.getElementById("billing-totals");
      totals.innerHTML = `
        ${this.statCard("EUR MTD", "\u20AC" + data.eurTotal.toFixed(2), "", "warning")}
        ${this.statCard("USD MTD", "$" + data.usdTotal.toFixed(2), "", "warning")}
        ${this.statCard("Combined MTD", "~$" + data.totalMonthly.toFixed(2), "", "default")}
      `;

      const errorsEl = document.getElementById("billing-errors");
      if (data.errors.length > 0) {
        errorsEl.innerHTML = data.errors.map(e =>
          `<div class="error-banner">${this.esc(e)}</div>`
        ).join("");
      } else {
        errorsEl.innerHTML = "";
      }

      // Group items by provider
      const byProvider = {};
      for (const item of data.items) {
        if (!byProvider[item.provider]) byProvider[item.provider] = [];
        byProvider[item.provider].push(item);
      }

      const providerColors = { Hetzner: "#d32f2f", AWS: "#ff9900", Cloudflare: "#f48120" };

      let html = "";
      for (const [provider, items] of Object.entries(byProvider)) {
        const providerTotal = items.reduce((s, i) => s + i.monthlyCost, 0);
        const curr = items[0].currency;
        const symbol = curr === "EUR" ? "\u20AC" : "$";
        html += `<div style="margin-bottom:16px">`;
        html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">`;
        html += `<span style="width:10px;height:10px;border-radius:50%;background:${providerColors[provider] || "var(--accent)"};display:inline-block"></span>`;
        html += `<span style="font-size:13px;font-weight:600">${this.esc(provider)}</span>`;
        html += `<span class="meta-text" style="margin-left:auto">${symbol}${providerTotal.toFixed(2)} ${curr}/mo</span>`;
        html += `</div>`;
        for (const item of items) {
          html += `<div class="info-row">`;
          html += `<span class="key">${this.esc(item.service)}</span>`;
          html += `<span>${this.esc(item.detail)} &mdash; ${symbol}${item.monthlyCost.toFixed(2)}</span>`;
          html += `</div>`;
        }
        html += `</div>`;
      }

      document.getElementById("billing-items").innerHTML = html;
    } catch {}
  },

  // Users
  async loadUsers() {
    const search = document.getElementById("user-search")?.value || "";
    const wrap = document.getElementById("users-table-wrap");
    const refreshBtn = document.getElementById("refresh-btn");
    refreshBtn?.classList.add("loading");
    try {
      const q = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await fetch(api("/api/users") + q);
      if (!res.ok) throw new Error("Failed to load users");
      this.users = await res.json();
      this.selectedUserIds.clear();
      this.userPage = 0;
      this.renderUsers();
      this.updateBulkBar();
    } catch (err) {
      wrap.innerHTML = `<div class="error-banner">Failed to load users: ${this.esc(err.message)}</div>`;
    } finally {
      refreshBtn?.classList.remove("loading");
    }
  },

  filteredUsers() {
    if (this.userFilter === "all") return this.users;
    return this.users.filter(u => u.activityTier === this.userFilter);
  },

  setUserFilter(f) {
    this.userFilter = f;
    this.userPage = 0;
    this.renderUsers();
  },

  setUserPage(n) {
    this.userPage = n;
    this.renderUsers();
    document.getElementById("users-table-wrap")?.scrollIntoView({ block: "start", behavior: "smooth" });
  },

  // Click a sortable column header: 1st click = desc, 2nd = asc, 3rd = clear.
  setUserSort(key) {
    const s = this.userSort;
    if (s.key !== key) { s.key = key; s.dir = "desc"; }
    else if (s.dir === "desc") { s.dir = "asc"; }
    else { s.key = null; s.dir = "desc"; }
    this.userPage = 0;
    this.renderUsers();
  },

  applyUserSort(list) {
    const s = this.userSort;
    if (!s.key) return list;
    const dir = s.dir === "asc" ? 1 : -1;
    const ts = (u) => { const t = u.marzbanOnlineAt || u.lastActiveAt; return t ? new Date(t).getTime() : 0; };
    return [...list].sort((a, b) => {
      if (s.key === "bandwidth") {
        // Users with no metered data always sort to the bottom, regardless of direction.
        if (a.bandwidthMeasured !== b.bandwidthMeasured) return a.bandwidthMeasured ? -1 : 1;
        return (a.transferBytes - b.transferBytes) * dir;
      }
      if (s.key === "lastActive") return (ts(a) - ts(b)) * dir;
      return 0;
    });
  },

  renderUsers() {
    const wrap = document.getElementById("users-table-wrap");
    const activeCount = this.users.filter(u => u.isActive).length;
    const countEl = document.getElementById("user-count");
    if (countEl) countEl.textContent = `${activeCount} active · ${this.users.length} total`;

    // Activity filter chips (counts over the full set)
    const counts = { all: this.users.length, active: 0, idle: 0, never_connected: 0, revoked: 0 };
    for (const u of this.users) counts[u.activityTier] = (counts[u.activityTier] || 0) + 1;
    const chips = [["all", "All"], ["active", "Active"], ["idle", "Idle"], ["never_connected", "Never connected"], ["revoked", "Revoked"]];
    const neverCount = counts.never_connected || 0;
    const cleanupHTML = (this.userFilter === "never_connected" && neverCount > 0)
      ? `<button class="filter-cleanup-btn" onclick="app.cleanupNeverConnected()">Delete all ${neverCount} never-connected</button>`
      : "";
    const filterHTML = `<div class="user-filters">${chips.map(([key, label]) =>
      `<button class="filter-chip ${this.userFilter === key ? "active" : ""}" onclick="app.setUserFilter('${key}')">${label}<span class="chip-count">${counts[key] || 0}</span></button>`
    ).join("")}${cleanupHTML}</div>`;

    if (this.users.length === 0) {
      wrap.innerHTML = filterHTML + `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          </div>
          <h4>No users found</h4>
          <p>Create a user or adjust your search.</p>
        </div>`;
      return;
    }

    // Apply filter + pagination
    const filtered = this.filteredUsers();
    const pageSize = this.userPageSize;
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    if (this.userPage >= totalPages) this.userPage = totalPages - 1;
    if (this.userPage < 0) this.userPage = 0;
    const start = this.userPage * pageSize;
    const sorted = this.applyUserSort(filtered);
    const pageRows = sorted.slice(start, start + pageSize);
    const allFilteredSelected = filtered.length > 0 && filtered.every(u => this.selectedUserIds.has(u.id));
    const sortCaret = (key) => this.userSort.key === key ? `<span class="sort-caret">${this.userSort.dir === "asc" ? "▲" : "▼"}</span>` : "";
    const bw = (u) => u.bandwidthMeasured ? this.formatBytes(u.transferBytes) : "&mdash;";

    if (pageRows.length === 0) {
      wrap.innerHTML = filterHTML + `
        <div class="empty-state">
          <h4>No ${this.userFilter.replace("_", " ")} users</h4>
          <p>Pick another filter to see more.</p>
        </div>`;
      return;
    }

    // Desktop table
    const desktopHTML = `
      <div class="desktop-table">
        <table>
          <thead>
            <tr>
              <th class="col-check"><input type="checkbox" onchange="app.toggleSelectAll(this.checked)" ${allFilteredSelected ? "checked" : ""}></th>
              <th>User</th>
              <th>Status</th>
              <th>Protocols</th>
              <th class="th-sortable ${this.userSort.key === "lastActive" ? "sorted" : ""}" onclick="app.setUserSort('lastActive')">Last Active${sortCaret("lastActive")}</th>
              <th class="th-sortable ${this.userSort.key === "bandwidth" ? "sorted" : ""}" onclick="app.setUserSort('bandwidth')">Bandwidth${sortCaret("bandwidth")}</th>
              <th class="th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${pageRows.map(u => `
              <tr class="row-clickable ${this.selectedUserIds.has(u.id) ? "row-selected" : ""} ${!u.isActive ? "row-revoked" : ""}" onclick="app.handleRowClick(${u.id}, event)" onkeydown="if((event.key==='Enter'||event.key===' ')&&event.target===this){event.preventDefault();app.handleRowClick(${u.id}, event)}" tabindex="0">
                <td class="col-check"><input type="checkbox" onchange="app.toggleSelectUser(${u.id}, this.checked, event); event.stopPropagation()" ${this.selectedUserIds.has(u.id) ? "checked" : ""}></td>
                <td>
                  <div class="user-cell">
                    <span class="user-cell-name">${u.referralCode ? this.esc(u.referralCode) : this.esc(u.telegramIdHash.slice(0, 8))}</span>
                    <span class="user-cell-sub">${u.referralCode ? this.esc(u.telegramIdHash.slice(0, 8)) : ""} · ${u.referralCount}/${u.maxReferrals} refs</span>
                  </div>
                </td>
                <td>${this.tierBadge(u.activityTier, u.marzbanOnlineAt)}</td>
                <td>${this.protocolDots(u.protocols)}</td>
                <td>
                  <div class="user-cell">
                    <span class="user-cell-primary">${this.timeAgo(u.marzbanOnlineAt || u.lastActiveAt)}</span>
                  </div>
                </td>
                <td><span class="user-cell-mono ${u.bandwidthMeasured ? "" : "bw-unmetered"}">${bw(u)}</span></td>
                <td class="actions" onclick="event.stopPropagation()">
                  ${u.singboxUrl ? `<button class="btn-icon btn-icon-accent" onclick="app.copyText('${this.esc(u.singboxUrl)}')" title="Copy sing-box URL">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>` : ""}
                  <button class="btn-icon" onclick="app.viewUser(${u.id})" title="View details">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
                  ${u.isActive
                    ? `<button class="btn-icon btn-icon-warn" onclick="app.revokeUser(${u.id})" title="Revoke">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg></button>`
                    : `<button class="btn-icon btn-icon-success" onclick="app.restoreUser(${u.id})" title="Restore">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg></button>`}
                  <button class="btn-icon btn-icon-danger" onclick="app.deleteUser(${u.id})" title="Delete">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;

    // Mobile cards
    const mobileHTML = `
      <div class="mobile-cards user-cards">
        ${pageRows.map(u => `
          <div class="user-card ${this.selectedUserIds.has(u.id) ? "row-selected" : ""} ${!u.isActive ? "card-revoked" : ""}" onclick="app.viewUser(${u.id})">
            <div class="user-card-header">
              <label class="card-check" onclick="event.stopPropagation()"><input type="checkbox" onchange="app.toggleSelectUser(${u.id}, this.checked, event)" ${this.selectedUserIds.has(u.id) ? "checked" : ""}></label>
              <div class="user-card-identity">
                <span class="user-card-id">${u.referralCode ? this.esc(u.referralCode) : this.esc(u.telegramIdHash.slice(0, 8))}</span>
                ${this.protocolDots(u.protocols)}
              </div>
              ${this.tierBadge(u.activityTier, u.marzbanOnlineAt)}
            </div>
            <div class="user-card-grid">
              <div class="user-card-field">
                <div class="card-label">Last Active</div>
                <div class="card-value">${this.timeAgo(u.marzbanOnlineAt || u.lastActiveAt)}</div>
              </div>
              <div class="user-card-field">
                <div class="card-label">Bandwidth</div>
                <div class="card-value ${u.bandwidthMeasured ? "" : "bw-unmetered"}">${bw(u)}</div>
              </div>
              <div class="user-card-field">
                <div class="card-label">Referrals</div>
                <div class="card-value">${u.referralCount}/${u.maxReferrals}</div>
              </div>
              <div class="user-card-field">
                <div class="card-label">Created</div>
                <div class="card-value">${this.fmtDate(u.createdAt)}</div>
              </div>
            </div>
            <div class="user-card-actions" onclick="event.stopPropagation()">
              ${u.singboxUrl ? `<button class="btn btn-sb btn-sm" onclick="app.copyText('${this.esc(u.singboxUrl)}')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                Copy SB URL</button>` : ""}
              ${u.isActive
                ? `<button class="btn btn-ghost btn-sm" onclick="app.revokeUser(${u.id})">Revoke</button>`
                : `<button class="btn btn-ghost btn-sm" onclick="app.restoreUser(${u.id})">Restore</button>`}
              <button class="btn btn-ghost btn-sm btn-card-danger" onclick="app.deleteUser(${u.id})">Delete</button>
            </div>
          </div>
        `).join("")}
      </div>
    `;

    // Pagination controls
    const rangeStart = start + 1;
    const rangeEnd = Math.min(start + pageSize, filtered.length);
    const pagerHTML = filtered.length > pageSize ? `
      <div class="user-pager">
        <span class="pager-info">${rangeStart}–${rangeEnd} of ${filtered.length}</span>
        <div class="pager-btns">
          <button class="btn btn-ghost btn-sm" ${this.userPage === 0 ? "disabled" : ""} onclick="app.setUserPage(${this.userPage - 1})">Prev</button>
          <span class="pager-page">Page ${this.userPage + 1} / ${totalPages}</span>
          <button class="btn btn-ghost btn-sm" ${this.userPage >= totalPages - 1 ? "disabled" : ""} onclick="app.setUserPage(${this.userPage + 1})">Next</button>
        </div>
      </div>` : "";

    wrap.innerHTML = filterHTML + desktopHTML + mobileHTML + pagerHTML;
  },

  async viewUser(id) {
    try {
      const res = await fetch(api(`/api/users/${id}`));
      if (!res.ok) throw new Error("Failed to load user");
      const u = await res.json();

      const modal = document.getElementById("user-modal");
      modal.innerHTML = `
        <h2>User Details</h2>
        <div style="display:flex;gap:12px;align-items:center;margin-bottom:16px">
          <span style="font-family:var(--font-mono);font-size:13px;color:var(--text-secondary)">#${u.id} ${u.referralCode ? this.esc(u.referralCode) : this.esc(u.telegramIdHash.slice(0, 8))}</span>
          ${this.tierBadge(u.activityTier, u.marzbanOnlineAt)}
          ${this.protocolDots(u.protocols)}
        </div>
        ${u.singboxUrl ? `
          <div class="modal-field">
            <label>sing-box Subscription (8 protocols)</label>
            <div class="val-code">
              <span>${this.esc(u.singboxUrl)}</span>
              <button class="btn btn-primary btn-sm" onclick="app.copyText('${this.esc(u.singboxUrl)}')">Copy URL</button>
            </div>
          </div>
          <div class="modal-field">
            <label>One-Tap Import Links</label>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn btn-primary btn-sm" onclick="app.copyDeepLink('singbox', '${this.esc(u.singboxUrl)}')">Copy sing-box Link</button>
              <button class="btn btn-ghost btn-sm" onclick="app.downloadJson('${this.esc(u.singboxUrl)}')">Download JSON</button>
            </div>
            <p style="font-size:11px;color:var(--text-dim);margin-top:6px">Send this to the user \u2014 one tap opens the app and imports the profile automatically.</p>
          </div>
          <div class="modal-field">
            <label>sing-box QR</label>
            <div id="modal-qr" class="qr-box"></div>
            <button class="btn btn-ghost btn-sm" onclick="app.saveQrPng('modal-qr')" style="margin-top:6px">Save QR</button>
          </div>
        ` : ""}
        ${u.hiddifySubUrl ? `
          <div class="modal-field">
            <label>Hiddify Subscription (+NaiveProxy, SSH, Mieru)</label>
            <div class="val-code">
              <span>${this.esc(u.hiddifySubUrl)}</span>
              <button class="btn btn-primary btn-sm" onclick="app.copyText('${this.esc(u.hiddifySubUrl)}')">Copy URL</button>
            </div>
          </div>
          <div class="modal-field">
            <label>Hiddify Import Link</label>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn btn-primary btn-sm" onclick="app.copyDeepLink('hiddify', '${this.esc(u.hiddifySubUrl)}')">Copy Hiddify Link</button>
            </div>
          </div>
          <div class="modal-field">
            <label>Hiddify QR</label>
            <div id="modal-qr-hiddify" class="qr-box"></div>
            <button class="btn btn-ghost btn-sm" onclick="app.saveQrPng('modal-qr-hiddify')" style="margin-top:6px">Save QR</button>
          </div>
        ` : ""}
        ${u.referralCode && (u.amneziaWgConfig || u.ovpnCloakConfig) ? `
          <div class="modal-field">
            <label>AmneziaVPN Page</label>
            <div class="val-code">
              <a href="/awg/${this.esc(u.referralCode)}" target="_blank" style="color:var(--accent)">/awg/${this.esc(u.referralCode)}</a>
              <button class="btn btn-ghost btn-sm" onclick="app.copyText(location.origin+'/awg/${this.esc(u.referralCode)}')">Copy Link</button>
            </div>
          </div>
        ` : ""}
        ${this.modalField("Last Active", this.timeAgo(u.marzbanOnlineAt || u.lastActiveAt))}
        ${u.marzbanUserAgent ? this.modalField("Client", u.marzbanUserAgent) : ""}
        ${this.modalField("Transfer", this.formatBytes(u.transferBytes))}
        ${this.modalField("Created", this.fmtDate(u.createdAt))}
        <div class="modal-field">
          <label>Max Referrals</label>
          <div style="display:flex;gap:8px;align-items:center">
            <input type="number" id="edit-max-refs" value="${u.maxReferrals}" min="0" max="10000" style="width:80px">
            <button class="btn btn-primary btn-sm" onclick="app.updateMaxRefs(${u.id})">Save</button>
          </div>
        </div>
        ${this.modalField("Referral Count", u.referralCount)}
        ${u.connectionHistory && u.connectionHistory.length > 0 ? `
          <div class="modal-field">
            <label>Connection History (48h)</label>
            ${this.renderConnectionHistory(u.connectionHistory)}
          </div>
        ` : ""}
        ${u.referrals && u.referrals.length > 0 ? `
          <div class="modal-field">
            <label>Referred Users</label>
            <ul class="referral-list">
              ${u.referrals.map(r => `<li>${r.referralCode || r.telegramIdHash.slice(0, 8)} (${r.isActive ? "active" : "revoked"})</li>`).join("")}
            </ul>
          </div>
        ` : ""}
        <details style="margin-top:12px">
          <summary style="font-size:11px;color:var(--text-dim);cursor:pointer;padding:6px 0">Provider Details</summary>
          ${this.modalField("ID Hash", u.telegramIdHash)}
          ${this.modalField("Marzban User", u.marzbanUsername || "-")}
          ${this.modalField("AmneziaWG Peer", u.amneziaWgPeerId || "-")}
          ${this.modalField("OpenVPN+Cloak", u.ovpnCloakConfig ? "Configured" : "-")}
          ${this.modalField("Telegram Language", u.telegramLangCode || "-")}
          ${this.modalField("Language", u.language)}
        </details>
        <div class="modal-actions">
          ${u.isActive ? `<button class="btn btn-ghost btn-sm" onclick="app.closeModal();app.resetUser(${u.id})">Reset Keys</button>` : ""}
          <button class="btn btn-ghost btn-sm" onclick="app.closeModal()">Close</button>
        </div>
      `;
      document.getElementById("modal-overlay").classList.add("active");

      const qrUrl = u.singboxUrl;
      const qrEl = document.getElementById("modal-qr");
      if (qrUrl && qrEl && typeof qrcode !== "undefined") {
        const qr = qrcode(0, "M");
        qr.addData(qrUrl);
        qr.make();
        qrEl.innerHTML = qr.createSvgTag(4, 0);
      }

      const hiddifyQrUrl = u.hiddifySubUrl;
      const hiddifyQrEl = document.getElementById("modal-qr-hiddify");
      if (hiddifyQrUrl && hiddifyQrEl && typeof qrcode !== "undefined") {
        const qr2 = qrcode(0, "M");
        qr2.addData(hiddifyQrUrl);
        qr2.make();
        hiddifyQrEl.innerHTML = qr2.createSvgTag(4, 0);
      }
    } catch (err) {
      this.showToast("Failed to load user details", "error");
    }
  },

  modalField(label, value) {
    return `<div class="modal-field"><label>${label}</label><div class="val">${value}</div></div>`;
  },

  closeModal() {
    document.getElementById("modal-overlay").classList.remove("active");
  },

  async updateMaxRefs(id) {
    const val = parseInt(document.getElementById("edit-max-refs").value, 10);
    if (isNaN(val) || val < 0 || val > 10000) return;
    try {
      await fetch(api(`/api/users/${id}`), {
        method: "PATCH",
        headers: this.headers(),
        body: JSON.stringify({ maxReferrals: val }),
      });
      this.closeModal();
      this.loadUsers();
    } catch (err) {
      this.showToast("Failed to update referrals", "error");
    }
  },

  async createUser() {
    const label = await this.showPrompt("New User", "Label for this user (optional):", "Admin User");
    if (label === null) return;

    try {
      const res = await fetch(api("/api/users"), {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ label: label || "Admin User", maxReferrals: 10 }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create user");
      }
      this.showToast("User created with VPN keys");
      this.loadUsers();
    } catch (err) {
      this.showToast(`Failed to create user: ${err.message}`, "error");
    }
  },

  async revokeUser(id) {
    const ok = await this.showConfirm("Revoke", "Revoke this user's VPN key? They will lose access immediately.", { danger: true });
    if (!ok) return;
    try {
      await fetch(api(`/api/users/${id}/revoke`), { method: "POST", headers: this.headers() });
      this.showToast("User revoked");
      this.loadUsers();
    } catch (err) {
      this.showToast("Failed to revoke user", "error");
    }
  },

  async restoreUser(id) {
    const ok = await this.showConfirm("Restore", "Create a new VPN key for this user?");
    if (!ok) return;
    try {
      await fetch(api(`/api/users/${id}/restore`), { method: "POST", headers: this.headers() });
      this.showToast("User restored");
      this.loadUsers();
    } catch (err) {
      this.showToast("Failed to restore user", "error");
    }
  },

  async resetUser(id) {
    const ok = await this.showConfirm("Reset Keys", "This will delete old VPN keys and create fresh ones. The user will need to re-import the new subscription URL.", { danger: true });
    if (!ok) return;
    try {
      await fetch(api(`/api/users/${id}/reset`), { method: "POST", headers: this.headers() });
      this.showToast("User reset — new keys provisioned");
      this.loadUsers();
    } catch (err) {
      this.showToast("Failed to reset user", "error");
    }
  },

  async deleteUser(id) {
    const ok = await this.showConfirm("Delete User", "Permanently delete this user and their VPN key? This cannot be undone.", { danger: true });
    if (!ok) return;
    try {
      const res = await fetch(api(`/api/users/${id}`), { method: "DELETE", headers: this.headers() });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        this.showToast(`Delete failed: ${data.error || res.statusText}`, "error");
        return;
      }
      this.showToast("User deleted");
    } catch (err) {
      this.showToast(`Delete failed: ${err.message}`, "error");
      return;
    }
    this.loadUsers();
  },

  // Bulk selection
  lastCheckedIndex: -1,

  toggleSelectUser(id, checked, event) {
    const currentIndex = this.users.findIndex(u => u.id === id);

    if (event?.shiftKey && this.lastCheckedIndex >= 0 && currentIndex >= 0) {
      const start = Math.min(this.lastCheckedIndex, currentIndex);
      const end = Math.max(this.lastCheckedIndex, currentIndex);
      for (let i = start; i <= end; i++) {
        if (checked) {
          this.selectedUserIds.add(this.users[i].id);
        } else {
          this.selectedUserIds.delete(this.users[i].id);
        }
      }
      this.renderUsers();
    } else {
      if (checked) {
        this.selectedUserIds.add(id);
      } else {
        this.selectedUserIds.delete(id);
      }
    }

    this.lastCheckedIndex = currentIndex;
    this.updateBulkBar();
  },

  handleRowClick(id, event) {
    // Ignore clicks on buttons/links inside the row
    if (event.target.closest("button, a, .actions")) return;
    const isSelected = this.selectedUserIds.has(id);
    this.toggleSelectUser(id, !isSelected, event);
    this.renderUsers();
  },

  toggleSelectAll(checked) {
    if (checked) {
      this.filteredUsers().forEach(u => this.selectedUserIds.add(u.id));
    } else {
      this.selectedUserIds.clear();
    }
    this.renderUsers();
  },

  updateBulkBar() {
    const bar = document.getElementById("bulk-bar");
    if (this.selectedUserIds.size > 0) {
      bar.querySelector(".bulk-count").textContent = `${this.selectedUserIds.size} selected`;
      bar.classList.add("visible");
    } else {
      bar.classList.remove("visible");
    }
    // Update select-all checkbox state
    const selectAll = document.querySelector(".col-check input[type=checkbox]");
    if (selectAll) {
      selectAll.checked = this.selectedUserIds.size === this.users.length && this.users.length > 0;
      selectAll.indeterminate = this.selectedUserIds.size > 0 && this.selectedUserIds.size < this.users.length;
    }
    // Update row highlights
    document.querySelectorAll("tr[class]").forEach(tr => {
      const cb = tr.querySelector(".col-check input");
      if (cb) tr.classList.toggle("row-selected", cb.checked);
    });
    document.querySelectorAll(".user-card").forEach(card => {
      const cb = card.querySelector("input[type=checkbox]");
      if (cb) card.classList.toggle("row-selected", cb.checked);
    });
  },

  async bulkDelete() {
    const ids = [...this.selectedUserIds];
    const ok = await this.showConfirm(
      "Bulk Delete",
      `Permanently delete ${ids.length} user${ids.length > 1 ? "s" : ""} and their VPN keys? This cannot be undone.`,
      { danger: true }
    );
    if (!ok) return;
    try {
      const res = await fetch(api("/api/users/bulk-delete"), {
        method: "POST",
        headers: { ...this.headers(), "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      this.selectedUserIds.clear();
      if (data.errors?.length) {
        this.showToast(`Deleted ${data.deleted}, ${data.errors.length} failed`, "error");
      } else {
        this.showToast(`Deleted ${data.deleted} user${data.deleted > 1 ? "s" : ""}`);
      }
    } catch (err) {
      this.showToast(`Bulk delete failed: ${err.message}`, "error");
    }
    this.loadUsers();
  },

  // Delete every "never connected" user (has configs but no usage / not in any
  // metered provider). Reuses the bulk-delete endpoint — which revokes all
  // credential types and re-syncs — batched in chunks of 500 to clear its cap.
  async cleanupNeverConnected() {
    const ids = this.users.filter(u => u.activityTier === "never_connected").map(u => u.id);
    if (ids.length === 0) return;
    const ok = await this.showConfirm(
      "Delete never-connected users",
      `Permanently delete ${ids.length} account${ids.length > 1 ? "s" : ""} that have never connected? They have configs but no usage. This revokes their keys and cannot be undone.`,
      { danger: true }
    );
    if (!ok) return;
    let deleted = 0, failed = 0;
    const chunkSize = 500;
    try {
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const res = await fetch(api("/api/users/bulk-delete"), {
          method: "POST",
          headers: { ...this.headers(), "Content-Type": "application/json" },
          body: JSON.stringify({ ids: chunk }),
        });
        if (!res.ok) throw new Error("Request failed");
        const data = await res.json();
        deleted += data.deleted || 0;
        failed += data.errors?.length || 0;
      }
    } catch (err) {
      this.showToast(`Cleanup failed: ${err.message}`, "error");
      this.loadUsers();
      return;
    }
    this.selectedUserIds.clear();
    this.userFilter = "all";
    this.showToast(failed ? `Deleted ${deleted}, ${failed} failed` : `Deleted ${deleted} never-connected user${deleted > 1 ? "s" : ""}`);
    this.loadUsers();
  },

  // Kill switch
  async loadKillStatus() {
    try {
      const res = await fetch(api("/api/status"));
      if (!res.ok) throw new Error("Failed to load status");
      const data = await res.json();

      const display = document.getElementById("kill-status-display");
      const actions = document.getElementById("kill-actions");

      if (data.isKilled) {
        display.innerHTML = '<div class="kill-status killed"><span class="dot"></span> System is KILLED</div>';
        actions.innerHTML = `
          <p style="margin-bottom:16px;color:var(--text-dim);font-size:13px">The bot is stopped and all keys have been revoked. Revive to restart the bot (users will need new keys).</p>
          <button class="btn btn-primary" onclick="app.revive()">Revive System</button>
        `;
      } else {
        display.innerHTML = '<div class="kill-status alive"><span class="dot"></span> System is ALIVE</div>';
        actions.innerHTML = `
          <p class="kill-warning">This will revoke ALL VPN keys, wipe the database, and stop the bot. This action is irreversible.</p>
          <p style="font-size:12px;color:var(--text-dim);margin-bottom:8px;font-family:var(--font-mono)">Type <strong style="color:var(--text)">DELETE EVERYTHING</strong> to confirm:</p>
          <input type="text" id="kill-confirm" class="kill-confirm-input" placeholder="Type confirmation here...">
          <button class="btn btn-danger" onclick="app.kill()">Activate Kill Switch</button>
        `;
      }
    } catch (err) {
      document.getElementById("kill-status-display").innerHTML =
        `<div class="error-banner">Failed to load status: ${this.esc(err.message)}</div>`;
    }
  },

  async kill() {
    const input = document.getElementById("kill-confirm");
    if (!input || input.value !== "DELETE EVERYTHING") {
      this.showToast("You must type DELETE EVERYTHING to confirm", "error");
      return;
    }
    const ok = await this.showConfirm("FINAL WARNING", "This will destroy all data. This cannot be undone.", { danger: true });
    if (!ok) return;

    try {
      await fetch(api("/api/kill"), { method: "POST", headers: this.headers() });
      setTimeout(() => {
        this.loadKillStatus();
        this.loadDashboard();
      }, 3000);
    } catch (err) {
      this.showToast("Kill switch failed", "error");
    }
  },

  async revive() {
    const ok = await this.showConfirm("Revive System", "Revive the system? The bot will restart.");
    if (!ok) return;
    try {
      await fetch(api("/api/revive"), { method: "POST", headers: this.headers() });
      setTimeout(() => {
        this.loadKillStatus();
        this.loadDashboard();
      }, 3000);
    } catch (err) {
      this.showToast("Revive failed", "error");
    }
  },

  // Invites
  async loadInvites() {
    const wrap = document.getElementById("invites-list");
    try {
      const res = await fetch(api("/api/invites"));
      if (!res.ok) throw new Error("Failed to load invites");
      const invites = await res.json();
      if (invites.length === 0) {
        wrap.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            </div>
            <h4>No invite links yet</h4>
            <p>Create an invite link to start sharing VPN access with others.</p>
            <button class="btn btn-primary btn-sm" onclick="app.createInvite()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Create Your First Invite
            </button>
          </div>
        `;
        return;
      }

      // Desktop table
      const desktopHTML = `
        <div class="desktop-invite-table">
          <table>
            <thead>
              <tr>
                <th>Label</th>
                <th>Link</th>
                <th>Used</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${invites.map(inv => `
                <tr>
                  <td style="font-family:var(--font-display)">${this.esc(inv.label || "-")}</td>
                  <td style="max-width:180px">
                    <code style="font-size:11px;cursor:pointer;color:var(--accent);display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" onclick="app.copyText('${this.esc(inv.link)}')" title="Click to copy">${this.esc(inv.link)}</code>
                  </td>
                  <td>${inv.referralCount}/${inv.maxReferrals}</td>
                  <td class="nowrap">${this.fmtDate(inv.createdAt)}</td>
                  <td class="actions">
                    <button class="btn btn-ghost btn-sm" onclick="app.copyText('${this.esc(inv.link)}')">Copy</button>
                    <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="app.deleteInvite(${inv.id})">Delete</button>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `;

      // Mobile cards
      const mobileHTML = `
        <div class="mobile-invite-cards invite-cards">
          ${invites.map(inv => `
            <div class="invite-card">
              <div class="invite-card-label">${this.esc(inv.label || "Invite Link")}</div>
              <div class="invite-card-link" onclick="app.copyText('${this.esc(inv.link)}')" title="Tap to copy">${this.esc(inv.link)}</div>
              <div class="invite-card-meta">
                <span>Used: ${inv.referralCount}/${inv.maxReferrals}</span>
                <span>${this.fmtDate(inv.createdAt)}</span>
              </div>
              <div class="invite-card-actions">
                <button class="btn btn-ghost btn-sm" style="flex:1" onclick="app.copyText('${this.esc(inv.link)}')">Copy Link</button>
                <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="app.deleteInvite(${inv.id})">Delete</button>
              </div>
            </div>
          `).join("")}
        </div>
      `;

      wrap.innerHTML = desktopHTML + mobileHTML;
    } catch (err) {
      wrap.innerHTML = `<div class="error-banner">Failed to load invites: ${this.esc(err.message)}</div>`;
    }
  },

  async createInvite() {
    const label = await this.showPrompt("New Invite", "Label for this invite (optional):", "Admin Invite");
    if (label === null) return;

    try {
      const res = await fetch(api("/api/invites"), {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ label: label || "Admin Invite", maxReferrals: 999 }),
      });
      if (!res.ok) throw new Error("Failed to create invite");
      const data = await res.json();
      await this.copyText(data.link);
      this.loadInvites();
    } catch (err) {
      this.showToast("Failed to create invite", "error");
    }
  },

  async deleteInvite(id) {
    const ok = await this.showConfirm("Delete Invite", "Delete this invite link?", { danger: true });
    if (!ok) return;
    try {
      await fetch(api(`/api/invites/${id}`), { method: "DELETE", headers: this.headers() });
      this.loadInvites();
    } catch (err) {
      this.showToast("Failed to delete invite", "error");
    }
  },

  // Settings
  settingsData: [],

  async loadSettings() {
    try {
      const res = await fetch(api("/api/settings"));
      if (!res.ok) throw new Error("Failed to load settings");
      this.settingsData = await res.json();
      this.renderSettings();
      setTimeout(() => {
        this.settingsSnapshot = this.getSettingsValues();
        this.setupSettingsChangeTracking();
        this.updateSaveButton();
      }, 50);
    } catch (err) {
      document.getElementById("settings-bot").innerHTML =
        `<div class="error-banner">Failed to load settings: ${this.esc(err.message)}</div>`;
    }
  },

  renderSettings() {
    const byKey = Object.fromEntries(this.settingsData.map(s => [s.key, s]));

    const distributionKeys = [
      "feature.referralSystem", "feature.inviteLinks", "feature.webApp",
      "feature.registrationOpen", "feature.qrCodes", "feature.languagePicker",
    ];
    const protocolKeys = [
      "feature.marzban", "feature.amneziaWg", "feature.naiveProxy", "feature.naiveProxyQuic",
      "feature.openvpnCloak", "feature.shadowTls", "feature.hysteria2",
      "feature.tuic", "feature.trojan", "feature.sshTunnel", "feature.strictRoute",
    ];
    const tunnelKeys = [
      "feature.dnstt", "feature.npvTunnel", "feature.mieru", "feature.mtprotoProxy",
    ];

    const bot = this.settingsData.filter(s => s.category === "bot");
    const web = this.settingsData.filter(s => s.category === "web");
    const service = this.settingsData.filter(s => s.category === "service");

    document.getElementById("settings-bot").innerHTML = bot.map(s => this.settingField(s)).join("");
    document.getElementById("settings-web").innerHTML = web.map(s => this.settingField(s)).join("");
    document.getElementById("settings-distribution").innerHTML =
      distributionKeys.filter(k => byKey[k]).map(k => this.settingToggle(byKey[k])).join("");
    document.getElementById("settings-protocols").innerHTML =
      protocolKeys.filter(k => byKey[k]).map(k => this.settingToggle(byKey[k])).join("");
    document.getElementById("settings-tunnels").innerHTML =
      tunnelKeys.filter(k => byKey[k]).map(k => this.settingToggle(byKey[k])).join("");
    // Service: render by actual type — booleans as toggles, strings as text inputs
    document.getElementById("settings-service").innerHTML =
      service.map(s => s.type === "boolean" ? this.settingToggle(s) : this.settingField(s)).join("");
  },

  getSettingsValues() {
    const values = {};
    document.querySelectorAll("#tab-settings .setting-input").forEach(input => {
      values[input.dataset.key] = input.value;
    });
    document.querySelectorAll("#tab-settings .toggle input[type='checkbox']").forEach(input => {
      values[input.dataset.key] = input.checked ? "true" : "false";
    });
    return values;
  },

  setupSettingsChangeTracking() {
    const handler = () => this.updateSaveButton();
    document.querySelectorAll("#tab-settings .setting-input").forEach(input => {
      input.addEventListener("input", handler);
    });
    document.querySelectorAll("#tab-settings .toggle input[type='checkbox']").forEach(input => {
      input.addEventListener("change", handler);
    });
  },

  updateSaveButton() {
    const current = this.getSettingsValues();
    const hasChanges = this.settingsSnapshot && JSON.stringify(current) !== JSON.stringify(this.settingsSnapshot);
    const btn = document.getElementById("save-settings-btn");
    const indicator = document.getElementById("unsaved-indicator");
    if (btn) btn.disabled = !hasChanges;
    if (indicator) indicator.classList.toggle("visible", hasChanges);
  },

  settingField(s) {
    const inputType = s.type === "number" ? "number" : "text";
    return `
      <div class="setting-item">
        <div class="setting-info">
          <label class="setting-label">${this.esc(this.readableKey(s.key))}</label>
          <span class="setting-key">${this.esc(s.key)}</span>
          <span class="setting-desc">${this.esc(s.description)}</span>
        </div>
        <input type="${inputType}" class="setting-input" data-key="${this.esc(s.key)}" value="${this.esc(s.currentValue)}" placeholder="${this.esc(s.defaultValue)}">
      </div>
    `;
  },

  settingToggle(s) {
    const checked = s.currentValue === "true" ? "checked" : "";
    return `
      <div class="setting-item setting-item-toggle">
        <div class="setting-info">
          <label class="setting-label">${this.esc(this.readableKey(s.key))}</label>
          <span class="setting-desc">${this.esc(s.description)}</span>
        </div>
        <label class="toggle">
          <input type="checkbox" data-key="${this.esc(s.key)}" ${checked}>
          <span class="toggle-slider"></span>
        </label>
      </div>
    `;
  },

  async saveSettings() {
    const updates = {};
    document.querySelectorAll("#tab-settings .setting-input").forEach(input => {
      updates[input.dataset.key] = input.value;
    });
    document.querySelectorAll("#tab-settings .toggle input[type='checkbox']").forEach(input => {
      updates[input.dataset.key] = input.checked ? "true" : "false";
    });

    try {
      const res = await fetch(api("/api/settings"), {
        method: "PATCH",
        headers: this.headers(),
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        this.showToast(`${data.updated.length} settings saved`);
        this.settingsSnapshot = this.getSettingsValues();
        this.updateSaveButton();
      } else {
        this.showToast("Failed to save settings", "error");
      }
    } catch {
      this.showToast("Failed to save settings", "error");
    }
  },

  copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
      this.showToast("Copied to clipboard");
    });
  },

  copyDeepLink(appType, subUrl) {
    const encoded = encodeURIComponent(subUrl);
    const link = appType === "hiddify"
      ? `hiddify://import/${encoded}`
      : `sing-box://import-remote-profile?url=${encoded}`;
    navigator.clipboard.writeText(link).then(() => {
      this.showToast(`${appType === "hiddify" ? "Hiddify" : "sing-box"} deep link copied`);
    });
  },

  saveQrPng(containerId) {
    const container = document.getElementById(containerId);
    const svg = container && container.querySelector("svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 512, 512);
      ctx.drawImage(img, 0, 0, 512, 512);
      const a = document.createElement("a");
      a.download = "shadowshare-qr.png";
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  },

  downloadJson(url) {
    // Open the URL directly — the endpoint returns Content-Disposition: attachment
    // which triggers a download. This avoids CORS issues since the admin panel
    // is on a different origin (the admin host) than the API (the public web app host).
    window.open(url, "_blank");
  },

  showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    const icon = type === "error"
      ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>'
      : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    toast.innerHTML = `${icon} ${message}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  },

  // Helpers
  esc(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  },

  fmtDate(s) {
    if (!s) return "-";
    const d = new Date(s);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  },

  formatLocale(u) {
    const flagMap = {
      fa: "\u{1F1EE}\u{1F1F7}", en: "\u{1F1FA}\u{1F1F8}", ru: "\u{1F1F7}\u{1F1FA}",
      zh: "\u{1F1E8}\u{1F1F3}", ar: "\u{1F1F8}\u{1F1E6}", tr: "\u{1F1F9}\u{1F1F7}",
      uk: "\u{1F1FA}\u{1F1E6}", de: "\u{1F1E9}\u{1F1EA}", fr: "\u{1F1EB}\u{1F1F7}",
      es: "\u{1F1EA}\u{1F1F8}",
    };
    const langLabel = { en: "English", fa: "Farsi", pi: "Finglish" };
    const flag = flagMap[u.telegramLangCode] || "";
    const region = flag ? `${flag} ${u.telegramLangCode}` : "-";
    const chosen = langLabel[u.language] || u.language || "-";
    return `${region} · ${chosen}`;
  },

  protocolDots(protocols) {
    if (!protocols) return "-";
    const dots = [
      { key: "marzban", label: "Marzban (VLESS)" },
      { key: "singbox", label: "sing-box" },
      { key: "amneziawg", label: "AmneziaWG" },
    ];
    return `<span class="protocol-dots" title="${dots.filter(d => protocols[d.key]).map(d => d.label).join(", ")}">${dots.map(d =>
      `<span class="protocol-dot ${d.key} ${protocols[d.key] ? "active" : ""}" title="${d.label}"></span>`
    ).join("")}</span>`;
  },

  // ── Monitoring ──
  async loadMonitoring() {
    this.loadProtocolHealth();
    this.loadConnectivityTimeline();
    this.loadConnectivityEvents();
    this.loadMasterdnsStats();
    this.loadMasterdnsHistory();
    this.loadDnsttStats();
    this.loadMtprotoStats();
    this.loadDnsResolvers();
    this.setupTimelineRangeButtons();
    this.setupMasterdnsRangeButtons();
    // Auto-refresh every 30 seconds
    if (this.monitoringPollTimer) clearInterval(this.monitoringPollTimer);
    this.monitoringPollTimer = setInterval(() => {
      if (this.currentTab === "monitoring") {
        this.loadProtocolHealth();
        this.loadMasterdnsStats();
        this.loadDnsttStats();
        this.loadMtprotoStats();
      }
    }, 30000);
  },

  setupMasterdnsRangeButtons() {
    const wrap = document.getElementById("masterdns-history-range");
    if (!wrap) return;
    wrap.querySelectorAll("button").forEach((btn) => {
      btn.onclick = () => {
        wrap.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.masterdnsHistoryHours = parseInt(btn.dataset.hours, 10);
        this.loadMasterdnsHistory();
      };
    });
  },

  async loadMasterdnsStats() {
    try {
      const res = await fetch(api("/api/monitoring/masterdns"));
      if (!res.ok) return;
      const data = await res.json();
      const panel = document.getElementById("masterdns-panel");
      if (!panel) return;
      panel.style.display = "block";

      const badge = document.getElementById("masterdns-status-badge");
      if (data.active > 0) {
        badge.className = "badge badge-online";
        badge.textContent = "Active";
      } else {
        badge.className = "badge badge-idle";
        badge.textContent = "No traffic";
      }

      document.getElementById("masterdns-stats-row").innerHTML = `
        ${this.statCard("Active sessions", data.active || 0, data.active > 0 ? "success" : "", "success")}
        ${this.statCard("Live upload", this.formatBytes(data.upload || 0), "", "info")}
        ${this.statCard("Live download", this.formatBytes(data.download || 0), "", "warning")}
        ${this.statCard("Live total", this.formatBytes(data.totalBytes || 0), "", "default")}
      `;

      const dnstm = data.dnstm || { rxBytes: 0, txBytes: 0, totalBytes: 0 };
      const sb = data.singbox || { rxBytes: 0, txBytes: 0, totalBytes: 0 };
      document.getElementById("masterdns-container-row").innerHTML = `
        ${this.statCard("dnstm rx", this.formatBytes(dnstm.rxBytes), "since restart", "default")}
        ${this.statCard("dnstm tx", this.formatBytes(dnstm.txBytes), "since restart", "default")}
        ${this.statCard("singbox rx", this.formatBytes(sb.rxBytes), "since restart", "default")}
        ${this.statCard("singbox tx", this.formatBytes(sb.txBytes), "since restart", "default")}
      `;

      const destWrap = document.getElementById("masterdns-destinations");
      const dests = data.topDestinations || [];
      if (dests.length === 0) {
        destWrap.innerHTML = '<div class="loading">No active destinations</div>';
      } else {
        destWrap.innerHTML = `
          <table class="data-table">
            <thead><tr><th>Host</th><th>Connections</th></tr></thead>
            <tbody>${dests.map(d => `
              <tr><td><code>${this.esc(d.host)}</code></td><td>${d.count}</td></tr>
            `).join("")}</tbody>
          </table>
        `;
      }
    } catch {
      const panel = document.getElementById("masterdns-panel");
      if (panel) panel.style.display = "none";
    }
  },

  async loadMasterdnsHistory() {
    try {
      const res = await fetch(api(`/api/monitoring/masterdns/history?hours=${this.masterdnsHistoryHours}`));
      if (!res.ok) return;
      const data = await res.json();
      const canvas = document.getElementById("masterdns-history-chart");
      if (!canvas) return;
      const points = data.points || [];

      const labels = points.map((p) => {
        const d = new Date(p.t);
        return this.masterdnsHistoryHours > 48
          ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric" })
          : d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      });

      const sessions = points.map((p) => p.sessions);
      const downKbps = points.map((p) => +(p.downloadBps / 1024).toFixed(2));
      const upKbps = points.map((p) => +(p.uploadBps / 1024).toFixed(2));

      if (this.masterdnsChart) this.masterdnsChart.destroy();
      this.masterdnsChart = new Chart(canvas, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Active sessions",
              data: sessions,
              yAxisID: "ySessions",
              borderColor: "rgba(52, 211, 153, 1)",
              backgroundColor: "rgba(52, 211, 153, 0.15)",
              borderWidth: 2,
              tension: 0.3,
              pointRadius: 0,
              fill: true,
            },
            {
              label: "Download (KB/s)",
              data: downKbps,
              yAxisID: "yBytes",
              borderColor: "rgba(251, 146, 60, 1)",
              backgroundColor: "rgba(251, 146, 60, 0.1)",
              borderWidth: 1.5,
              tension: 0.3,
              pointRadius: 0,
            },
            {
              label: "Upload (KB/s)",
              data: upKbps,
              yAxisID: "yBytes",
              borderColor: "rgba(56, 189, 248, 1)",
              backgroundColor: "rgba(56, 189, 248, 0.1)",
              borderWidth: 1.5,
              tension: 0.3,
              pointRadius: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          scales: {
            x: { ticks: { color: cssVar("--text-dim"), maxTicksLimit: 10 }, grid: { color: cssVar("--border") } },
            ySessions: {
              type: "linear",
              position: "left",
              beginAtZero: true,
              ticks: { color: "#34d399", stepSize: 1 },
              grid: { color: cssVar("--border") },
              title: { display: true, text: "sessions", color: "#34d399" },
            },
            yBytes: {
              type: "linear",
              position: "right",
              beginAtZero: true,
              ticks: { color: "#fb923c" },
              grid: { drawOnChartArea: false },
              title: { display: true, text: "KB/s", color: "#fb923c" },
            },
          },
          plugins: {
            legend: { labels: { color: cssVar("--text-secondary"), usePointStyle: true, pointStyle: "circle" } },
          },
        },
      });
    } catch {
      // chart silently absent if it errors
    }
  },

  async loadDnsttStats() {
    try {
      const res = await fetch(api("/api/monitoring/dnstt"));
      if (!res.ok) return;
      const data = await res.json();

      const panel = document.getElementById("dnstt-panel");
      panel.style.display = "block";

      const badge = document.getElementById("dnstt-status-badge");
      if (data.active > 0) {
        badge.className = "badge badge-online";
        badge.textContent = "Active";
      } else {
        badge.className = "badge badge-idle";
        badge.textContent = "No traffic";
      }

      const totalUp = (data.sources || []).reduce((s, x) => s + x.upload, 0);
      const totalDown = (data.sources || []).reduce((s, x) => s + x.download, 0);

      document.getElementById("dnstt-stats-row").innerHTML = `
        ${this.statCard("Connections", data.active || 0, data.active > 0 ? "success" : "", "success")}
        ${this.statCard("Upload", this.formatBytes(totalUp), "", "info")}
        ${this.statCard("Download", this.formatBytes(totalDown), "", "warning")}
        ${this.statCard("DNSTT Users", data.totalUsers || 0, "", "default")}
      `;

      const sourcesWrap = document.getElementById("dnstt-sources");
      if (!data.sources || data.sources.length === 0) {
        sourcesWrap.innerHTML = '<div class="loading">No active DNS tunnel sessions</div>';
      } else {
        sourcesWrap.innerHTML = `
          <table class="data-table">
            <thead><tr>
              <th>Source IP</th>
              <th>Conns</th>
              <th>Upload</th>
              <th>Download</th>
              <th>Destinations</th>
              <th>Since</th>
            </tr></thead>
            <tbody>${data.sources.map(s => `
              <tr>
                <td><code>${this.esc(s.ip)}</code></td>
                <td>${s.connections}</td>
                <td>${this.formatBytes(s.upload)}</td>
                <td>${this.formatBytes(s.download)}</td>
                <td class="ellipsis-cell">${(s.destinations || []).map(d => this.esc(d)).join(", ") || "—"}</td>
                <td>${this.timeAgo(s.since)}</td>
              </tr>
            `).join("")}</tbody>
          </table>
        `;
      }
    } catch {
      const panel = document.getElementById("dnstt-panel");
      if (panel) panel.style.display = "none";
    }
  },

  async loadMtprotoStats() {
    try {
      const res = await fetch(api("/api/monitoring/mtproto"));
      if (!res.ok) return;
      const data = await res.json();

      const panel = document.getElementById("mtproto-panel");
      if (!data.enabled) { panel.style.display = "none"; return; }
      panel.style.display = "block";

      const badge = document.getElementById("mtproto-status-badge");
      if (data.connections > 0) {
        badge.className = "badge badge-online";
        badge.textContent = "Active";
      } else {
        badge.className = "badge badge-idle";
        badge.textContent = "No connections";
      }

      document.getElementById("mtproto-stats-row").innerHTML = `
        ${this.statCard("Connections", data.connections || 0, data.connections > 0 ? "success" : "", "success")}
        ${this.statCard("Upload", this.formatBytes(data.txBytes), "", "info")}
        ${this.statCard("Download", this.formatBytes(data.rxBytes), "", "warning")}
        ${this.statCard("Total Traffic", this.formatBytes(data.totalBytes), "", "default")}
      `;
    } catch {
      const panel = document.getElementById("mtproto-panel");
      if (panel) panel.style.display = "none";
    }
  },

  async loadDnsResolvers() {
    const panel = document.getElementById("dns-resolvers-panel");
    if (!panel) return;
    try {
      const res = await fetch(api("/api/monitoring/dns-resolvers"));
      if (!res.ok) return;
      const data = await res.json();
      if (!data.enabled) { panel.style.display = "none"; return; }
      panel.style.display = "block";
      const list = document.getElementById("dns-resolvers-list");

      const statsHtml = `
        <div class="stats-grid" style="margin-bottom:12px">
          ${this.statCard("Last Scan", data.lastScanAt ? this.timeAgo(data.lastScanAt) : "Never", "", "default")}
          ${this.statCard("Bundled Pool", data.bundledPoolSize ? data.bundledPoolSize.toLocaleString() + " IPs" : "—", "", "info")}
          ${this.statCard("Sampled", data.sampledCount || 0, data.sampledCount > 0 ? "success" : "", "success")}
          ${this.statCard("Source", "Pre-verified Iranian ISP resolvers", "", "default")}
        </div>
      `;

      if (!data.resolvers || data.resolvers.length === 0) {
        list.innerHTML = statsHtml + '<div class="loading">No resolvers in pool yet. Click "Refresh Now" to sample from bundled list.</div>';
        return;
      }

      list.innerHTML = statsHtml + `
        <table class="data-table">
          <thead><tr><th>#</th><th>Resolver IP</th><th>Sampled</th></tr></thead>
          <tbody>${data.resolvers.map(r => `
            <tr>
              <td>${r.rank}</td>
              <td><code>${this.esc(r.ip)}</code></td>
              <td>${r.verifiedAt ? this.timeAgo(r.verifiedAt) : "—"}</td>
            </tr>
          `).join("")}</tbody>
        </table>
        <p class="meta-text" style="margin-top:8px">These IPs are randomly sampled from a bundled list of ${data.bundledPoolSize ? data.bundledPoolSize.toLocaleString() : "~7,854"} pre-verified Iranian ISP DNS resolvers. Users in Iran can reach these directly. Rotated every 24 hours.</p>
      `;
    } catch {
      if (panel) panel.style.display = "none";
    }
  },

  async refreshDnsResolvers() {
    const btn = document.getElementById("dns-resolvers-refresh-btn");
    if (btn) btn.disabled = true;
    try {
      const res = await fetch(api("/api/monitoring/dns-resolvers/refresh"), { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        this.showToast(`Resolver pool refreshed: ${data.count} IPs sampled`, "success");
        await this.loadDnsResolvers();
      } else {
        this.showToast(data.error || "Refresh failed", "error");
      }
    } catch (err) {
      this.showToast("Refresh failed: " + err.message, "error");
    } finally {
      if (btn) btn.disabled = false;
    }
  },

  async loadProtocolHealth() {
    try {
      const res = await fetch(api("/api/monitoring/connectivity"));
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const wrap = document.getElementById("protocol-health");
      const pollLabel = document.getElementById("monitoring-last-poll");

      if (!data.providers || data.providers.length === 0) {
        wrap.innerHTML = '<div class="loading">No connectivity data yet. First poll runs ~30s after startup.</div>';
        pollLabel.textContent = "";
        return;
      }

      pollLabel.textContent = `Last poll: ${this.timeAgo(data.lastPoll)}`;

      const providerLabels = { marzban: "Marzban (VLESS)", outline: "Outline (SS)", singbox: "sing-box", amneziawg: "AmneziaWG" };
      wrap.innerHTML = data.providers.map(p => `
        <div class="health-card health-${p.health}">
          <div class="health-card-title">
            <span>${providerLabels[p.provider] || p.provider}</span>
            <div class="health-indicator"></div>
          </div>
          <div class="health-card-stats">
            <span class="online-count">${p.onlineCount}</span>
            <span class="total-count">/ ${p.totalUsers} online</span>
          </div>
        </div>
      `).join("");
    } catch {
      document.getElementById("protocol-health").innerHTML =
        '<div class="error-banner">Failed to load protocol health</div>';
    }
  },

  setupTimelineRangeButtons() {
    document.querySelectorAll(".timeline-range").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".timeline-range").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.monitoringTimelineHours = parseInt(btn.dataset.hours, 10);
        this.loadConnectivityTimeline();
      });
    });
  },

  async loadConnectivityTimeline() {
    try {
      const res = await fetch(api(`/api/monitoring/timeline?hours=${this.monitoringTimelineHours}`));
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();

      const canvas = document.getElementById("connectivity-timeline-chart");
      if (!canvas) return;

      const providerColors = {
        marzban: "rgba(167, 139, 250, 0.7)",
        outline: "rgba(56, 189, 248, 0.7)",
        singbox: "rgba(52, 211, 153, 0.7)",
        amneziawg: "rgba(251, 146, 60, 0.7)",
      };
      const providerLabels = { marzban: "Marzban", outline: "Outline", singbox: "sing-box", amneziawg: "AWG" };

      const datasets = Object.entries(data.series || {}).map(([provider, values]) => ({
        label: providerLabels[provider] || provider,
        data: values,
        backgroundColor: providerColors[provider] || "rgba(148, 163, 184, 0.5)",
        borderColor: (providerColors[provider] || "rgba(148, 163, 184, 0.5)").replace("0.7", "1"),
        borderWidth: 1,
        fill: true,
        tension: 0.3,
        pointRadius: 0,
      }));

      const labels = (data.timestamps || []).map(t => {
        const d = new Date(t);
        return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      });

      if (this.connectivityChart) this.connectivityChart.destroy();
      this.connectivityChart = new Chart(canvas, {
        type: "line",
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          scales: {
            x: { ticks: { color: cssVar("--text-dim"), maxTicksLimit: 12 }, grid: { color: cssVar("--border") } },
            y: { stacked: true, beginAtZero: true, ticks: { color: cssVar("--text-dim"), stepSize: 1 }, grid: { color: cssVar("--border") } },
          },
          plugins: {
            legend: { labels: { color: cssVar("--text-secondary"), usePointStyle: true, pointStyle: "circle" } },
          },
        },
      });
    } catch {
      // Silently fail — chart won't render
    }
  },

  async loadConnectivityEvents() {
    try {
      const res = await fetch(api("/api/monitoring/events?limit=30"));
      if (!res.ok) throw new Error("Failed");
      const events = await res.json();
      const wrap = document.getElementById("connectivity-events");

      if (events.length === 0) {
        wrap.innerHTML = '<div class="loading">No connectivity events detected yet.</div>';
        return;
      }

      const typeLabels = {
        mass_disconnect: "Mass Disconnect",
        protocol_block: "Protocol Block",
        mass_reconnect: "Mass Reconnect",
      };
      const typeDescriptions = {
        mass_disconnect: (e) => `${e.affectedCount} of ${e.totalActive} users went offline. Likely: network disruption / government blocking.`,
        protocol_block: (e) => {
          const protocols = JSON.parse(e.affectedProtocols || "[]");
          return `All ${protocols.join(", ")} users offline, other providers still connected. Likely: protocol-specific DPI blocking.`;
        },
        mass_reconnect: (e) => `${e.affectedCount} users came back online.`,
      };

      wrap.innerHTML = events.map(e => `
        <div class="event-item">
          <div class="event-severity ${e.severity}"></div>
          <div class="event-content">
            <div class="event-title">${typeLabels[e.eventType] || e.eventType}</div>
            <div class="event-detail">${(typeDescriptions[e.eventType] || (() => ""))(e)}</div>
          </div>
          <div class="event-time">${this.timeAgo(e.createdAt)}</div>
        </div>
      `).join("");
    } catch {
      document.getElementById("connectivity-events").innerHTML =
        '<div class="error-banner">Failed to load events</div>';
    }
  },

  renderConnectionHistory(history) {
    if (!history || history.length === 0) return "";
    // Group by provider → list of {snapshotAt, isOnline}
    const byProvider = {};
    for (const snap of history) {
      if (!byProvider[snap.provider]) byProvider[snap.provider] = [];
      byProvider[snap.provider].push(snap);
    }

    const providerLabels = { marzban: "Marzban", outline: "Outline", singbox: "sing-box", amneziawg: "AWG" };

    let html = '<div class="conn-history-timeline">';
    for (const [provider, snaps] of Object.entries(byProvider)) {
      const segments = snaps.map((s, i) => {
        const width = 100 / snaps.length;
        return `<div class="conn-seg ${s.isOnline ? "online" : "offline"}" style="width:${width}%" title="${new Date(s.snapshotAt).toLocaleTimeString()} - ${s.isOnline ? "Online" : "Offline"}"></div>`;
      }).join("");
      html += `
        <div class="conn-history-row">
          <span class="conn-history-label">${providerLabels[provider] || provider}</span>
          <div class="conn-history-bar">${segments}</div>
        </div>`;
    }
    html += "</div>";
    return html;
  },

  readableKey(key) {
    const name = key.includes(".") ? key.split(".").pop() : key;
    return name
      .replace(/([A-Z])/g, " $1")
      .replace(/[._-]/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase())
      .trim();
  },
};

// Bind login form
document.getElementById("login-form").addEventListener("submit", (e) => app.login(e));

// Handle Enter in prompt modal
document.getElementById("prompt-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") app.resolvePrompt();
});

// Start
app.init();
