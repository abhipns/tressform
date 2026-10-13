"use client";

// /admin/reviews — every customer review, newest first (13.10.2026). OWNER
// ONLY. Approve a review to show its comment on the home page. Every review
// counts in the average (low ones too), so "Hide" is for spam or abuse only.

import { useEffect, useState } from "react";
import OwnerGate from "@/components/admin/OwnerGate";
import { authHeaders } from "@/lib/authClient";
import { REVIEW_SECTIONS, type ReviewSection, type ReviewStatus } from "@/lib/reviews";

interface Row {
  id: string;
  section: ReviewSection;
  rating: number;
  comment: string | null;
  display_name: string | null;
  status: ReviewStatus;
  created_at: string;
  email: string | null;
}

const STATUS_LABEL: Record<ReviewStatus, string> = { pending: "Waiting", approved: "On the site", hidden: "Hidden" };
const STATUS_STYLE: Record<ReviewStatus, string> = {
  pending: "bg-lilac/20 text-header-dark",
  approved: "bg-mint-pale text-mint-deep",
  hidden: "bg-bg-soft text-ink-muted",
};

function Reviews() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState<"all" | ReviewStatus>("pending");

  async function load() {
    const res = await fetch("/api/admin/reviews", { headers: await authHeaders() });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setRows(data.reviews ?? []);
    else setError(data.error ?? "Couldn't load the reviews.");
  }

  useEffect(() => {
    load();
  }, []);

  async function setStatus(id: string, status: ReviewStatus) {
    setError(null);
    const res = await fetch("/api/admin/reviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) setError("That didn't save. Please try again.");
    await load();
  }

  const list = (rows ?? []).filter((r) => show === "all" || r.status === show);
  const waiting = (rows ?? []).filter((r) => r.status === "pending").length;

  return (
    <>
      <h1 className="h-display">Reviews</h1>
      <p className="lead mt-3 max-w-[66ch]">
        Approve a review to show it on the home page. Every review counts in the average shown there, the low ones too,
        so only hide spam or abuse. A customer who changes their review goes back to &quot;Waiting&quot;.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {(["pending", "approved", "hidden", "all"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setShow(id)}
            className={`rounded-full border-[1.5px] px-4 py-2 text-[14.5px] font-semibold transition ${
              show === id ? "border-mint bg-mint text-white" : "border-line bg-surface text-ink-heading hover:border-ink-heading"
            }`}
          >
            {id === "all" ? "All" : STATUS_LABEL[id]}
            {id === "pending" && waiting > 0 ? ` (${waiting})` : ""}
          </button>
        ))}
      </div>

      {error && <p className="mt-5 rounded-sm2 bg-danger/10 px-4 py-3 text-[14.5px] font-medium text-danger">{error}</p>}
      {rows === null && !error && <p className="mt-8 text-ink-muted">Loading…</p>}
      {rows !== null && list.length === 0 && <p className="mt-8 text-[15.5px] text-ink-muted">Nothing here.</p>}

      <ul className="mt-6 flex max-w-[820px] flex-col gap-3">
        {list.map((r) => (
          <li key={r.id} className="rounded-[16px] bg-surface p-4 shadow-card sm:p-5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-[18px] tracking-[2px] text-lilac" aria-label={`${r.rating} out of 5 stars`}>
                {"★".repeat(r.rating)}
                <span className="text-line">{"★".repeat(5 - r.rating)}</span>
              </span>
              <span className="text-[13.5px] font-semibold text-ink-muted">{REVIEW_SECTIONS[r.section].label}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold ${STATUS_STYLE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
            </div>
            {r.comment ? (
              <p className="mt-2 whitespace-pre-line text-[15.5px] leading-[1.55]">{r.comment}</p>
            ) : (
              <p className="mt-2 text-[14.5px] italic text-ink-muted">Stars only, no comment.</p>
            )}
            <p className="mt-2 text-[13px] text-ink-muted">
              Shown as {r.display_name || "A Tressform customer"}
              {r.email ? ` · ${r.email}` : ""} · {new Date(r.created_at).toLocaleDateString("en-IN")}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {r.status !== "approved" && (
                <button type="button" className="btn-primary !px-4 !py-2 !text-[14px]" onClick={() => setStatus(r.id, "approved")}>
                  Show on the site
                </button>
              )}
              {r.status !== "hidden" && (
                <button type="button" className="btn-secondary !px-4 !py-2 !text-[14px]" onClick={() => setStatus(r.id, "hidden")}>
                  Hide (spam or abuse)
                </button>
              )}
              {r.status === "hidden" && (
                <button type="button" className="btn-secondary !px-4 !py-2 !text-[14px]" onClick={() => setStatus(r.id, "pending")}>
                  Un-hide
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function AdminReviewsPage() {
  return (
    <OwnerGate title="Reviews" path="/admin/reviews">
      <Reviews />
    </OwnerGate>
  );
}
