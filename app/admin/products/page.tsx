"use client";

// /admin/products — the owner's hair-care products. OWNER ONLY.
//
// 12.10.2026. The owner pastes in each product's name, brand, kind and the
// links for each shop (Amazon: the plain product page — the site adds the
// owner's Associate ID; others: EarnKaro affiliate links), and ticks which
// hair types it suits. The hairstyle cards and the Hair Care page pick from
// this list straight away — no upload needed. Products can be switched off
// without deleting them. The list shows how often each was tapped in the
// last 30 days.

import { useEffect, useState } from "react";
import { SUPABASE_MOCK_MODE, authHeaders, loginUrl, useSession } from "@/lib/authClient";
import { supabase } from "@/lib/supabaseClient";
import { GROUPS, KINDS, KIND_IDS, SHOPS, amazonLink, shopLabel, type ProductKind, type ShopId } from "@/lib/content/haircare";

interface Row {
  id: string;
  title: string;
  brand: string | null;
  kind: string | null;
  store: string | null;
  amazon_asin: string | null;
  image_url: string | null;
  shop_links: Record<string, string> | null;
  description: string | null;
  earnkaro_tracked_url: string | null;
  gender: "all" | "men" | "women";
  hair_types: string[];
  sort_order: number;
  is_active: boolean;
  clicks30: number;
}

const EMPTY = {
  id: "",
  title: "",
  brand: "",
  kind: "" as ProductKind | "",
  shops: { amazon: "", flipkart: "", nykaa: "", myntra: "", brand: "" } as Record<ShopId, string>,
  image: "",
  note: "",
  gender: "all",
  hairTypes: [] as string[],
  sortOrder: "0",
};

const TYPES = ["straight", "wavy", "curly"] as const;
const input =
  "w-full rounded-sm2 border border-line bg-surface px-3.5 py-2.5 text-[15px] outline-none focus:border-mint-deep";

