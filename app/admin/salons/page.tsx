"use client";

// /admin/salons — salon submissions, for the site owner (21.10.2026).
// OWNER ONLY. Each salon shows everything it gave, with its photos, and
// buttons to approve it (it goes live), suspend it, set the verification
// badge, or send the salon a "changes needed" note (shown to them when they
// open their profile). At the top: how many salons started the sign-up in
// the last 30 days, and how far they got.

import { useCallback, useEffect, useState } from "react";
import OwnerGate from "@/components/admin/OwnerGate";
import { authHeaders } from "@/lib/authClient";
import { CUSTOMER_TYPES, SERVICES, SPECIALITIES, labelsFor } from "@/lib/salons";

interface AdminSalon {
  id: string;
  slug: string;
  name: string;
  owner: string;
  mobile: string;
  whatsapp: string | null;
  email: string | null;
  instagram: string | null;
  city: string;
  area: string;
  address: string;
  mapsUrl: string;
  customerTypes: string[];
  marketTier: string;
  services: string[];
  specialities: string[];
  prices: { men: number | null; women: number | null; unisex: number | null; advanced: number | null };
  status: "PENDING" | "ACTIVE" | "SUSPENDED";
  verification: "PENDING" | "VERIFIED" | "QUALITY_VERIFIED";
  adminNote: string | null;
  submittedAt: string;
  photos: { type: string; url: string }[];
  stylistCount: number;
}

