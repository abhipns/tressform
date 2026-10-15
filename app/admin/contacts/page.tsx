"use client";

// /admin/contacts — WhatsApp numbers people gave, with their yes
// (15.10.2026). OWNER ONLY. Nothing is sent from the site yet; this is the
// list to use when WhatsApp sending is switched on (lib/whatsapp.ts).

import { useEffect, useState } from "react";
import OwnerGate from "@/components/admin/OwnerGate";
import { authHeaders } from "@/lib/authClient";

interface Contact {
  phone: string;
  name: string | null;
  email: string | null;
  source: string;
  gender: string | null;
  face_shape: string | null;
  opted_in_at: string;
  opted_out_at: string | null;
}

const WHERE: Record<string, string> = { results: "Results", checkout: "Checkout", blog: "Blog", trivia: "Home page" };
const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function Contacts() {
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/contacts", { headers: await authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setContacts(data.contacts ?? []);
      else setError(data.error ?? "Couldn't load the numbers.");
    })();
  }, []);

  async function download() {
    setDownloading(true);
    try {
      const res = await fetch("/api/admin/contacts?format=csv", { headers: await authHeaders() });
      if (!res.ok) return;
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `tressform-whatsapp-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  if (error) return <p className="text-[15px] text-danger">{error}</p>;
  if (!contacts) return <p className="text-[15px] text-ink-muted">Loading…</p>;
  const active = contacts.filter((c) => !c.opted_out_at).length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold">WhatsApp numbers</h1>
          <p className="mt-1 text-[14.5px] text-ink-muted">
            {active} {active === 1 ? "person has" : "people have"} said yes to WhatsApp updates. Nothing is sent yet.
          </p>
        </div>
        {contacts.length > 0 && (
          <button type="button" className="btn-secondary !px-4 !py-2 !text-[14px]" disabled={downloading} onClick={download}>
            {downloading ? "Preparing…" : "Download as Excel (CSV)"}
          </button>
        )}
      </div>
      {contacts.length === 0 ? (
        <p className="mt-6 text-[15px] text-ink-muted">No numbers yet.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-2.5">
          {contacts.map((c) => (
            <li key={c.phone} className="rounded-[14px] bg-surface px-4 py-3 shadow-card">
              <p className="text-[15.5px] font-semibold text-ink-heading">
                {c.phone}
                {c.opted_out_at && <span className="ml-2 text-[13px] font-normal text-danger">stopped</span>}
              </p>
              <p className="mt-0.5 text-[13.5px] text-ink-muted">
                {[c.name, c.email].filter(Boolean).join(" · ") || "Not signed in"} · {WHERE[c.source] ?? c.source}
                {c.face_shape && ` · ${c.face_shape} face`}
                {c.gender && ` · ${c.gender}`} · {when(c.opted_in_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdminContactsPage() {
  return (
    <OwnerGate title="WhatsApp numbers" path="/admin/contacts">
      <Contacts />
    </OwnerGate>
  );
}
