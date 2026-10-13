"use client";

// /admin/stats — the owner's dashboard (13.10.2026). OWNER ONLY.
//
// One page with the numbers the owner asked for: how many people visited,
// signed up, uploaded a selfie and bought a pack (as a funnel, with the
// share that went on to each next step), repeat buyers, money in and out,
// taps on each hair-care product, the review averages, and the affiliate
// income he types in each month from the Amazon and EarnKaro dashboards
// (those shops don't say which customer bought what). The owner's own test
// activity is left out of every number.

import { useEffect, useState } from "react";
import OwnerGate from "@/components/admin/OwnerGate";
import { authHeaders } from "@/lib/authClient";
import { PERIODS, rupees, stepRate, type Period } from "@/lib/stats";
import { shopLabel, type ShopId } from "@/lib/content/haircare";
import { PACK_TIERS, type PackTier } from "@/lib/pricing";
import { REVIEW_SECTIONS, REVIEW_SECTION_IDS, type ReviewSection } from "@/lib/reviews";

interface Stats {
  visitors: number;
  page_views: number;
  returning_visitors: number;
  signups: number;
  selfies: number;
  selfie_people: number;
  hairstyles_made: number;
  orders: number;
  buyers: number;
  repeat_buyers: number;
  revenue_paise: number;
  fees_paise: number;
  ai_cost_paise: number;
  by_pack: Record<string, number>;
  product_clicks: { id: string; title: string; brand: string | null; clicks: number; by_shop: Record<string, number> }[];
  shop_clicks: Record<string, number>;
  ratings: Partial<Record<ReviewSection, { avg: number; count: number; pending: number }>>;
  affiliate_income_paise: number;
}

interface Income {
  id: string;
  month: string;
  source: "amazon" | "earnkaro" | "other";
  amount_paise: number;
  note: string | null;
}

const SOURCES = { amazon: "Amazon Associates", earnkaro: "EarnKaro (Flipkart, Nykaa…)", other: "Other" } as const;
const input =
  "w-full rounded-sm2 border border-line bg-surface px-3.5 py-2.5 text-[15px] outline-none focus:border-mint-deep";

function nameOfShop(id: string) {
  return ["amazon", "flipkart", "nykaa", "myntra", "brand"].includes(id) ? shopLabel(id as ShopId) : id;
}

function Tile({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="rounded-[16px] bg-surface p-4 shadow-card">
      <p className="text-[13px] font-semibold uppercase tracking-[.03em] text-ink-muted">{label}</p>
      <p className="mt-1 font-heading text-[26px] font-semibold leading-tight text-ink-heading">{value}</p>
      {note && <p className="mt-0.5 text-[12.5px] text-ink-muted">{note}</p>}
    </div>
  );
}

