import { Hono } from "hono";
import { config } from "../../config.js";

interface BillingItem {
  service: string;
  provider: string;
  detail: string;
  monthlyCost: number;
  currency: string;
}

interface BillingResponse {
  items: BillingItem[];
  totalMonthly: number;
  currency: string;
  period: string;
  errors: string[];
}

const billing = new Hono();

billing.get("/billing", async (c) => {
  const items: BillingItem[] = [];
  const errors: string[] = [];

  const now = new Date();
  const period = now.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // Fetch Hetzner servers — calculate actual charges from hourly rate × uptime this month
  if (config.hetznerApiToken) {
    try {
      const res = await fetch("https://api.hetzner.cloud/v1/servers", {
        headers: { Authorization: `Bearer ${config.hetznerApiToken}` },
      });
      if (!res.ok)
        throw new Error(`Hetzner API ${res.status}`);
      const data = (await res.json()) as any;

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      for (const server of data.servers || []) {
        const prices = server.server_type?.prices || [];
        const locPrice = prices.find((p: any) => p.location === server.datacenter?.location?.name);
        const price = locPrice || prices[0];
        const hourlyRate = price ? parseFloat(price.price_hourly?.gross || "0") : 0;
        const monthlyCap = price ? parseFloat(price.price_monthly?.gross || "0") : 0;

        // Calculate billable hours this month
        const created = new Date(server.created);
        const billingStart = created > startOfMonth ? created : startOfMonth;
        const hoursThisMonth = Math.max(0, (now.getTime() - billingStart.getTime()) / (1000 * 60 * 60));
        // Hetzner bills hourly, capped at monthly price
        const actualCost = Math.min(hoursThisMonth * hourlyRate, monthlyCap);

        const hoursDisplay = Math.floor(hoursThisMonth);
        items.push({
          service: server.name,
          provider: "Hetzner",
          detail: `${server.server_type?.description || server.server_type?.name} — ${server.datacenter?.location?.city || server.datacenter?.name} — ${hoursDisplay}h @ €${hourlyRate.toFixed(4)}/h (cap €${monthlyCap.toFixed(2)})`,
          monthlyCost: Math.round(actualCost * 100) / 100,
          currency: "EUR",
        });
      }
    } catch (err: any) {
      errors.push(`Hetzner: ${err.message}`);
    }
  }

  // Cloudflare — free plan indicator
  if (config.cloudflareApiKey) {
    items.push({
      service: "Workers & CDN",
      provider: "Cloudflare",
      detail: "Free plan — 100k requests/day",
      monthlyCost: 0,
      currency: "USD",
    });
  }

  // Calculate totals (group by currency)
  const eurTotal = items
    .filter((i) => i.currency === "EUR")
    .reduce((s, i) => s + i.monthlyCost, 0);
  const usdTotal = items
    .filter((i) => i.currency === "USD")
    .reduce((s, i) => s + i.monthlyCost, 0);
  // Approximate EUR→USD for combined total (rough estimate)
  const totalUsd = Math.round((eurTotal * 1.08 + usdTotal) * 100) / 100;

  return c.json({
    items,
    totalMonthly: totalUsd,
    eurTotal: Math.round(eurTotal * 100) / 100,
    usdTotal: Math.round(usdTotal * 100) / 100,
    currency: "USD",
    period,
    errors,
  } satisfies BillingResponse & { eurTotal: number; usdTotal: number });
});

export { billing as billingRoutes };
