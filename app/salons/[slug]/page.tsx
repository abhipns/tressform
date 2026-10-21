// /salons/[slug] — a salon's public profile (21.10.2026, salon onboarding).
//
// Laid out like a listing: a big photo, the name and place, the salon's type
// and who it serves, a rating placeholder, prices, specialities, services,
// photos, stylists, amenities, about, and contact buttons (call, WhatsApp,
// directions). Ratings and booking are placeholders for later.
//
// An approved salon is public. Before approval only its owner (and the site
// owner) can open it, with a note saying so (/api/salons/profile).

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authHeaders } from "@/lib/authClient";
import { AMENITIES, CUSTOMER_TYPES, IMAGE_SLOTS, SERVICES, SPECIALITIES, labelsFor, type PublicSalon } from "@/lib/salons";
import { trackSalonEvent } from "@/lib/salonUpload";

const PHOTO_LABEL = Object.fromEntries(IMAGE_SLOTS.map((s) => [s.type, s.label]));

export default function SalonProfilePage({ params }: { params: { slug: string } }) {
  const [state, setState] = useState<{ kind: "loading" } | { kind: "missing" } | { kind: "ok"; salon: PublicSalon; preview: boolean }>({ kind: "loading" });
  const [big, setBig] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/salons/profile?slug=${encodeURIComponent(params.slug)}`, { headers: await authHeaders(), cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.salon) return setState({ kind: "missing" });
        setState({ kind: "ok", salon: data.salon, preview: Boolean(data.preview) });
        if (!data.preview) trackSalonEvent("salon_profile_viewed", params.slug);
      } catch {
        if (!cancelled) setState({ kind: "missing" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.slug]);

  if (state.kind === "loading") return <section className="wrap py-16 text-ink-muted">Loading…</section>;
  if (state.kind === "missing") {
    return (
      <section className="wrap py-16">
        <div className="mx-auto max-w-[560px] text-center">
          <h1 className="text-[28px]">Salon not found</h1>
          <p className="mt-3 text-ink-body">This salon isn&apos;t listed, or isn&apos;t live yet.</p>
          <Link href="/" className="btn-primary mt-6">Go to Tressform</Link>
        </div>
      </section>
    );
  }

  const s = state.salon;
  const hero = s.photos.find((p) => p.type === "EXTERIOR") ?? s.photos[0];
  const rest = s.photos.filter((p) => p !== hero);
  const who = labelsFor(CUSTOMER_TYPES, s.customerTypes);
  const priceRows = (
    [
      ["Men's haircut", s.prices.men],
      ["Women's haircut", s.prices.women],
      ["Unisex haircut", s.prices.unisex],
      ["Advanced / premium cut", s.prices.advanced],
    ] as [string, number | null][]
  ).filter(([, v]) => v !== null);
  const wa = s.whatsapp ? `https://wa.me/${s.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi, I found ${s.name} on Tressform.`)}` : null;

  return (
    <article className="pb-28 sm:pb-16">
      {state.preview && (
        <p className="bg-lilac/20 px-6 py-3 text-center text-[14px] text-ink-heading">
          {s.status === "SUSPENDED" ? "This profile is hidden from customers right now." : "Your salon is being reviewed. Only you can see this page until it goes live."}{" "}
          <Link href="/salons/join" className="font-semibold underline underline-offset-4">Edit profile</Link>
        </p>
      )}

      <div className="wrap pt-6">
        {/* Hero photo */}
        <button type="button" onClick={() => hero && setBig(hero.url)} className="relative block aspect-[16/9] w-full overflow-hidden rounded-[24px] bg-bg-soft sm:aspect-[21/9]">
          {hero && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hero.url} alt={`${s.name}`} className="absolute inset-0 h-full w-full object-cover" />
          )}
        </button>

        <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-mint-pale px-3 py-1 text-[12.5px] font-bold uppercase tracking-[.05em] text-mint-deep">{s.marketTier}</span>
              {s.verification !== "PENDING" && (
                <span className="rounded-full bg-lilac/20 px-3 py-1 text-[12.5px] font-bold text-ink-heading">
                  ✓ {s.verification === "QUALITY_VERIFIED" ? "Quality verified by Tressform" : "Verified by Tressform"}
                </span>
              )}
            </div>
            <h1 className="mt-3 text-[clamp(28px,5vw,44px)] leading-[1.05]">{s.name}</h1>
            <p className="mt-2 text-[16px] text-ink-body">📍 {[s.area, s.city].filter(Boolean).join(", ")}</p>
            <p className="mt-2 text-[13.5px] font-bold uppercase tracking-[.06em] text-ink-heading">{who.join(" • ")}</p>
            <p className="mt-3 text-[14px] text-ink-muted">★ No reviews yet</p>

            {s.specialities.length > 0 && (
              <Block title="Good at">
                <Tags items={labelsFor(SPECIALITIES, s.specialities)} strong />
              </Block>
            )}
            <Block title="Services">
              <Tags items={labelsFor(SERVICES, s.services)} />
            </Block>
            {priceRows.length > 0 && (
              <Block title="Prices">
                <dl className="divide-y divide-line rounded-[16px] border border-line bg-surface">
                  {priceRows.map(([label, v]) => (
                    <div key={label} className="flex justify-between px-4 py-3 text-[15px]">
                      <dt className="text-ink-body">{label}</dt>
                      <dd className="font-semibold text-ink-heading">from ₹{v}</dd>
                    </div>
                  ))}
                </dl>
              </Block>
            )}
            {rest.length > 0 && (
              <Block title="Photos">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {rest.map((p) => (
                    <button key={p.url} type="button" onClick={() => setBig(p.url)} className="text-left">
                      <span className="relative block aspect-[4/3] overflow-hidden rounded-[14px] bg-bg-soft">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.url} alt={PHOTO_LABEL[p.type] ?? ""} className="absolute inset-0 h-full w-full object-cover" />
                      </span>
                      <span className="mt-1 block text-[12.5px] text-ink-muted">{PHOTO_LABEL[p.type]}</span>
                    </button>
                  ))}
                </div>
              </Block>
            )}
            {s.stylists.length > 0 && (
              <Block title="Stylists">
                <div className="grid gap-3 sm:grid-cols-2">
                  {s.stylists.map((t) => (
                    <div key={t.name} className="flex gap-3 rounded-[16px] border border-line bg-surface p-3">
                      <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-bg-soft">
                        {t.photoUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={t.photoUrl} alt={t.name} className="absolute inset-0 h-full w-full object-cover" />
                        )}
                      </span>
                      <div>
                        <p className="font-semibold text-ink-heading">{t.name}</p>
                        {t.experienceYears !== null && <p className="text-[13px] text-ink-muted">{t.experienceYears} years&apos; experience</p>}
                        {t.specialities.length > 0 && <p className="mt-1 text-[13px] text-ink-body">{labelsFor(SPECIALITIES, t.specialities).join(" • ")}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </Block>
            )}
            {s.amenities.length > 0 && (
              <Block title="Amenities">
                <Tags items={labelsFor(AMENITIES, s.amenities)} />
              </Block>
            )}
            {s.about && (
              <Block title="About">
                <p className="whitespace-pre-line text-[15.5px] leading-[1.6] text-ink-body">{s.about}</p>
              </Block>
            )}
            <Block title="Reviews">
              <p className="text-[14.5px] text-ink-muted">Reviews from Tressform customers are coming soon.</p>
            </Block>
          </div>

          {/* Contact */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[20px] border border-line bg-surface p-5">
              <p className="text-[17px] font-semibold text-ink-heading">Visit {s.name}</p>
              {s.timings && <p className="mt-2 text-[14px] text-ink-body">🕒 {s.timings}</p>}
              <p className="mt-2 text-[14px] leading-[1.5] text-ink-body">{s.address}</p>
              <div className="mt-4 flex flex-col gap-2.5">
                {s.mapsUrl && (
                  <a href={s.mapsUrl} target="_blank" rel="noreferrer" className="btn-secondary !py-3">📍 Get directions</a>
                )}
                {s.instagram && (
                  <a href={`https://instagram.com/${s.instagram}`} target="_blank" rel="noreferrer" className="text-center text-[14px] font-semibold text-mint-deep underline underline-offset-4">
                    @{s.instagram} on Instagram
                  </a>
                )}
              </div>
              <p className="mt-4 text-[12.5px] text-ink-muted">Online booking through Tressform is coming soon.</p>
            </div>
          </aside>
        </div>
      </div>

      {/* Call / WhatsApp, always at hand */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur sm:static sm:mt-8 sm:border-0 sm:bg-transparent sm:px-0">
        <div className="wrap flex gap-3 !px-0 sm:!px-6">
          {s.mobile && (
            <a href={`tel:${s.mobile}`} className="btn-secondary flex-1 !py-3 sm:flex-none sm:!px-8">📞 Call</a>
          )}
          {wa && (
            <a href={wa} target="_blank" rel="noreferrer" className="btn-primary flex-1 !py-3 sm:flex-none sm:!px-8">WhatsApp</a>
          )}
        </div>
      </div>

      {big && (
        <div role="dialog" aria-label="Photo" className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onClick={() => setBig(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={big} alt="" className="max-h-full max-w-full rounded-[12px] object-contain" />
          <button type="button" className="absolute right-4 top-4 rounded-full bg-white px-4 py-2 text-[14px] font-semibold text-ink-heading">Close</button>
        </div>
      )}
    </article>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-[19px] font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Tags({ items, strong }: { items: string[]; strong?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((t) => (
        <span key={t} className={`rounded-full px-3.5 py-1.5 text-[14px] font-semibold ${strong ? "bg-mint text-white" : "border border-line bg-surface text-ink-heading"}`}>
          {t}
        </span>
      ))}
    </div>
  );
}