const STATUS_LOOK: Record<string, string> = {
  PENDING: "bg-lilac/25 text-ink-heading",
  ACTIVE: "bg-mint text-white",
  SUSPENDED: "bg-danger/15 text-danger",
};
const STATUS_WORD: Record<string, string> = { PENDING: "Waiting for review", ACTIVE: "Live", SUSPENDED: "Suspended" };
const VERIFY_WORD: Record<string, string> = { PENDING: "Not verified", VERIFIED: "Verified", QUALITY_VERIFIED: "Quality verified" };
const FUNNEL = [
  ["salon_onboarding_started", "Started"],
  ["salon_step_1_completed", "Step 1 done"],
  ["salon_step_2_completed", "Step 2 done"],
  ["salon_step_3_completed", "Step 3 done"],
  ["salon_onboarding_completed", "Submitted"],
  ["salon_profile_viewed", "Profile views"],
] as const;
const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function Salons() {
  const [salons, setSalons] = useState<AdminSalon[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "ACTIVE" | "SUSPENDED">("PENDING");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/salons", { headers: await authHeaders(), cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setSalons(data.salons ?? []);
      setCounts(data.counts ?? {});
    } else setError(data.error ?? "Couldn't load the salons.");
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, action: string, note?: string) {
    setBusy(`${id}:${action}`);
    try {
      const res = await fetch("/api/admin/salons", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ id, action, note }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error);
      await load();
    } catch (err) {
      setError((err as Error).message || "That didn't work.");
    } finally {
      setBusy(null);
    }
  }

  const shown = (salons ?? []).filter((s) => filter === "ALL" || s.status === filter);
  const button = "rounded-full border-[1.5px] px-4 py-2 text-[13.5px] font-semibold transition disabled:opacity-50";

  return (
    <>
      <h1 className="h-display">Salons</h1>
      <p className="lead mt-3 max-w-[66ch]">
        Salons that listed themselves. A new salon is hidden until you approve it. Listing is free during the launch
        period.
      </p>

      <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {FUNNEL.map(([k, label]) => (
          <div key={k} className="rounded-[14px] border border-line bg-surface p-3">
            <p className="text-[12px] font-semibold uppercase tracking-[.03em] text-ink-muted">{label}</p>
            <p className="mt-1 font-heading text-[24px] font-semibold text-ink-heading">{counts[k] ?? 0}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[12.5px] text-ink-muted">Last 30 days.</p>

      <div className="mt-6 flex flex-wrap gap-2" role="tablist">
        {(["PENDING", "ACTIVE", "SUSPENDED", "ALL"] as const).map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={`${button} ${filter === f ? "border-mint bg-mint text-white" : "border-line bg-surface text-ink-heading"}`}
          >
            {f === "ALL" ? "All" : STATUS_WORD[f]} ({(salons ?? []).filter((s) => f === "ALL" || s.status === f).length})
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-danger">{error}</p>}
      {!salons && !error && <p className="mt-6 text-ink-muted">Loading…</p>}
      {salons && shown.length === 0 && <p className="mt-6 text-ink-muted">No salons here yet.</p>}

      <div className="mt-6 flex flex-col gap-5">
        {shown.map((s) => (
          <article key={s.id} className="rounded-[20px] border border-line bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-[20px] font-semibold">{s.name}</h2>
                <p className="text-[14px] text-ink-body">
                  {s.area}, {s.city} · submitted {when(s.submittedAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`rounded-full px-3 py-1 text-[12.5px] font-bold ${STATUS_LOOK[s.status]}`}>{STATUS_WORD[s.status]}</span>
                <span className="rounded-full bg-bg-soft px-3 py-1 text-[12.5px] font-bold text-ink-heading">{VERIFY_WORD[s.verification]}</span>
              </div>
            </div>

            {s.photos.length > 0 && (
              <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1">
                {s.photos.map((p) => (
                  <a key={p.url} href={p.url} target="_blank" rel="noreferrer" className="shrink-0" title={p.type}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={p.type} className="h-28 w-36 rounded-[12px] object-cover" />
                  </a>
                ))}
              </div>
            )}

            <dl className="mt-4 grid gap-x-6 gap-y-2 text-[14px] sm:grid-cols-2">
              <Row k="Owner / manager" v={s.owner} />
              <Row k="Mobile" v={<a className="underline" href={`tel:${s.mobile}`}>{s.mobile}</a>} />
              {s.whatsapp && s.whatsapp !== s.mobile && <Row k="WhatsApp" v={s.whatsapp} />}
              {s.email && <Row k="Email" v={s.email} />}
              {s.instagram && <Row k="Instagram" v={<a className="underline" href={`https://instagram.com/${s.instagram}`} target="_blank" rel="noreferrer">@{s.instagram}</a>} />}
              <Row k="Address" v={s.address} />
              <Row k="Map" v={<a className="underline" href={s.mapsUrl} target="_blank" rel="noreferrer">Open in Google Maps</a>} />
              <Row k="Serves" v={labelsFor(CUSTOMER_TYPES, s.customerTypes).join(", ")} />
              <Row k="Type" v={s.marketTier} />
              <Row k="Services" v={labelsFor(SERVICES, s.services).join(", ")} />
              <Row k="Specialities" v={labelsFor(SPECIALITIES, s.specialities).join(", ") || "—"} />
              <Row
                k="Haircut prices"
                v={
                  [
                    s.prices.men !== null && `Men ₹${s.prices.men}`,
                    s.prices.women !== null && `Women ₹${s.prices.women}`,
                    s.prices.unisex !== null && `Unisex ₹${s.prices.unisex}`,
                    s.prices.advanced !== null && `Advanced ₹${s.prices.advanced}`,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"
                }
              />
              <Row k="Stylists" v={String(s.stylistCount)} />
            </dl>

            <div className="mt-5 flex flex-wrap gap-2">
              {s.status !== "ACTIVE" && (
                <button type="button" disabled={!!busy} onClick={() => act(s.id, "approve")} className={`${button} border-mint bg-mint text-white`}>
                  ✓ Approve (go live)
                </button>
              )}
              {s.status !== "SUSPENDED" && (
                <button type="button" disabled={!!busy} onClick={() => act(s.id, "suspend")} className={`${button} border-danger text-danger`}>
                  Suspend
                </button>
              )}
              {s.status === "SUSPENDED" && (
                <button type="button" disabled={!!busy} onClick={() => act(s.id, "pending")} className={`${button} border-line text-ink-heading`}>
                  Back to review
                </button>
              )}
              {s.verification !== "VERIFIED" && (
                <button type="button" disabled={!!busy} onClick={() => act(s.id, "verify")} className={`${button} border-line text-ink-heading`}>
                  Mark verified
                </button>
              )}
              {s.verification !== "QUALITY_VERIFIED" && (
                <button type="button" disabled={!!busy} onClick={() => act(s.id, "quality")} className={`${button} border-line text-ink-heading`}>
                  Mark quality verified
                </button>
              )}
              {s.verification !== "PENDING" && (
                <button type="button" disabled={!!busy} onClick={() => act(s.id, "unverify")} className={`${button} border-line text-ink-muted`}>
                  Remove badge
                </button>
              )}
              <a href={`/salons/${s.slug}`} target="_blank" rel="noreferrer" className={`${button} border-line text-ink-heading`}>
                View profile
              </a>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                className="flex-1 rounded-sm2 border border-line bg-bg-soft px-3 py-2 text-[14px]"
                placeholder={s.adminNote ? `Note sent: ${s.adminNote}` : "Changes needed? Write a note the salon will see"}
                value={notes[s.id] ?? ""}
                onChange={(e) => setNotes((n) => ({ ...n, [s.id]: e.target.value }))}
                maxLength={1000}
              />
              <button
                type="button"
                disabled={!!busy || !(notes[s.id] ?? "").trim()}
                onClick={() => act(s.id, "note", notes[s.id]).then(() => setNotes((n) => ({ ...n, [s.id]: "" })))}
                className={`${button} border-line text-ink-heading`}
              >
                Send note
              </button>
              {s.adminNote && (
                <button type="button" disabled={!!busy} onClick={() => act(s.id, "note", "")} className={`${button} border-line text-ink-muted`}>
                  Clear note
                </button>
              )}
            </div>
            <p className="mt-2 text-[12.5px] text-ink-muted">
              The salon sees the note when they open their profile. Tell them on WhatsApp too:{" "}
              <a className="underline" href={`https://wa.me/${(s.whatsapp ?? s.mobile).replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                open WhatsApp
              </a>
              .
            </p>
          </article>
        ))}
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-[120px] shrink-0 text-ink-muted">{k}</dt>
      <dd className="text-ink-heading">{v}</dd>
    </div>
  );
}

export default function AdminSalonsPage() {
  return (
    <OwnerGate title="Salons" path="/admin/salons">
      <Salons />
    </OwnerGate>
  );
}
