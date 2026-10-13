// Customer reviews (13.10.2026, owner's request).
//
// Two sections, one review per customer in each:
//   list        "Face shape and matched hairstyles" — the free part; asked
//               under the customer's hairstyle list.
//   hairstyles  "AI hairstyles on my photo" — the paid part; asked once the
//               four views of a paid hairstyle are ready.
// Every review counts in the average shown (low ones too). Comments are
// shown on the home page only after the owner approves them on
// /admin/reviews; "hidden" is for spam or abuse only.

export type ReviewSection = "list" | "hairstyles";
export type ReviewStatus = "pending" | "approved" | "hidden";

export const REVIEW_SECTIONS: Record<ReviewSection, { label: string; question: string }> = {
  list: {
    label: "Face shape and matched hairstyles",
    question: "How useful was your hairstyle list?",
  },
  hairstyles: {
    label: "AI hairstyles on my photo",
    question: "How did you like the hairstyles?",
  },
};

export const REVIEW_SECTION_IDS = Object.keys(REVIEW_SECTIONS) as ReviewSection[];

export const COMMENT_MAX = 600;
export const NAME_MAX = 40;

export interface ReviewInput {
  section: ReviewSection;
  rating: number;
  comment: string | null;
  displayName: string | null;
}

/** Check what the customer sent. Returns the tidied review, or an error to show. */
export function readReview(body: unknown): { ok: true; review: ReviewInput } | { ok: false; error: string } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const section = b.section;
  if (section !== "list" && section !== "hairstyles") return { ok: false, error: "Which part are you rating?" };
  const rating = Number(b.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { ok: false, error: "Choose from 1 to 5 stars." };
  const comment = typeof b.comment === "string" ? b.comment.trim().slice(0, COMMENT_MAX) : "";
  const name = typeof b.displayName === "string" ? b.displayName.trim().replace(/\s+/g, " ").slice(0, NAME_MAX) : "";
  return { ok: true, review: { section, rating, comment: comment || null, displayName: name || null } };
}

/** The name shown with a review: what the customer typed, else their first name, else a plain label. */
export function shownName(typed: string | null, fullName: string | null | undefined): string {
  if (typed) return typed;
  const first = (fullName ?? "").trim().split(/\s+/)[0];
  return first ? first.slice(0, NAME_MAX) : "A Tressform customer";
}

export interface PublicReview {
  id: string;
  section: ReviewSection;
  rating: number;
  comment: string | null;
  name: string;
  date: string;
}

export interface ReviewSummary {
  avg: number | null;
  count: number;
}

/** The average of the ratings given, to one decimal place. */
export function averageOf(ratings: number[]): ReviewSummary {
  if (ratings.length === 0) return { avg: null, count: 0 };
  const avg = ratings.reduce((s, r) => s + r, 0) / ratings.length;
  return { avg: Math.round(avg * 10) / 10, count: ratings.length };
}

// ------------------------------------------------------------ demo (no database)
export interface MockReview extends ReviewInput {
  id: string;
  userId: string;
  status: ReviewStatus;
  createdAt: string;
}

const g = globalThis as unknown as { __tressformReviews?: MockReview[] };
export const mockReviews: MockReview[] = (g.__tressformReviews ??= []);
