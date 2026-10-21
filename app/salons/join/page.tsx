// /salons/join — list your salon on Tressform, FREE during the launch
// period (21.10.2026, owner's brief "Salon Onboarding").
//
// Three short steps, then optional stylists, a preview and "Submit & list my
// salon":
//   1. Tell us about your salon   (name, owner, phone, place, Google Maps)
//   2. Tell us what your salon offers (who, type, services, specialities, prices)
//   3. Show customers your salon  (at least 3 photos)
// Made for a salon owner on a phone: big tap-chips instead of typing, one
// thing per screen, Back and Continue at the thumb. Each step is checked
// before moving on (lib/salons.ts; the server checks everything again).
//
// Progress is kept on the device as the owner goes (localStorage, per
// account), so a salon can stop half-way and carry on later. After the
// salon is saved the same page edits it: "Complete your profile" links come
// back here at the right step (?step=photos, stylists, offer, extras).
//
// Signing in is the site's usual Google sign-in; the account becomes a salon
// account when the salon is saved. There is no payment or plan anywhere.

"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { authHeaders, loginUrl, useSession, SUPABASE_MOCK_MODE } from "@/lib/authClient";
import {
  AMENITIES,
  CUSTOMER_TYPES,
  IMAGE_SLOTS,
  MARKET_TIERS,
  MIN_PHOTOS,
  SERVICE_GROUPS,
  SPECIALITIES,
  checkExtras,
  checkStep1,
  checkStep2,
  checkStep3,
  checkStylists,
  emptySalonForm,
  mapsUrlFor,
  parsePrice,
  salonPhotoUrl,
  type Errors,
  type ImageType,
  type SalonForm,
} from "@/lib/salons";
import { removeSalonPhoto, trackSalonEvent, uploadSalonPhoto } from "@/lib/salonUpload";
import { Chips, Field, NavButtons, PhotoSlot, Section, StepBar, inputClass } from "@/components/salons/ui";
import SalonCard from "@/components/salons/SalonCard";

type Step = "basic" | "offer" | "photos" | "stylists" | "extras" | "review" | "done";
const STEP_NUMBER: Partial<Record<Step, number>> = { basic: 1, offer: 2, photos: 3 };
const FREE_LINE = "Free during our launch period. No registration fee. No subscription fee. No payment required.";

function draftKey(uid: string) {
  return `tf_salon_draft:${uid}`;
}