export default function AdminProductsPage() {
  const { session, loading } = useSession();
  const userId = session?.user.id ?? null;
  const [isOwner, setIsOwner] = useState<boolean | null>(SUPABASE_MOCK_MODE ? true : null);
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (SUPABASE_MOCK_MODE || !userId) return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setIsOwner(data?.role === "ADMIN");
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function load() {
    const res = await fetch("/api/admin/products", { headers: await authHeaders() });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setRows(data.products ?? []);
    else setMessage({ ok: false, text: data.error ?? "Couldn't load the products." });
  }

  useEffect(() => {
    if (isOwner) load();
  }, [isOwner]);

  async function send(method: "POST" | "PATCH" | "DELETE", body?: object, query = "") {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/products" + query, {
        method,
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ ok: false, text: data.error ?? "That didn't work. Please try again." });
        return false;
      }
      await load();
      return true;
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    const body = {
      id: form.id || undefined,
      title: form.title,
      brand: form.brand,
      kind: form.kind,
      shops: form.shops,
      image: form.image,
      note: form.note,
      gender: form.gender,
      hairTypes: form.hairTypes,
      sortOrder: Number(form.sortOrder) || 0,
    };
    const ok = await send(form.id ? "PATCH" : "POST", body);
    if (ok) {
      setMessage({ ok: true, text: form.id ? "Saved." : "Added. It shows on the site straight away." });
      setForm(EMPTY);
    }
  }

  function edit(r: Row) {
    setForm({
      id: r.id,
      title: r.title,
      brand: r.brand ?? "",
      kind: (r.kind ?? "") as ProductKind,
      shops: {
        amazon: r.amazon_asin ? amazonLink(r.amazon_asin) : "",
        flipkart: r.shop_links?.flipkart ?? "",
        nykaa: r.shop_links?.nykaa ?? "",
        myntra: r.shop_links?.myntra ?? "",
        brand: r.shop_links?.brand ?? (r.earnkaro_tracked_url ?? ""),
      },
      image: r.image_url ?? "",
      note: r.description ?? "",
      gender: r.gender,
      hairTypes: r.hair_types ?? [],
      sortOrder: String(r.sort_order ?? 0),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ------------------------------------------------------------------ gates
  if (!SUPABASE_MOCK_MODE && (loading || (userId && isOwner === null))) {
    return (
      <section className="frame flex min-h-[50vh] items-center justify-center py-20">
        <div className="h-9 w-9 animate-spin rounded-full border-[3.5px] border-mint-pale border-t-mint-deep" />
      </section>
    );
  }
  if (!SUPABASE_MOCK_MODE && !userId) {
    return (
      <section className="frame py-20">
        <h1 className="h-display">Hair-care products</h1>
        <p className="lead mt-4">Log in with the owner&apos;s account to use this page.</p>
        <a href={loginUrl("/admin/products")} className="btn-primary mt-7">
          Log in
        </a>
      </section>
    );
  }
  if (isOwner === false) {
    return (
      <section className="frame py-20">
        <h1 className="h-display">Hair-care products</h1>
        <p className="lead mt-4">This page is for the site owner only.</p>
      </section>
    );
  }

  const shopsOf = (r: Row) => {
    const ids = SHOPS.map((x) => x.id).filter((id) => (id === "amazon" ? r.amazon_asin : r.shop_links?.[id]));
    if (ids.length === 0 && r.earnkaro_tracked_url) return r.store ?? "one shop";
    return ids.length ? ids.map((id) => shopLabel(id)).join(", ") : "No shop links";
  };
  const kindLabel = (k: string | null) => (k && k in KINDS ? KINDS[k as ProductKind].label : "No kind set");

  return (
    <section className="frame py-12 lg:py-16">
      <h1 className="h-display">Hair-care products</h1>
      <p className="lead mt-3 max-w-[64ch]">
        Products added here show on the hairstyle cards and the Hair Care page straight away. Each card shows up to
        three: a shampoo, the styling product the cut needs, and a conditioner, picked by kind, gender and hair type.
        The first product of each kind (lowest order number) is the one shown.
      </p>

      <div className="mt-8 max-w-[760px] rounded-[20px] bg-bg-soft p-5 sm:p-6">
        <h2 className="text-[19px] font-semibold">{form.id ? "Change a product" : "Add a product"}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-[13.5px] font-semibold text-ink-heading">Product name</span>
            <input className={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Curl Defining Cream 150 ml" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13.5px] font-semibold text-ink-heading">Brand</span>
            <input className={input} value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13.5px] font-semibold text-ink-heading">Kind of product</span>
            <select className={input} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as ProductKind })}>
              <option value="">Choose…</option>
              {GROUPS.map((g) => (
                <optgroup key={g.id} label={g.label}>
                  {KIND_IDS.filter((k) => KINDS[k].group === g.id).map((k) => (
                    <option key={k} value={k}>
                      {KINDS[k].label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <fieldset className="grid gap-3 sm:col-span-2">
            <legend className="mb-1.5 text-[13.5px] font-semibold text-ink-heading">Where to buy it (fill in at least one)</legend>
            {SHOPS.map((shop) => (
              <label key={shop.id} className="grid gap-1 sm:grid-cols-[120px_1fr] sm:items-center sm:gap-3">
                <span className="text-[14px] text-ink-heading">{shop.label}</span>
                <input
                  className={input}
                  value={form.shops[shop.id]}
                  onChange={(e) => setForm({ ...form, shops: { ...form.shops, [shop.id]: e.target.value } })}
                  placeholder={shop.id === "amazon" ? "The product's page on amazon.in (we add your tag)" : "Your affiliate link, https://…"}
                />
              </label>
            ))}
          </fieldset>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-[13.5px] font-semibold text-ink-heading">Photo (optional)</span>
            <textarea
              className={`${input} min-h-[70px] font-mono text-[12.5px]`}
              value={form.image}
              onChange={(e) => setForm({ ...form, image: e.target.value })}
              placeholder="On the product's Amazon page, SiteStripe → Image → copy the code and paste it here"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13.5px] font-semibold text-ink-heading">For</span>
            <select className={input} value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option value="all">Everyone</option>
              <option value="men">Men</option>
              <option value="women">Women</option>
            </select>
          </label>
          <fieldset className="sm:col-span-2">
            <legend className="mb-1.5 text-[13.5px] font-semibold text-ink-heading">Hair types (none ticked = all)</legend>
            <div className="flex flex-wrap gap-4">
              {TYPES.map((t) => (
                <label key={t} className="flex items-center gap-2 text-[15px] capitalize">
                  <input
                    type="checkbox"
                    checked={form.hairTypes.includes(t)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        hairTypes: e.target.checked ? [...form.hairTypes, t] : form.hairTypes.filter((x) => x !== t),
                      })
                    }
                  />
                  {t}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block">
            <span className="mb-1.5 block text-[13.5px] font-semibold text-ink-heading">Short note (optional)</span>
            <input className={input} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="e.g. Light hold, no shine" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13.5px] font-semibold text-ink-heading">Order (lower shows first)</span>
            <input className={input} inputMode="numeric" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
          </label>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" className="btn-primary" disabled={busy} onClick={save}>
            {form.id ? "Save changes" : "Add product"}
          </button>
          {form.id && (
            <button type="button" className="btn-secondary" onClick={() => setForm(EMPTY)}>
              Cancel
            </button>
          )}
        </div>
        {message && (
          <p className={`mt-3 text-[14.5px] font-medium ${message.ok ? "text-mint-deep" : "text-danger"}`} role="status">
            {message.text}
          </p>
        )}
      </div>

      <h2 className="mt-12 text-[22px] font-semibold">Your products ({rows.length})</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-[15px] text-ink-muted">None yet. Until you add some, the cards show the care tips only.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.id} className={`rounded-[16px] border border-line bg-surface p-4 ${r.is_active ? "" : "opacity-60"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  {r.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.image_url} alt="" className="h-12 w-12 shrink-0 rounded-full border border-line bg-white object-contain p-1" />
                  )}
                  <div className="min-w-0">
                  <p className="text-[16px] font-semibold text-ink-heading">
                    {r.brand ? `${r.brand} · ` : ""}
                    {r.title}
                  </p>
                  <p className="mt-0.5 text-[13.5px] text-ink-muted">
                    {kindLabel(r.kind)} · {shopsOf(r)} ·{" "}
                    {r.gender === "all" ? "Everyone" : r.gender === "men" ? "Men" : "Women"} ·{" "}
                    {r.hair_types?.length ? r.hair_types.join(", ") : "all hair types"} · order {r.sort_order}
                  </p>
                  <p className="mt-0.5 text-[13.5px] text-ink-muted">
                    {r.clicks30} tap{r.clicks30 === 1 ? "" : "s"} in the last 30 days{r.is_active ? "" : " · switched off"}
                  </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-secondary !px-4 !py-2 !text-[14px]" onClick={() => edit(r)}>
                    Change
                  </button>
                  <button
                    type="button"
                    className="btn-secondary !px-4 !py-2 !text-[14px]"
                    disabled={busy}
                    onClick={() => send("PATCH", { id: r.id, active: !r.is_active })}
                  >
                    {r.is_active ? "Switch off" : "Switch on"}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary !px-4 !py-2 !text-[14px] !text-danger"
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm(`Remove "${r.title}"?`)) send("DELETE", undefined, `?id=${encodeURIComponent(r.id)}`);
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
