// Tressform — server-side "who is calling?" check for app/api/* routes.
//
// 09.10.2026: added with the real sign-in work. Before this, every route
// took a `userId` straight from the request body, which is fine for the
// in-memory demo but means anyone could act as any customer once a real
// database is connected. From here on:
//
//   - MOCK MODE (no Supabase env vars): unchanged — the browser's demo id
//     from the request body is used, so the demo keeps working with zero
//     setup.
//   - REAL MODE: the browser sends the customer's Supabase access token in
//     the `Authorization: Bearer …` header (see lib/authClient.ts), this
//     module asks Supabase who that token belongs to, and the route uses
//     THAT id. Any `userId` in the request body is ignored.
//
// Server-only: never import this from a client component.

import type { NextRequest } from "next/server";

export const SUPABASE_MOCK_MODE =
  !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export type AuthResult =
  | { ok: true; userId: string; email: string | null; name?: string | null }
  | { ok: false; status: number; error: string };

/**
 * Resolve the calling customer.
 * @param req          the incoming request (for the Authorization header)
 * @param mockUserId   the demo id from the request body — used ONLY in mock mode
 */
export async function requireUser(req: NextRequest, mockUserId?: string | null): Promise<AuthResult> {
  if (SUPABASE_MOCK_MODE) {
    if (!mockUserId) return { ok: false, status: 400, error: "userId is required." };
    return { ok: true, userId: mockUserId, email: null };
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // Setup problem, not the customer's fault — say so plainly in the logs
    // and keep the customer-facing message generic.
    console.error("[Tressform] SUPABASE_SERVICE_ROLE_KEY is not set — add it in Vercel → Settings → Environment Variables.");
    return { ok: false, status: 500, error: "The site isn't fully set up yet. Please try again shortly." };
  }

  const header = req.headers.get("authorization") || "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) return { ok: false, status: 401, error: "Please log in to continue." };

  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) {
    return { ok: false, status: 401, error: "Your session has expired — please log in again." };
  }

  const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>;
  const name = typeof meta.full_name === "string" ? meta.full_name : typeof meta.name === "string" ? meta.name : null;
  return { ok: true, userId: data.user.id, email: data.user.email ?? null, name };
}

/**
 * The same check, plus: the caller must be the site owner (profiles.role =
 * 'ADMIN'). Added 10.10.2026 for the owner's Studio page. A customer can't
 * give themselves this role — the database only lets the server change it.
 * In mock mode (no database) everyone passes, as with every other check.
 */
export async function requireAdmin(req: NextRequest, mockUserId?: string | null): Promise<AuthResult> {
  const auth = await requireUser(req, mockUserId);
  if (!auth.ok || SUPABASE_MOCK_MODE) return auth;

  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const { data, error } = await getSupabaseAdmin().from("profiles").select("role").eq("id", auth.userId).maybeSingle();
  if (error || data?.role !== "ADMIN") {
    return { ok: false, status: 403, error: "This page is for the site owner only." };
  }
  return auth;
}