function JoinContent() {
  const { session, loading } = useSession();
  const params = useSearchParams();
  const uid = session?.user.id ?? null;

  const [form, setForm] = useState<SalonForm>(emptySalonForm);
  const [step, setStep] = useState<Step>("basic");
  const [errors, setErrors] = useState<Errors>({});
  const [loaded, setLoaded] = useState(false);
  const [existing, setExisting] = useState<{ slug: string; status: string; adminNote: string | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedSlug, setSavedSlug] = useState<string | null>(null);
  const [wantsStylists, setWantsStylists] = useState<boolean | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateNote, setLocateNote] = useState<string | null>(null);
  const top = useRef<HTMLDivElement>(null);

  // Load: the saved salon (edit), else the draft on this device (new).
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/salons/mine", { headers: await authHeaders(), cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        const wanted = params.get("step") as Step | null;
        if (res.ok && data.salon) {
          setForm(data.salon);
          setExisting({ slug: data.slug, status: data.status, adminNote: data.adminNote });
          setWantsStylists(data.salon.stylists.length > 0 ? true : null);
          setStep(wanted && ["basic", "offer", "photos", "stylists", "extras"].includes(wanted) ? wanted : "review");
        } else {
          try {
            const raw = window.localStorage.getItem(draftKey(uid));
            if (raw) {
              const d = JSON.parse(raw) as { form?: SalonForm; step?: Step };
              if (d.form) setForm({ ...emptySalonForm(), ...d.form });
              if (d.step && d.step !== "done") setStep(d.step);
            } else {
              trackSalonEvent("salon_onboarding_started");
            }
          } catch {
            /* no draft */
          }
        }
      } catch {
        if (!cancelled) setSaveError("We couldn't load your salon. Please check your internet and refresh the page.");
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // Keep the draft on this device while a NEW salon is being filled in.
  useEffect(() => {
    if (!uid || !loaded || existing || step === "done") return;
    try {
      window.localStorage.setItem(draftKey(uid), JSON.stringify({ form, step }));
    } catch {
      /* storage full or blocked: the form still works */
    }
  }, [form, step, uid, loaded, existing]);

  const set = <K extends keyof SalonForm>(key: K, value: SalonForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key as string]) setErrors((e) => ({ ...e, [key as string]: "" }));
  };

  function go(next: Step) {
    setErrors({});
    setSaveError(null);
    setStep(next);
    window.setTimeout(() => top.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  function continueFrom(current: Step, check: (f: SalonForm) => Errors, next: Step, event?: string) {
    const e = Object.fromEntries(Object.entries(check(form)).filter(([, v]) => v));
    if (Object.keys(e).length > 0) {
      setErrors(e);
      window.setTimeout(() => document.querySelector("[role=alert]")?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
      return;
    }
    if (event && !existing) trackSalonEvent(event);
    go(existing ? "review" : next);
  }

  async function locate() {
    setLocateNote(null);
    if (!("geolocation" in navigator)) {
      setLocateNote("This phone can't share its location. Please paste your Google Maps link instead.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setForm((f) => ({ ...f, latitude, longitude, mapsUrl: mapsUrlFor(latitude, longitude) }));
        setErrors((e) => ({ ...e, mapsUrl: "" }));
        setLocateNote("Found it. Please make sure you're at the salon right now; if not, paste the salon's Google Maps link instead.");
        setLocating(false);
      },
      () => {
        setLocateNote("We couldn't get your location. Please paste your salon's Google Maps link instead.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }

  async function addPhoto(type: ImageType, file: File) {
    if (!uid) return;
    try {
      const { path } = await uploadSalonPhoto(file, uid);
      setForm((f) => ({ ...f, images: [...f.images.filter((i) => i.type !== type), { type, path }] }));
      setErrors((e) => ({ ...e, [`image_${type}`]: "", images: "" }));
    } catch (err) {
      setErrors((e) => ({ ...e, [`image_${type}`]: (err as Error).message }));
    }
  }

  function removePhoto(type: ImageType) {
    const gone = form.images.find((i) => i.type === type);
    setForm((f) => ({ ...f, images: f.images.filter((i) => i.type !== type) }));
    // Only delete the file if it was never saved with the salon.
    if (gone && !existing) removeSalonPhoto(gone.path);
  }

  async function submit() {
    if (!uid) return;
    const all = { ...checkStep1(form), ...checkStep2(form), ...checkStep3(form, uid), ...checkStylists(form, uid), ...checkExtras(form) };
    const bad = Object.entries(all).filter(([, v]) => v);
    if (bad.length > 0) {
      setSaveError(`${bad[0][1]} Please go back and fix it.`);
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/salons/mine", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ form }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        window.location.assign(loginUrl("/salons/join"));
        return;
      }
      if (!res.ok) throw new Error(data.error || "We couldn't save your salon. Please try again.");
      try {
        window.localStorage.removeItem(draftKey(uid));
      } catch {
        /* fine */
      }
      setSavedSlug(data.slug);
      setExisting({ slug: data.slug, status: data.status, adminNote: existing?.adminNote ?? null });
      go("done");
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const photoUrl = (type: ImageType) => {
    const img = form.images.find((i) => i.type === type);
    return img ? salonPhotoUrl(img.path) : null;
  };
  const cardPrice = useMemo(() => {
    for (const v of [form.priceUnisex, form.priceMen, form.priceWomen]) {
      const n = parsePrice(v);
      if (n !== null && !Number.isNaN(n)) return n;
    }
    return null;
  }, [form.priceMen, form.priceWomen, form.priceUnisex]);

  // ---------------------------------------------------------------- gates
  if (SUPABASE_MOCK_MODE) {
    return <Shell><p className="text-ink-body">Salon sign-up isn't available in the demo.</p></Shell>;
  }
  if (loading || (uid && !loaded)) {
    return <Shell><p className="text-ink-muted">Loading…</p></Shell>;
  }
  if (!session) {
    return (
      <Shell>
        <p className="eyebrow">For salons</p>
        <h1 className="mt-2 text-[clamp(26px,4.5vw,38px)] leading-tight">List your salon on Tressform</h1>
        <p className="mt-3 text-[16px] leading-[1.6] text-ink-body">
          Tressform shows people which haircut suits their face. List your salon, and customers looking for the styles
          you&apos;re good at can find you. It takes under 5 minutes.
        </p>
        <ul className="mt-5 flex flex-col gap-2 text-[15px] text-ink-heading">
          <li>✓ Free during our launch period</li>
          <li>✓ No registration fee, no subscription, no payment</li>
          <li>✓ Your own salon profile page</li>
        </ul>
        <a href={loginUrl("/salons/join")} className="btn-primary mt-7 w-full sm:w-auto">
          Sign in with Google to start
        </a>
        <p className="mt-3 text-[13px] text-ink-muted">We use sign-in only so that only you can change your salon&apos;s profile.</p>
      </Shell>
    );
  }

  // ---------------------------------------------------------------- steps
  const errs = errors;
  return (
    <Shell>
      <div ref={top} className="scroll-mt-24" />
      {existing && step !== "done" && existing.adminNote && (
        <p className="mb-5 rounded-[14px] bg-lilac/15 px-4 py-3 text-[14px] text-ink-heading">
          <strong>Note from Tressform:</strong> {existing.adminNote}
        </p>
      )}

      {step === "basic" && (
        <>
          <StepBar step={1} of={3} title="Tell us about your salon" />
          <div className="flex flex-col gap-4">
            <Field label="Salon name" error={errs.name}>
              <input className={inputClass(!!errs.name)} value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={80} autoComplete="organization" />
            </Field>
            <Field label="Owner / manager name" error={errs.ownerManagerName}>
              <input className={inputClass(!!errs.ownerManagerName)} value={form.ownerManagerName} onChange={(e) => set("ownerManagerName", e.target.value)} maxLength={80} autoComplete="name" />
            </Field>
            <Field label="Mobile number" error={errs.mobile} hint="10 digits. Customers and Tressform will use it to reach you.">
              <input type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="10-digit mobile number" className={inputClass(!!errs.mobile)} value={form.mobile} onChange={(e) => set("mobile", e.target.value)} maxLength={16} />
            </Field>
            <div>
              <label className="flex items-center gap-2.5 text-[14.5px] font-semibold text-ink-heading">
                <input type="checkbox" className="h-[18px] w-[18px] accent-mint-deep" checked={form.whatsappSame} onChange={(e) => set("whatsappSame", e.target.checked)} />
                WhatsApp number is the same as mobile
              </label>
              {!form.whatsappSame && (
                <div className="mt-3">
                  <Field label="WhatsApp number" optional error={errs.whatsapp}>
                    <input type="tel" inputMode="numeric" className={inputClass(!!errs.whatsapp)} value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} maxLength={16} />
                  </Field>
                </div>
              )}
            </div>
            <Field label="Email" optional error={errs.email}>
              <input type="email" inputMode="email" autoComplete="email" className={inputClass(!!errs.email)} value={form.email} onChange={(e) => set("email", e.target.value)} maxLength={120} />
            </Field>
            <Field label="Instagram" optional error={errs.instagram} hint="Just the name, e.g. mysalon">
              <input className={inputClass(!!errs.instagram)} value={form.instagram} onChange={(e) => set("instagram", e.target.value)} maxLength={80} placeholder="@mysalon" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="City" error={errs.city}>
                <input className={inputClass(!!errs.city)} value={form.city} onChange={(e) => set("city", e.target.value)} maxLength={60} autoComplete="address-level2" />
              </Field>
              <Field label="Area / locality" error={errs.area}>
                <input className={inputClass(!!errs.area)} value={form.area} onChange={(e) => set("area", e.target.value)} maxLength={80} placeholder="e.g. Sector 18" />
              </Field>
            </div>
            <Field label="Full address" error={errs.address}>
              <textarea rows={2} className={inputClass(!!errs.address)} value={form.address} onChange={(e) => set("address", e.target.value)} maxLength={300} autoComplete="street-address" />
            </Field>
            <Section title="Where is your salon on Google Maps?" note="So customers can find their way to you.">
              <button type="button" onClick={locate} disabled={locating} className="btn-secondary w-full !py-3 sm:w-auto">
                📍 {locating ? "Finding you…" : "Locate my salon"}
              </button>
              <p className="mt-2 text-[12.5px] text-ink-muted">Only if you&apos;re at the salon now. Your phone will ask first.</p>
              {locateNote && <p className="mt-2 text-[13px] text-ink-body">{locateNote}</p>}
              <div className="mt-4">
                <Field label="Or paste your Google Maps link" error={errs.mapsUrl} hint="Open your salon in Google Maps → Share → Copy link.">
                  <input inputMode="url" className={inputClass(!!errs.mapsUrl)} value={form.mapsUrl} onChange={(e) => setForm((f) => ({ ...f, mapsUrl: e.target.value, latitude: null, longitude: null }))} maxLength={500} placeholder="https://maps.app.goo.gl/…" />
                </Field>
              </div>
            </Section>
          </div>
          <NavButtons onBack={existing ? () => go("review") : undefined} onNext={() => continueFrom("basic", checkStep1, "offer", "salon_step_1_completed")} nextLabel={existing ? "Done" : "Continue"} />
          {!existing && <p className="mt-4 text-center text-[12.5px] text-ink-muted">Free during our launch period.</p>}
        </>
      )}

      {step === "offer" && (
        <>
          <StepBar step={2} of={3} title="Tell us what your salon offers" />
          <div className="flex flex-col gap-4">
            <Section title="Who do you serve?" note="Choose all that apply.">
              <Chips options={CUSTOMER_TYPES} value={form.customerTypes} onChange={(v) => set("customerTypes", v)} error={errs.customerTypes} />
            </Section>
            <Section title="What type of salon are you?" note="Don't worry if you're unsure. Tressform may verify or adjust this category after reviewing your salon.">
              <Chips
                single
                options={MARKET_TIERS}
                hints={Object.fromEntries(MARKET_TIERS.map((t) => [t.id, t.hint]))}
                value={form.marketTier ? [form.marketTier] : []}
                onChange={(v) => set("marketTier", v[0] ?? "")}
                error={errs.marketTier}
              />
            </Section>
            <Section title="Which services do you offer?" note="Choose at least one.">
              {SERVICE_GROUPS.map((g) => (
                <div key={g.title} className="mb-3 last:mb-0">
                  <p className="mb-2 text-[12.5px] font-bold uppercase tracking-[.06em] text-ink-muted">{g.title}</p>
                  <Chips options={g.items} value={form.services} onChange={(v) => set("services", v)} />
                </div>
              ))}
              {errs.services && <p className="mt-2 text-[12.5px] text-danger" role="alert">{errs.services}</p>}
            </Section>
            <Section title="What hairstyles or services are you particularly good at?" note="Customers who choose these styles on Tressform will be matched with you.">
              <Chips options={SPECIALITIES} value={form.specialities} onChange={(v) => set("specialities", v)} error={errs.specialities} />
            </Section>
            <Section title="Average haircut price" note="Fill in the ones that apply to you.">
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ["priceMen", "Men"],
                    ["priceWomen", "Women"],
                    ["priceUnisex", "Unisex"],
                    ["priceAdvanced", "Advanced / premium cut"],
                  ] as const
                ).map(([k, label]) => (
                  <Field key={k} label={label} optional error={errs[k]}>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted">₹</span>
                      <input inputMode="numeric" className={`${inputClass(!!errs[k])} !pl-8`} value={form[k]} onChange={(e) => set(k, e.target.value)} maxLength={7} placeholder="0" />
                    </div>
                  </Field>
                ))}
              </div>
            </Section>
          </div>
          <NavButtons onBack={() => go(existing ? "review" : "basic")} onNext={() => continueFrom("offer", checkStep2, "photos", "salon_step_2_completed")} nextLabel={existing ? "Done" : "Continue"} />
        </>
      )}

      {step === "photos" && (
        <>
          <StepBar step={3} of={3} title="Show customers your salon" />
          <p className="-mt-3 mb-5 text-[15px] leading-[1.55] text-ink-body">
            Add at least {MIN_PHOTOS} photos: the outside, the inside and your work. More photos help customers choose you.
          </p>
          {errs.images && <p className="mb-3 text-[13px] text-danger" role="alert">{errs.images}</p>}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {IMAGE_SLOTS.map((slot) => (
              <PhotoSlot
                key={slot.type}
                label={slot.label}
                hint={slot.hint}
                required={slot.required}
                url={photoUrl(slot.type)}
                error={errs[`image_${slot.type}`]}
                onPick={(file) => addPhoto(slot.type, file)}
                onRemove={() => removePhoto(slot.type)}
              />
            ))}
          </div>
          <p className="mt-3 text-[12.5px] text-ink-muted">Tap a box to take a photo or choose one from your gallery.</p>
          <NavButtons onBack={() => go(existing ? "review" : "offer")} onNext={() => continueFrom("photos", (f) => checkStep3(f, uid ?? undefined), "stylists", "salon_step_3_completed")} nextLabel={existing ? "Done" : "Continue"} />
        </>
      )}

      {step === "stylists" && (
        <>
          <h1 className="text-[clamp(24px,4vw,32px)] leading-tight">Would you like to showcase your stylists?</h1>
          <p className="mt-2 text-[15px] leading-[1.55] text-ink-body">Customers like to know who will cut their hair. You can also do this later.</p>
          {wantsStylists === null && form.stylists.length === 0 ? (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                className="btn-primary !py-3"
                onClick={() => {
                  setWantsStylists(true);
                  setForm((f) => ({ ...f, stylists: [{ name: "", photoPath: null, experienceYears: "", specialities: [] }] }));
                }}
              >
                Yes, add stylists
              </button>
              <button type="button" className="btn-secondary !py-3" onClick={() => go("review")}>
                I&apos;ll do this later
              </button>
            </div>
          ) : (
            <StylistEditor form={form} setForm={setForm} errors={errs} uid={uid!} />
          )}
          {(wantsStylists !== null || form.stylists.length > 0) && (
            <NavButtons
              onBack={() => go(existing ? "review" : "photos")}
              onNext={() => {
                const e = Object.fromEntries(Object.entries(checkStylists(form, uid ?? undefined)).filter(([, v]) => v));
                if (Object.keys(e).length) return setErrors(e);
                go("review");
              }}
              nextLabel={existing ? "Done" : "Continue"}
            />
          )}
          {wantsStylists === null && form.stylists.length === 0 && !existing && (
            <div className="mt-6">
              <button type="button" className="text-[14px] font-semibold text-ink-muted underline underline-offset-4" onClick={() => go("photos")}>
                ← Back to photos
              </button>
            </div>
          )}
        </>
      )}

      {step === "extras" && (
        <>
          <h1 className="text-[clamp(24px,4vw,32px)] leading-tight">More about your salon</h1>
          <p className="mt-2 mb-5 text-[15px] text-ink-body">All optional. Fill in what you like.</p>
          <div className="flex flex-col gap-4">
            <Field label="Salon timings" optional error={errs.timings} hint="e.g. 10 AM – 9 PM, Tuesday closed">
              <input className={inputClass(!!errs.timings)} value={form.timings} onChange={(e) => set("timings", e.target.value)} maxLength={300} />
            </Field>
            <Section title="Amenities">
              <Chips options={AMENITIES} value={form.amenities} onChange={(v) => set("amenities", v)} error={errs.amenities} />
            </Section>
            <Field label="About your salon" optional error={errs.about} hint={`${form.about.length}/1000`}>
              <textarea rows={4} className={inputClass(!!errs.about)} value={form.about} onChange={(e) => set("about", e.target.value)} maxLength={1000} placeholder="What makes your salon special?" />
            </Field>
          </div>
          <NavButtons onBack={() => go("review")} onNext={() => continueFrom("extras", checkExtras, "review")} nextLabel="Done" />
        </>
      )}

      {step === "review" && (
        <>
          <p className="eyebrow">{existing ? "Your salon" : "Almost done"}</p>
          <h1 className="mt-2 text-[clamp(24px,4vw,32px)] leading-tight">{existing ? "Your salon profile" : "Check your salon profile"}</h1>
          <p className="mt-2 mb-5 text-[15px] text-ink-body">This is how customers will see you.</p>
          <SalonCard
            s={{
              name: form.name,
              area: form.area,
              city: form.city,
              customerTypes: form.customerTypes,
              marketTier: form.marketTier,
              services: form.services,
              specialities: form.specialities,
              price: cardPrice,
              photo: photoUrl("EXTERIOR") ?? photoUrl("INTERIOR"),
            }}
          />
          <div className="mt-4 grid grid-cols-2 gap-2 text-[14px] sm:grid-cols-3">
            {(
              [
                ["basic", "Edit details"],
                ["offer", "Edit services & prices"],
                ["photos", `Photos (${form.images.length})`],
                ["stylists", `Stylists (${form.stylists.length})`],
                ...(existing ? ([["extras", "Timings & amenities"]] as const) : []),
              ] as [Step, string][]
            ).map(([s, label]) => (
              <button key={s} type="button" onClick={() => go(s)} className="rounded-full border border-line bg-surface px-3 py-2 font-semibold text-ink-heading hover:border-ink-heading">
                {label}
              </button>
            ))}
          </div>
          {saveError && <p className="mt-5 text-[14px] text-danger" role="alert">{saveError}</p>}
          <button type="button" onClick={submit} disabled={saving} className="btn-primary mt-6 w-full !py-4 uppercase tracking-[.03em]">
            {saving ? "Saving…" : existing ? "Save changes" : "Submit & list my salon"}
          </button>
          <p className="mt-3 text-center text-[13px] text-ink-muted">{FREE_LINE}</p>
          {existing && (
            <p className="mt-4 text-center">
              <Link href={`/salons/${existing.slug}`} className="text-[14px] font-semibold text-mint-deep underline underline-offset-4">
                View my salon profile
              </Link>
            </p>
          )}
        </>
      )}

      {step === "done" && (
        <div className="text-center">
          <p className="text-[52px]" aria-hidden="true">
            🎉
          </p>
          <h1 className="mt-2 text-[clamp(26px,4.5vw,36px)] leading-tight">Your salon is now on Tressform!</h1>
          <p className="mx-auto mt-3 max-w-[48ch] text-[15.5px] leading-[1.6] text-ink-body">
            Your salon profile has been submitted successfully. Customers will soon be able to discover your salon based
            on the hairstyles and services you offer.
          </p>
          {existing?.status !== "ACTIVE" && (
            <p className="mx-auto mt-3 max-w-[48ch] text-[13.5px] text-ink-muted">
              Our team takes a quick look at every new salon. Your profile goes live once it&apos;s checked, usually
              within a day.
            </p>
          )}
          <div className="mx-auto mt-7 max-w-[420px] rounded-[20px] border border-line bg-surface p-5 text-left">
            <p className="text-[16px] font-semibold text-ink-heading">Complete your profile</p>
            <ul className="mt-3 flex flex-col divide-y divide-line text-[15px]">
              {(
                [
                  ["photos", "Add more salon photos"],
                  ["stylists", "Add stylists"],
                  ["offer", "Add services"],
                  ["offer", "Add pricing"],
                  ["extras", "Add salon timings"],
                  ["extras", "Add amenities"],
                ] as [Step, string][]
              ).map(([s, label]) => (
                <li key={label}>
                  <button type="button" onClick={() => go(s)} className="flex w-full items-center justify-between py-2.5 font-semibold text-ink-heading">
                    {label} <span className="text-mint" aria-hidden="true">›</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          {savedSlug && (
            <Link href={`/salons/${savedSlug}`} className="btn-primary mt-7 w-full !py-4 uppercase tracking-[.03em] sm:w-auto">
              View my salon profile
            </Link>
          )}
        </div>
      )}
    </Shell>
  );
}

function StylistEditor({
  form,
  setForm,
  errors,
  uid,
}: {
  form: SalonForm;
  setForm: (fn: (f: SalonForm) => SalonForm) => void;
  errors: Errors;
  uid: string;
}) {
  const [photoError, setPhotoError] = useState<Record<number, string>>({});
  const update = (i: number, patch: Partial<SalonForm["stylists"][number]>) =>
    setForm((f) => ({ ...f, stylists: f.stylists.map((s, n) => (n === i ? { ...s, ...patch } : s)) }));
  return (
    <div className="mt-6 flex flex-col gap-4">
      {form.stylists.map((s, i) => (
        <div key={i} className="rounded-[20px] border border-line bg-surface p-4">
          <div className="flex gap-4">
            <div className="w-[96px] shrink-0">
              <PhotoSlot
                round
                label="Photo"
                url={s.photoPath ? salonPhotoUrl(s.photoPath) : null}
                error={photoError[i]}
                onPick={async (file) => {
                  try {
                    const { path } = await uploadSalonPhoto(file, uid);
                    update(i, { photoPath: path });
                    setPhotoError((e) => ({ ...e, [i]: "" }));
                  } catch (err) {
                    setPhotoError((e) => ({ ...e, [i]: (err as Error).message }));
                  }
                }}
                onRemove={() => update(i, { photoPath: null })}
              />
            </div>
            <div className="flex flex-1 flex-col gap-3">
              <Field label="Stylist name">
                <input className={inputClass(!!errors[`stylist_${i}`])} value={s.name} onChange={(e) => update(i, { name: e.target.value })} maxLength={80} />
              </Field>
              <Field label="Years of experience" optional>
                <input inputMode="numeric" className={inputClass()} value={s.experienceYears} onChange={(e) => update(i, { experienceYears: e.target.value })} maxLength={2} placeholder="e.g. 5" />
              </Field>
            </div>
          </div>
          <p className="mb-2 mt-4 text-[14px] font-semibold text-ink-heading">Speciality</p>
          <Chips options={SPECIALITIES} value={s.specialities} onChange={(v) => update(i, { specialities: v })} />
          {errors[`stylist_${i}`] && <p className="mt-2 text-[12.5px] text-danger" role="alert">{errors[`stylist_${i}`]}</p>}
          <button type="button" className="mt-3 text-[13.5px] font-semibold text-ink-muted underline underline-offset-4" onClick={() => setForm((f) => ({ ...f, stylists: f.stylists.filter((_, n) => n !== i) }))}>
            Remove this stylist
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn-secondary !py-3"
        onClick={() => setForm((f) => ({ ...f, stylists: [...f.stylists, { name: "", photoPath: null, experienceYears: "", specialities: [] }] }))}
      >
        + Add {form.stylists.length ? "another" : "a"} stylist
      </button>
      {errors.stylists && <p className="text-[12.5px] text-danger">{errors.stylists}</p>}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section className="wrap py-10 sm:py-14">
      <div className="mx-auto max-w-[640px]">{children}</div>
    </section>
  );
}

export default function SalonJoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinContent />
    </Suspense>
  );
}
