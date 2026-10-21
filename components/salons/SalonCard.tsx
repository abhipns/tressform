// The short salon profile card — the review screen before submitting, and
// the admin list (21.10.2026).

import { CUSTOMER_TYPES, SERVICES, SPECIALITIES, labelsFor } from "@/lib/salons";

export interface SalonCardData {
  name: string;
  area: string;
  city: string;
  customerTypes: string[];
  marketTier: string;
  services: string[];
  specialities: string[];
  price: number | null;
  photo: string | null;
}

export default function SalonCard({ s }: { s: SalonCardData }) {
  const specialities = labelsFor(SPECIALITIES, s.specialities);
  const services = labelsFor(SERVICES, s.services);
  return (
    <article className="overflow-hidden rounded-[20px] border border-line bg-surface shadow-card">
      <div className="relative aspect-[16/9] bg-bg-soft">
        {s.photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.photo} alt={`${s.name}`} className="absolute inset-0 h-full w-full object-cover" />
        )}
      </div>
      <div className="p-5">
        <h3 className="text-[22px] font-semibold uppercase leading-tight tracking-[.01em]">{s.name || "Your salon"}</h3>
        <p className="mt-1 text-[14.5px] text-ink-body">
          📍 {[s.area, s.city].filter(Boolean).join(", ")}
        </p>
        <p className="mt-3 text-[13px] font-bold uppercase tracking-[.06em] text-ink-heading">
          {labelsFor(CUSTOMER_TYPES, s.customerTypes).join(" • ")}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {s.marketTier && (
            <span className="rounded-full bg-mint-pale px-3 py-1 text-[12.5px] font-bold uppercase tracking-[.05em] text-mint-deep">
              {s.marketTier}
            </span>
          )}
          {s.price !== null && <span className="text-[14.5px] font-semibold text-ink-heading">Haircut ₹{s.price}</span>}
        </div>
        {specialities.length > 0 && (
          <>
            <p className="mt-4 text-[12px] font-bold uppercase tracking-[.06em] text-ink-muted">Specialities</p>
            <p className="mt-1 text-[14.5px] text-ink-heading">{specialities.join(" • ")}</p>
          </>
        )}
        {services.length > 0 && (
          <>
            <p className="mt-3 text-[12px] font-bold uppercase tracking-[.06em] text-ink-muted">Services</p>
            <p className="mt-1 text-[14.5px] text-ink-heading">{services.join(" • ")}</p>
          </>
        )}
      </div>
    </article>
  );
}
