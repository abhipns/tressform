// Tressform — EarnKaro integration ("Maintain Your Look" affiliate section).
//
// EarnKaro has no catalog/feed API — it only converts a single product URL
// into a tracked affiliate link at a time (confirmed via research, Part J).
// So in production this isn't called live per-request; it's a content-ops
// tool used once per product when curating db.affiliate_products, and the
// homepage just reads the already-converted links back out of that table.
//
// This module still exists as a clean integration point for that one-off
// conversion step (e.g. an internal admin script), and for symmetry with the
// other integrations it also runs in MOCK MODE when no EarnKaro account is
// configured.

const EARNKARO_ACCOUNT_EMAIL = process.env.EARNKARO_ACCOUNT_EMAIL;

export const EARNKARO_MOCK_MODE = !EARNKARO_ACCOUNT_EMAIL;

export interface ConvertLinkResult {
  originalUrl: string;
  trackedUrl: string;
  mock: boolean;
}

/**
 * Convert a single product URL (Amazon, Myntra, Nykaa, etc.) into an
 * EarnKaro-tracked affiliate link. Intended for content-ops / admin use when
 * populating affiliate_products — not called on every page view.
 */
export async function convertLink(originalUrl: string): Promise<ConvertLinkResult> {
  if (EARNKARO_MOCK_MODE) {
    const separator = originalUrl.includes("?") ? "&" : "?";
    return {
      originalUrl,
      trackedUrl: `${originalUrl}${separator}mock_earnkaro_ref=tressform`,
      mock: true,
    };
  }

  // Real implementation: EarnKaro's conversion is done through their
  // dashboard/API tied to EARNKARO_ACCOUNT_EMAIL. There's no official public
  // REST API documented for bulk conversion — the account holder manually
  // pastes URLs into the EarnKaro dashboard and copies out the tracked link.
  // This function is left as a named integration point in case EarnKaro
  // exposes an API later, or a headless-browser conversion step is added.
  throw new Error(
    "EARNKARO_MOCK_MODE is false, but EarnKaro has no documented programmatic " +
      "conversion API — convert product links manually via the EarnKaro dashboard " +
      "and store the result directly in the affiliate_products table."
  );
}
