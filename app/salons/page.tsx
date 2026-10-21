// /salons — "Find a salon" for customers (21.10.2026).
//
// Approved partner salons as cards (photo, name, area, type, starting
// price, what they're good at), with a city box and filters for who the
// salon serves and what it's good at. Opened from "Get this look at a
// salon" on the results page with ?style=<hairstyle>, the list puts first
// the salons good at what that cut needs (lib/salonMatch.ts) and says so.
// The city starts at the visitor's own city when there are salons there.
// Each card opens the salon's profile (/salons/[slug]).

"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CUSTOMER_TYPES, SPECIALITIES, labelsFor } from "@/lib/salons";
import type { SalonListItem } from "@/app/api/salons/search/route";

interface Result {
  salons: SalonListItem[];
  cities: { city: string; count: number }[];
  total: number;
  yourCity: string | null;
  match: { styleId: string; styleName: string; specialities: string[] } | null;
}

const GOOD_AT = SPECIALITIES.filter((s) => s.id !== "OTHER");

function FindContent() {
  const params = useSearchParams();
  const router = useRouter();
  const style = params.get("style") || "";
  const [city, setCity] = useState<string | null>(params.get("city"));
  const [type, setType] = useState(params.get("type") || "");
  const [spec, setSpec] = useState(params.get("spec") || "");
  const [data, setData] = useState<Result | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    const q = new URLSearchParams();
    if (city) q.set("city", city);
    if (style) q.set("style", style);
    else {
      if (type) q.set("type", type);
      if (spec) q.set("spec", spec);
    }
    fetch(`/api/salons/search?${q}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Result) => {
        if (cancelled) return;
        // First visit without a city: start at the visitor's own city if it has salons.
        if (city === null && d.yourCity) return setCity(d.yourCity);
        setData(d);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [city, type, spec, style]);

  const matchedLabels = useMemo(() => (data?.match ? labelsFor(SPECIALITIES, data.match.specialities) : []), [data]);
  const best = data?.match ? data.salons.filter((s) => s.matched.length > 0) : [];
  const others = data?.match ? data.salons.filter((s) => s.matched.length === 0) : data?.salons ?? [];

  return (
    <section className="wrap py-10 sm:py-14">
      <p className="eyebrow">Find a salon</p>
      {data?.match ? (
        <>
          <h1 className="mt-2 text-[clamp(26px,4.5vw,40px)] leading-tight">Salons for your {data.match.styleName}</h1>
          {matchedLabels.length > 0 && (
            <p className="mt-2 text-[15.5px] text-ink-body">
              This cut needs a salon good at <strong className="text-ink-heading">{matchedLabels.join(", ")}</strong>. Those come first.
            </p>
          )}
          <button type="button" onClick={() => router.replace("/salons")} className="mt-2 text-[14px] font-semibold text-ink-muted underline underline-offset-4">
            Show all salons instead
          </button>
        </>
      ) : (
        <>
          <h1 className="mt-2 text-[clamp(26px,4.5vw,40px)] leading-tight">Partner salons near you</h1>
          <p className="mt-2 max-w-[60ch] text-[15.5px] text-ink-body">Salons on Tressform, with what they&apos;re good at and their prices. Tap one to call, WhatsApp or get directions.</p>
        </>
      )}

      {/* Filters */}
      <div className="mt-6 flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-4">
        <label className="flex flex-wrap items-center gap-3">
          <span className="text-[14px] font-semibold text-ink-heading">City</span>
          <select
            value={city ?? ""}
            onChange={(e) => setCity(e.target.value)}
            className="min-w-[200px] flex-1 rounded-sm2 border border-line bg-surface px-3 py-2.5 text-[15px] text-ink-heading sm:flex-none"
          >
            <option value="">All cities</option>
            {(data?.cities ?? []).map((c) => (
              <option key={c.city} value={c.city}>
                {c.city} ({c.count})
              </option>
            ))}
          </select>
        </label>
        {!style && (
          <>
            <div className="flex flex-wrap gap-2" aria-label="Who the salon serves">
              {[{ id: "", label: "Everyone" }, ...CUSTOMER_TYPES].map((c) => (
                <Pill key={c.id} on={type === c.id} onClick={() => setType(c.id)}>
                  {c.label}
                </Pill>
              ))}
            </div>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0" aria-label="Good at">
              <span className="shrink-0 self-center text-[13px] font-semibold text-ink-muted">Good at:</span>
              {GOOD_AT.map((s) => (
                <Pill key={s.id} on={spec === s.id} onClick={() => setSpec(spec === s.id ? "" : s.id)}>
                  {s.label}
                </Pill>
              ))}
            </div>
          </>
        )}
      </div>

      {failed && <p className="mt-6 text-danger">We couldn&apos;t load salons. Please check your internet and try again.</p>}
      {!data && !failed && <p className="mt-6 text-ink-muted">Finding salons…</p>}

      {data && data.total === 0 && (
        <Empty title="Partner salons are joining Tressform" body="Check back soon. Salons are listing themselves right now." />
      )}
      {data && data.total > 0 && data.salons.length === 0 && (
        <Empty
          title={city ? `No partner salons in ${city} yet` : "No salons match these filters"}
          body="Try another city, or fewer filters."
          action={
            <button type="button" className="btn-secondary mt-4 !py-2.5" onClick={() => { setCity(""); setType(""); setSpec(""); }}>
              See all salons
            </button>
          }
        />
      )}

      {best.length > 0 && (
        <>
          <h2 className="mt-8 text-[19px] font-semibold">Best match for this cut</h2>
          <Grid items={best} />
        </>
      )}
      {others.length > 0 && (
        <>
          {best.length > 0 && <h2 className="mt-10 text-[19px] font-semibold">Other salons{city ? ` in ${city}` : ""}</h2>}
          <Grid items={others} />
        </>
      )}

      <div className="mt-12 rounded-[20px] bg-mint-pale p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
        <div>
          <p className="text-[16px] font-semibold text-ink-heading">Own a salon?</p>
          <p className="mt-1 text-[14px] text-ink-body">List it on Tressform. Free during our launch period.</p>
        </div>
        <Link href="/salons/join" className="btn-amber mt-3 !px-6 !py-2.5 !text-[15px] !shadow-none sm:mt-0">
          List your salon free
        </Link>
      </div>
    </section>
  );
}

function Grid({ items }: { items: SalonListItem[] }) {
  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((s) => (
        <Link key={s.slug} href={`/salons/${s.slug}`} className="group overflow-hidden rounded-[20px] border border-line bg-surface shadow-card transition hover:-translate-y-0.5">
          <div className="relative aspect-[4/3] bg-bg-soft">
            {s.photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.photo} alt={s.name} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
            )}
            <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11.5px] font-bold uppercase tracking-[.05em] text-mint-deep">{s.marketTier}</span>
          </div>
          <div className="p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-[18px] font-semibold leading-snug">{s.name}</h3>
              {s.verified && <span className="shrink-0 text-[12px] font-bold text-mint-deep">✓ Verified</span>}
            </div>
            <p className="mt-0.5 text-[14px] text-ink-body">📍 {[s.area, s.city].filter(Boolean).join(", ")}</p>
            <p className="mt-1 text-[12.5px] font-bold uppercase tracking-[.05em] text-ink-muted">
              {labelsFor(CUSTOMER_TYPES, s.customerTypes).join(" • ")}
              {s.priceFrom !== null && <span className="normal-case tracking-normal text-ink-heading"> · Haircut from ₹{s.priceFrom}</span>}
            </p>
            {s.specialities.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {labelsFor(SPECIALITIES, s.specialities)
                  .slice(0, 5)
                  .map((label) => {
                    const id = SPECIALITIES.find((x) => x.label === label)?.id ?? "";
                    const hit = s.matched.includes(id);
                    return (
                      <span key={label} className={`rounded-full px-2.5 py-1 text-[12.5px] font-semibold ${hit ? "bg-mint text-white" : "bg-bg-soft text-ink-heading"}`}>
                        {hit && "✓ "}
                        {label}
                      </span>
                    );
                  })}
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`shrink-0 rounded-full border-[1.5px] px-3.5 py-1.5 text-[13.5px] font-semibold transition ${
        on ? "border-mint bg-mint text-white" : "border-line bg-surface text-ink-heading hover:border-ink-heading"
      }`}
    >
      {children}
    </button>
  );
}

function Empty({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="mt-8 rounded-[20px] border border-dashed border-line p-8 text-center">
      <p className="text-[18px] font-semibold text-ink-heading">{title}</p>
      <p className="mt-1.5 text-[14.5px] text-ink-body">{body}</p>
      {action}
    </div>
  );
}

export default function FindSalonPage() {
  return (
    <Suspense fallback={null}>
      <FindContent />
    </Suspense>
  );
}