function Dashboard() {
  const [period, setPeriod] = useState<Period>("30");
  const [stats, setStats] = useState<Stats | null>(null);
  const [income, setIncome] = useState<Income[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ month: new Date().toISOString().slice(0, 7), source: "amazon", amount: "" });
  const [saving, setSaving] = useState(false);

  async function load(p: Period) {
    setError(null);
    const res = await fetch(`/api/admin/stats?period=${p}`, { headers: await authHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Couldn't load the numbers.");
      return;
    }
    setStats(data.stats);
    setIncome(data.income ?? []);
  }

  useEffect(() => {
    load(period);
  }, [period]);

  async function saveIncome() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/income", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ month: form.month, source: form.source, amount: Number(form.amount) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error ?? "Couldn't save it.");
      else {
        setForm({ ...form, amount: "" });
        await load(period);
      }
    } finally {
      setSaving(false);
    }
  }

  async function removeIncome(id: string) {
    await fetch(`/api/admin/income?id=${encodeURIComponent(id)}`, { method: "DELETE", headers: await authHeaders() });
    await load(period);
  }

  const s = stats;
  const funnel = s
    ? [
        { label: "Visited the site", n: s.visitors },
        { label: "Signed up", n: s.signups },
        { label: "Uploaded a selfie", n: s.selfie_people },
        { label: "Bought a pack", n: s.buyers },
        { label: "Bought again (repeat)", n: s.repeat_buyers },
      ]
    : [];
  const widest = Math.max(1, ...funnel.map((f) => f.n));
  const profit = s ? s.revenue_paise - s.fees_paise - s.ai_cost_paise : 0;

  return (
    <>
      <h1 className="h-display">Dashboard</h1>
      <p className="lead mt-3 max-w-[66ch]">
        Your own test activity (the owner account) is left out of every number. Visit counting started on 13 October
        2026, so earlier sign-ups have no visit before them.
      </p>

      <div role="tablist" aria-label="Period" className="mt-6 flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={period === p.id}
            onClick={() => setPeriod(p.id)}
            className={`rounded-full border-[1.5px] px-4 py-2 text-[14.5px] font-semibold transition ${
              period === p.id ? "border-mint bg-mint text-white" : "border-line bg-surface text-ink-heading hover:border-ink-heading"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {error && <p className="mt-5 rounded-sm2 bg-danger/10 px-4 py-3 text-[14.5px] font-medium text-danger">{error}</p>}
      {!s && !error && <p className="mt-8 text-ink-muted">Loading…</p>}

      {s && (
        <>
          <h2 className="mt-10 text-[21px] font-semibold">From visit to purchase</h2>
          <ol className="mt-4 flex max-w-[760px] flex-col gap-3">
            {funnel.map((step, i) => {
              const rate = i === 0 ? null : stepRate(step.n, funnel[i - 1].n);
              return (
                <li key={step.label}>
                  <div className="flex items-baseline justify-between gap-3 text-[15px]">
                    <span className="font-semibold text-ink-heading">{step.label}</span>
                    <span className="text-ink-muted">
                      <strong className="font-heading text-[18px] text-ink-heading">{step.n.toLocaleString("en-IN")}</strong>
                      {rate !== null && <span className="ml-2 text-[13.5px]">{rate}% of the step before</span>}
                    </span>
                  </div>
                  <div className="mt-1.5 h-3 rounded-full bg-bg-soft">
                    <div className="h-3 rounded-full bg-mint" style={{ width: `${Math.max(step.n ? 2 : 0, (step.n / widest) * 100)}%` }} />
                  </div>
                </li>
              );
            })}
          </ol>

          <h2 className="mt-10 text-[21px] font-semibold">Money</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Tile label="Pack sales" value={rupees(s.revenue_paise)} note={`${s.orders} order${s.orders === 1 ? "" : "s"}`} />
            <Tile label="PayU fees" value={rupees(s.fees_paise)} />
            <Tile label="AI picture cost" value={rupees(s.ai_cost_paise)} />
            <Tile label="Left after costs" value={rupees(profit)} note="Before tax and other bills" />
            <Tile label="Affiliate income" value={rupees(s.affiliate_income_paise)} note="As you typed it in below" />
          </div>
          {Object.keys(s.by_pack).length > 0 && (
            <p className="mt-3 text-[14.5px] text-ink-muted">
              Packs:{" "}
              {Object.entries(s.by_pack)
                .map(([tier, n]) => `${PACK_TIERS[tier as PackTier]?.label ?? tier} ${n}`)
                .join(" · ")}
            </p>
          )}

          <h2 className="mt-10 text-[21px] font-semibold">Activity</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tile label="Page views" value={s.page_views.toLocaleString("en-IN")} />
            <Tile label="Came back another day" value={s.returning_visitors} note="Visitors seen on 2+ days" />
            <Tile label="Selfies uploaded" value={s.selfies} note={`by ${s.selfie_people} people`} />
            <Tile label="AI hairstyles made" value={s.hairstyles_made} />
          </div>

          <h2 className="mt-10 text-[21px] font-semibold">Ratings</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {REVIEW_SECTION_IDS.map((id) => {
              const r = s.ratings[id];
              return (
                <Tile
                  key={id}
                  label={REVIEW_SECTIONS[id].label}
                  value={r ? `${r.avg.toFixed(1)} ★` : "No ratings yet"}
                  note={r ? `${r.count} rating${r.count === 1 ? "" : "s"}${r.pending ? `, ${r.pending} waiting for you` : ""} · all time` : undefined}
                />
              );
            })}
          </div>
          <a href="/admin/reviews" className="mt-3 inline-block text-[14.5px] font-semibold text-mint-deep underline underline-offset-4">
            Read and approve reviews
          </a>

          <h2 className="mt-10 text-[21px] font-semibold">Hair-care product taps</h2>
          <p className="mt-1 text-[14.5px] text-ink-muted">
            Taps on the &quot;Buy on&quot; buttons. What was actually bought shows in your Amazon Associates and EarnKaro
            dashboards.
            {Object.keys(s.shop_clicks).length > 0 &&
              " By shop: " +
                Object.entries(s.shop_clicks)
                  .map(([shop, n]) => `${nameOfShop(shop)} ${n}`)
                  .join(" · ")}
          </p>
          {s.product_clicks.length === 0 ? (
            <p className="mt-3 text-[15px] text-ink-muted">No taps in this period.</p>
          ) : (
            <div className="mt-3 max-w-[760px] overflow-x-auto rounded-[16px] bg-surface shadow-card">
              <table className="w-full text-left text-[14.5px]">
                <thead className="text-[13px] uppercase tracking-[.03em] text-ink-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Product</th>
                    <th className="px-4 py-3 text-right font-semibold">Taps</th>
                    <th className="px-4 py-3 font-semibold">By shop</th>
                  </tr>
                </thead>
                <tbody>
                  {s.product_clicks.map((p) => (
                    <tr key={p.id} className="border-t border-line">
                      <td className="px-4 py-2.5">
                        {p.brand ? `${p.brand} ` : ""}
                        {p.title}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold">{p.clicks}</td>
                      <td className="px-4 py-2.5 text-ink-muted">
                        {Object.entries(p.by_shop)
                          .map(([shop, n]) => `${nameOfShop(shop)} ${n}`)
                          .join(" · ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2 className="mt-10 text-[21px] font-semibold">Affiliate income</h2>
          <p className="mt-1 max-w-[66ch] text-[14.5px] text-ink-muted">
            Once a month, type in the commission shown in your Amazon Associates and EarnKaro dashboards. Saving the same
            month and source again replaces it.
          </p>
          <div className="mt-4 grid max-w-[760px] gap-3 rounded-[16px] bg-bg-soft p-4 sm:grid-cols-[1fr_1.4fr_1fr_auto] sm:items-end">
            <label className="block">
              <span className="mb-1 block text-[13px] font-semibold text-ink-heading">Month</span>
              <input type="month" className={input} value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[13px] font-semibold text-ink-heading">From</span>
              <select className={input} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                {Object.entries(SOURCES).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[13px] font-semibold text-ink-heading">Amount (₹)</span>
              <input inputMode="decimal" className={input} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="e.g. 450" />
            </label>
            <button type="button" className="btn-primary !px-5 !py-2.5 !text-[15px]" disabled={saving || form.amount === ""} onClick={saveIncome}>
              Save
            </button>
          </div>
          {income.length > 0 && (
            <ul className="mt-3 flex max-w-[760px] flex-col gap-1.5 text-[14.5px]">
              {income.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 rounded-sm2 border border-line bg-surface px-4 py-2">
                  <span>
                    {new Date(row.month + "T00:00:00").toLocaleDateString("en-IN", { month: "long", year: "numeric" })} ·{" "}
                    {SOURCES[row.source]}
                  </span>
                  <span className="flex items-center gap-4">
                    <strong>{rupees(row.amount_paise)}</strong>
                    <button type="button" className="text-[13.5px] font-semibold text-danger" onClick={() => removeIncome(row.id)}>
                      Remove
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}

export default function AdminStatsPage() {
  return (
    <OwnerGate title="Dashboard" path="/admin/stats">
      <Dashboard />
    </OwnerGate>
  );
}
