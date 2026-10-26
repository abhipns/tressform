"use client";

// The "Hairstyles of the World" gallery on /hairstyles (26.10.2026, owner's
// approved layout): a Men / Women switch and region buttons; when a filter
// changes, the cards fade out and slide up one after another (about 0.45 s,
// staggered), then the new ones come in the same way. A count line says what
// is showing. Cards: 4 across on a laptop, 2 on a phone.

import { useEffect, useMemo, useRef, useState } from "react";
import BeforeAfter from "@/components/world/BeforeAfter";
import { REGION_LABEL, WORLD_REGIONS, showingLine, tryLink, type WorldRegion } from "@/lib/content/worldHairstyles";
import type { HairGender } from "@/lib/content/hairstyles";

export interface GalleryStyle {
  slug: string;
  id: string;
  name: string;
  gender: HairGender;
  region: WorldRegion;
  country: string;
  code: string;
  line: string;
  length: string;
  faces: string[];
  before: string | null;
  after: string | null;
}

const OUT_MS = 450;
const STAGGER_MS = 35;
const MAX_STAGGER = 12;

function Chip({ on, children, onClick }: { on: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`rounded-full border-[1.5px] px-4 py-2 text-[14px] font-semibold transition ${
        on ? "border-mint-deep bg-mint-deep text-white" : "border-line bg-surface text-ink-heading hover:border-ink-heading"
      }`}
    >
      {children}
    </button>
  );
}

export default function WorldGallery({ styles }: { styles: GalleryStyle[] }) {
  const [gender, setGender] = useState<HairGender>("men");
  const [region, setRegion] = useState<WorldRegion | "all">("all");
  const wanted = useMemo(
    () => styles.filter((s) => s.gender === gender && (region === "all" || s.region === region)),
    [styles, gender, region]
  );
  const [shown, setShown] = useState(wanted);
  const [phase, setPhase] = useState<"in" | "out">("in");
  const [round, setRound] = useState(0);
  const first = useRef(true);

  // Cards out (staggered), then the new set in.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (still) {
      setShown(wanted);
      return;
    }
    setPhase("out");
    const wait = OUT_MS + Math.min(shown.length, MAX_STAGGER) * STAGGER_MS;
    const t = window.setTimeout(() => {
      setShown(wanted);
      setPhase("in");
      setRound((r) => r + 1);
    }, wait);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted]);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="inline-flex self-start rounded-full border border-line bg-surface p-1" role="group" aria-label="Men or women">
          {(["men", "women"] as const).map((g) => (
            <button
              key={g}
              type="button"
              aria-pressed={gender === g}
              onClick={() => setGender(g)}
              className={`rounded-full px-5 py-2 text-[14.5px] font-semibold transition ${
                gender === g ? "bg-header-dark text-white" : "text-ink-heading"
              }`}
            >
              {g === "men" ? "Men" : "Women"}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Region">
        <Chip on={region === "all"} onClick={() => setRegion("all")}>
          All
        </Chip>
        {WORLD_REGIONS.map((r) => (
          <Chip key={r} on={region === r} onClick={() => setRegion(r)}>
            {REGION_LABEL[r]}
          </Chip>
        ))}
      </div>

      <p className="mt-5 text-[14.5px] font-medium text-ink-muted" aria-live="polite">
        {showingLine(wanted.length, gender, region)}
      </p>

      <ul className="mt-4 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {shown.map((s, i) => {
          const delay = `${Math.min(i, MAX_STAGGER) * STAGGER_MS}ms`;
          return (
            <li
              key={`${round}-${s.slug}`}
              className="flex flex-col overflow-hidden rounded-[18px] border border-line bg-surface"
              style={{
                animation: `${phase === "out" ? "tf-card-out" : "tf-card-in"} ${OUT_MS}ms ease both`,
                animationDelay: delay,
              }}
            >
              <a href={`/hairstyles/${s.slug}`} className="block">
                <BeforeAfter before={s.before} after={s.after} alt={`${s.name}, a hairstyle from ${s.country}`} index={i} />
              </a>
              <div className="flex flex-1 flex-col p-3 sm:p-4">
                <p className="text-[12px] font-semibold uppercase tracking-[.04em] text-ink-muted">
                  <span className="mr-1.5 rounded bg-bg-soft px-1.5 py-0.5 font-mono text-[11px] text-ink-heading">{s.code}</span>
                  {s.country}
                </p>
                <a href={`/hairstyles/${s.slug}`} className="mt-1.5">
                  <h3 className="text-[16px] font-semibold leading-snug text-ink-heading sm:text-[17px]">{s.name}</h3>
                </a>
                <p className="mt-1 line-clamp-2 text-[13.5px] leading-[1.45] text-ink-body">{s.line}</p>
                <div className="mb-3 mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-mint-pale px-2 py-0.5 text-[11.5px] font-semibold text-mint-deep">{s.length}</span>
                  {s.faces.slice(0, 2).map((f) => (
                    <span key={f} className="rounded-full bg-bg-soft px-2 py-0.5 text-[11.5px] font-semibold text-ink-heading">
                      {f} face
                    </span>
                  ))}
                </div>
                <a
                  href={tryLink(s.id)}
                  className="mt-auto inline-flex items-center justify-center rounded-full border-[1.5px] border-ink-heading px-3 py-2 text-center text-[13.5px] font-semibold text-ink-heading transition hover:bg-header-dark hover:text-white"
                >
                  Will this suit your face?
                </a>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
