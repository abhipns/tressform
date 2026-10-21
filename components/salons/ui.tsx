"use client";

// Small building blocks for the salon pages (21.10.2026): text fields, tap
// chips, the step bar and a photo slot. Styled like the rest of the site
// (checkout's fields, the results page's chips).

import { useRef, useState, type ReactNode } from "react";
import type { Choice } from "@/lib/salons";

export function Field({
  label,
  optional,
  error,
  hint,
  children,
}: {
  label: string;
  optional?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[14px] font-semibold text-ink-heading">
        {label}
        {optional && <span className="ml-1.5 font-normal text-ink-muted">(optional)</span>}
      </span>
      {children}
      {(error || hint) && (
        <span className={`mt-1.5 block text-[12.5px] leading-[1.45] ${error ? "text-danger" : "text-ink-muted"}`} role={error ? "alert" : undefined}>
          {error || hint}
        </span>
      )}
    </label>
  );
}

export const inputClass = (bad?: boolean) =>
  `w-full rounded-sm2 border bg-surface px-4 py-3 text-[15.5px] text-ink-heading outline-none transition focus:border-mint-deep ${
    bad ? "border-danger" : "border-line"
  }`;

/** Tap-to-choose chips. `single` makes them behave like one-choice buttons. */
export function Chips({
  options,
  value,
  onChange,
  single,
  error,
  hints,
}: {
  options: Choice[];
  value: string[];
  onChange: (next: string[]) => void;
  single?: boolean;
  error?: string;
  hints?: Record<string, string>;
}) {
  return (
    <div>
      <div className="flex flex-wrap gap-2" role={single ? "radiogroup" : "group"}>
        {options.map((o) => {
          const on = value.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              role={single ? "radio" : "checkbox"}
              aria-checked={on}
              onClick={() => onChange(single ? [o.id] : on ? value.filter((v) => v !== o.id) : [...value, o.id])}
              className={`rounded-full border-[1.5px] px-4 py-2.5 text-left text-[14.5px] font-semibold transition ${
                on ? "border-mint bg-mint text-white" : "border-line bg-surface text-ink-heading hover:border-ink-heading"
              }`}
            >
              {on && !single && <span aria-hidden="true">✓ </span>}
              {o.label}
              {hints?.[o.id] && <span className={`block text-[12px] font-medium ${on ? "text-white/85" : "text-ink-muted"}`}>{hints[o.id]}</span>}
            </button>
          );
        })}
      </div>
      {error && (
        <p className="mt-2 text-[12.5px] text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function StepBar({ step, of, title }: { step: number; of: number; title: string }) {
  return (
    <div className="mb-6">
      <p className="text-[12.5px] font-bold uppercase tracking-[.06em] text-mint-deep">
        Step {step} of {of}
      </p>
      <div className="mt-2 flex gap-1.5" aria-hidden="true">
        {Array.from({ length: of }, (_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i < step ? "bg-mint" : "bg-line"}`} />
        ))}
      </div>
      <h1 className="mt-5 text-[clamp(24px,4vw,32px)] leading-tight">{title}</h1>
    </div>
  );
}

export function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="rounded-[20px] border border-line bg-surface p-4 sm:p-5">
      <h2 className="text-[17px] font-semibold leading-snug">{title}</h2>
      {note && <p className="mt-1 text-[13.5px] leading-[1.5] text-ink-muted">{note}</p>}
      <div className="mt-3.5">{children}</div>
    </section>
  );
}

/** One photo: empty (tap to add, from camera or gallery), uploading, or a preview with Remove. */
export function PhotoSlot({
  label,
  hint,
  required,
  url,
  error,
  onPick,
  onRemove,
  round,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  url: string | null;
  error?: string;
  onPick: (file: File) => Promise<void>;
  onRemove: () => void;
  round?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  async function take(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      await onPick(file);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  return (
    <div>
      <div
        className={`relative overflow-hidden border-[1.5px] ${round ? "aspect-square rounded-full" : "aspect-[4/3] rounded-[16px]"} ${
          error ? "border-danger" : drag ? "border-mint" : url ? "border-transparent" : "border-dashed border-line"
        } bg-bg-soft`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          take(e.dataTransfer.files?.[0]);
        }}
      >
        {url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={label} className="absolute inset-0 h-full w-full object-cover" />
            <button
              type="button"
              onClick={onRemove}
              className="absolute right-2 top-2 rounded-full bg-white/95 px-3 py-1.5 text-[12.5px] font-semibold text-ink-heading shadow-card"
            >
              Remove
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-3 text-center"
          >
            <span className="text-[26px] leading-none text-mint" aria-hidden="true">
              {busy ? "…" : "+"}
            </span>
            <span className="text-[13.5px] font-semibold text-ink-heading">{busy ? "Uploading…" : label}</span>
            {!busy && hint && <span className="text-[12px] text-ink-muted">{hint}</span>}
          </button>
        )}
        {required && !url && (
          <span className="absolute left-2 top-2 rounded-full bg-lilac px-2 py-0.5 text-[11px] font-bold text-header-dark">Needed</span>
        )}
      </div>
      {url && <p className="mt-1.5 truncate text-[12.5px] font-semibold text-ink-heading">{label}</p>}
      {error && <p className="mt-1.5 text-[12.5px] text-danger">{error}</p>}
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => take(e.target.files?.[0])} />
    </div>
  );
}

export function NavButtons({
  onBack,
  onNext,
  nextLabel = "Continue",
  busy,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  busy?: boolean;
}) {
  return (
    <div className="sticky bottom-0 -mx-6 mt-8 flex gap-3 border-t border-line bg-bg/95 px-6 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
      {onBack && (
        <button type="button" onClick={onBack} className="btn-secondary !px-6 !py-3">
          Back
        </button>
      )}
      <button type="button" onClick={onNext} disabled={busy} className="btn-primary flex-1 !py-3 sm:flex-none sm:!px-10">
        {busy ? "Saving…" : nextLabel}
      </button>
    </div>
  );
}
