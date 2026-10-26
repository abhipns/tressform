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
import { PERIODS, campaignTotals, finalSummary, rupees, stepRate, type Period } from "@/lib/stats";
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
  /** 14.10.2026: Tressform credit customers put toward paid orders (not money received). */
  credit_used_paise?: number;
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

// 26.10.2026: orders that aren't a pack, in the "Packs:" line under Money.
const PACK_NAMES: Record<string, string> = { PICTURES: "Single pictures", ADDON: "Add-ons" };

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
  // 14.10.2026: AI cost customers have paid for but that isn't spent yet (lib/stats.ts).
  const [committed, setCommitted] = useState<{ unopenedLooks: number; unmadeLooks: number; paise: number } | null>(null);
  // 14.10.2026: GST figures and the owner's own income-tax rate for the final summary.
  const [gst, setGst] = useState<{ registered: boolean; duePaise: number; ifRegisteredPaise: number } | null>(null);
  const [taxRate, setTaxRate] = useState("30");
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("tf_tax_rate");
      if (saved !== null) setTaxRate(saved);
    } catch {
      /* not remembered on this device */
    }
  }, []);
  function changeTaxRate(value: string) {
    setTaxRate(value);
    try {
      window.localStorage.setItem("tf_tax_rate", value);
    } catch {
      /* not remembered on this device */
    }
  }
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
    setCommitted(data.committed ?? null);
    setGst(data.gst ?? null);
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
      <TestAlert />

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

      <Campaigns period={period} />

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
            <Tile
              label="Pack sales"
              value={rupees(s.revenue_paise)}
              note={`${s.orders} order${s.orders === 1 ? "" : "s"}${
                s.credit_used_paise ? ` · plus ${rupees(s.credit_used_paise)} paid with credit` : ""
              }`}
            />
            <Tile label="PayU fees" value={rupees(s.fees_paise)} />
            <Tile label="AI picture cost" value={rupees(s.ai_cost_paise)} />
            <Tile label="Left after costs" value={rupees(profit)} note="Before tax and other bills" />
            <Tile label="Affiliate income" value={rupees(s.affiliate_income_paise)} note="As you typed it in below" />
          </div>
          {committed && (
            <div className="mt-3 rounded-[16px] border-2 border-[#C79A3D]/50 bg-[#C79A3D]/10 p-4">
              <p className="text-[13px] font-semibold uppercase tracking-[.03em] text-ink-muted">AI cost still to come · right now</p>
              <p className="mt-1 font-heading text-[26px] font-semibold text-ink-heading">{rupees(committed.paise)}</p>
              <p className="mt-1 text-[14px] leading-[1.5] text-ink-muted">
                Already paid for by customers, not spent yet: {committed.unopenedLooks}{" "}
                {committed.unopenedLooks === 1 ? "look" : "looks"} whose sides and back haven&apos;t been opened (3 pictures
                each), and {committed.unmadeLooks} paid {committed.unmadeLooks === 1 ? "look" : "looks"} not made yet (up to 4
                each). An estimate at about ₹3.50 a picture; it can arrive any time a customer taps. Not part of
                &ldquo;Left after costs&rdquo; above.
              </p>
            </div>
          )}

          {/* 14.10.2026: the final summary — everything known, down to an estimated take-home. */}
          {(() => {
            const rate = Number(taxRate);
            const sum = finalSummary({
              salesPaise: s.revenue_paise,
              affiliatePaise: s.affiliate_income_paise,
              feesPaise: s.fees_paise,
              aiCostPaise: s.ai_cost_paise,
              committedPaise: committed?.paise ?? 0,
              gstPaise: gst?.duePaise ?? 0,
              taxRatePct: Number.isFinite(rate) ? rate : 0,
            });
            const rows: { label: string; paise: number; sign: "+" | "−"; note?: string }[] = [
              { label: "Pack sales", paise: s.revenue_paise, sign: "+" },
              { label: "Affiliate income", paise: s.affiliate_income_paise, sign: "+", note: "as typed in below" },
              { label: "PayU fees", paise: s.fees_paise, sign: "−" },
              { label: "AI picture cost", paise: s.ai_cost_paise, sign: "−" },
              { label: "AI cost still to come", paise: committed?.paise ?? 0, sign: "−", note: "estimate, right now" },
              {
                label: "GST to pay",
                paise: gst?.duePaise ?? 0,
                sign: "−",
                note: gst?.registered ? "on this period's sales" : "not GST-registered yet",
              },
            ];
            return (
              <div className="mt-6 rounded-[18px] bg-header-dark p-5 text-white sm:p-6">
                <h3 className="text-[19px] font-semibold text-white">Final summary · {PERIODS.find((p) => p.id === period)?.label}</h3>
                <dl className="mt-4 flex flex-col gap-2 text-[15px]">
                  {rows.map((r) => (
                    <div key={r.label} className="flex items-baseline justify-between gap-4 border-b border-white/10 pb-2">
                      <dt className="text-white/80">
                        {r.label}
                        {r.note && <span className="ml-2 text-[12.5px] text-white/50">({r.note})</span>}
                      </dt>
                      <dd className="font-semibold tabular-nums">
                        {r.sign} {rupees(r.paise)}
                      </dd>
                    </div>
                  ))}
                  <div className="flex items-baseline justify-between gap-4 border-b border-white/10 pb-2">
                    <dt className="font-semibold">Profit before income tax</dt>
                    <dd className="font-semibold tabular-nums">{rupees(sum.profitBeforeTaxPaise)}</dd>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-white/10 pb-2">
                    <dt className="flex items-center gap-2 text-white/80">
                      Tentative income tax at
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={100}
                        value={taxRate}
                        onChange={(e) => changeTaxRate(e.target.value)}
                        aria-label="Your income tax rate, in percent"
                        className="w-[64px] rounded-md border border-white/25 bg-white/10 px-2 py-1 text-right text-white"
                      />
                      %
                    </dt>
                    <dd className="font-semibold tabular-nums">− {rupees(sum.incomeTaxPaise)}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 pt-1">
                    <dt className="text-[17px] font-semibold">Estimated take-home</dt>
                    <dd className="font-heading text-[26px] font-semibold tabular-nums text-[#E9CE8A]">{rupees(sum.takeHomePaise)}</dd>
                  </div>
                </dl>
                <p className="mt-4 text-[13px] leading-[1.55] text-white/60">
                  {gst && !gst.registered && gst.ifRegisteredPaise > 0 && (
                    <>
                      Planning note: if you were GST-registered and kept the same prices, GST on these sales would be about{" "}
                      {rupees(gst.ifRegisteredPaise)} (18% included in the price).{" "}
                    </>
                  )}
                  Income tax depends on your total income from every source, so set the rate your CA advises; it&apos;s
                  remembered on this device. Hosting, domain and other bills are not included. An estimate, not tax advice.
                </p>
              </div>
            );
          })()}
          {Object.keys(s.by_pack).length > 0 && (
            <p className="mt-3 text-[14.5px] text-ink-muted">
              Packs:{" "}
              {Object.entries(s.by_pack)
                .map(([tier, n]) => `${PACK_TIERS[tier as PackTier]?.label ?? PACK_NAMES[tier] ?? tier} ${n}`)
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

// 21.10.2026: visits, sales and money by ad campaign (/api/admin/campaigns).
function Campaigns({ period }: { period: Period }) {
  const [rows, setRows] = useState<{ source: string; campaign: string; visitors: number; purchases: number; revenuePaise: number }[] | null>(null);
  const [notReady, setNotReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setRows(null);
    (async () => {
      const res = await fetch(`/api/admin/campaigns?period=${period}`, { headers: await authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (cancelled) return;
      setNotReady(Boolean(data.notReady));
      setRows(data.rows ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [period]);
  return (
    <section className="mt-6 rounded-[20px] border border-line bg-surface p-5">
      <h2 className="text-[18px] font-semibold">By ad campaign</h2>
      <p className="mt-1 text-[13.5px] text-ink-muted">
        From ad links with a campaign tag (utm_campaign), and Facebook / Instagram visits without one.
      </p>
      {rows === null ? (
        <p className="mt-3 text-[14px] text-ink-muted">Loading…</p>
      ) : notReady ? (
        <p className="mt-3 text-[14px] text-danger">The campaign database step hasn&apos;t been run yet.</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-[14px] text-ink-muted">No visits from ads in this period yet.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-[14px]">
            <thead className="text-[12.5px] uppercase tracking-[.04em] text-ink-muted">
              <tr>
                <th className="py-2 pr-3">Source</th>
                <th className="py-2 pr-3">Campaign</th>
                <th className="py-2 pr-3 text-right">People</th>
                <th className="py-2 pr-3 text-right">Sales</th>
                <th className="py-2 pr-3 text-right">Money</th>
                <th className="py-2 text-right">Bought</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={`${r.source}|${r.campaign}`}>
                  <td className="py-2 pr-3 font-semibold text-ink-heading">{r.source}</td>
                  <td className="py-2 pr-3">{r.campaign}</td>
                  <td className="py-2 pr-3 text-right">{r.visitors}</td>
                  <td className="py-2 pr-3 text-right">{r.purchases}</td>
                  <td className="py-2 pr-3 text-right">{rupees(r.revenuePaise)}</td>
                  <td className="py-2 text-right">{r.visitors ? `${((r.purchases / r.visitors) * 100).toFixed(1)}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
            {/* 26.10.2026: the owner's Total row, all campaigns together. */}
            {(() => {
              const t = campaignTotals(rows);
              return (
                <tfoot className="border-t-2 border-line font-bold text-ink-heading">
                  <tr>
                    <td className="py-2 pr-3" colSpan={2}>
                      Total
                    </td>
                    <td className="py-2 pr-3 text-right">{t.visitors}</td>
                    <td className="py-2 pr-3 text-right">{t.purchases}</td>
                    <td className="py-2 pr-3 text-right">{rupees(t.revenuePaise)}</td>
                    <td className="py-2 text-right">{t.boughtPct === null ? "—" : `${t.boughtPct}%`}</td>
                  </tr>
                </tfoot>
              );
            })()}
          </table>
        </div>
      )}
    </section>
  );
}

// 21.10.2026: check that alerts (email, Telegram, WhatsApp) reach the owner.
const ALERT_WORD: Record<string, string> = { sent: "sent ✓", off: "not set up", failed: "failed ✗" };

function TestAlert() {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [result, setResult] = useState<Record<string, string> | null>(null);
  async function send() {
    setState("sending");
    try {
      const res = await fetch("/api/admin/test-alert", { method: "POST", headers: await authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult({ Email: data.email, Telegram: data.telegram, WhatsApp: data.whatsapp });
      setState("done");
    } catch {
      setState("error");
    }
  }
  return (
    <div className="mt-5 flex flex-wrap items-center gap-3 text-[14.5px]">
      <button
        type="button"
        onClick={send}
        disabled={state === "sending"}
        className="rounded-full border-[1.5px] border-line bg-surface px-4 py-2 font-semibold text-ink-heading transition hover:border-ink-heading disabled:opacity-60"
      >
        {state === "sending" ? "Sending…" : "Send test alert"}
      </button>
      {state === "done" && result && (
        <span className="text-ink-body">
          {Object.entries(result)
            .map(([k, v]) => `${k}: ${ALERT_WORD[v] ?? v}`)
            .join(" · ")}
        </span>
      )}
      {state === "error" && <span className="text-danger">Couldn&apos;t send. Please try again.</span>}
    </div>
  );
}

export default function AdminStatsPage() {
  return (
    <OwnerGate title="Dashboard" path="/admin/stats">
      <Dashboard />
    </OwnerGate>
  );
}
