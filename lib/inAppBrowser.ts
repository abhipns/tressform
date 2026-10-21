// Tressform — the browsers inside the Instagram and Facebook apps
// (21.10.2026, before the first Meta ads).
//
// Most people who tap an Instagram or Facebook ad open the site INSIDE that
// app. Google refuses to sign anyone in from there ("Error 403:
// disallowed_useragent"), so Google sign-in has to happen in a real browser.
// On Android the page can open itself in Chrome; on iPhone the app's own
// menu (•••) has "Open in browser".
// Client-only.

export type InApp = { app: "Instagram" | "Facebook" | "Messenger"; os: "android" | "ios" | "other" } | null;

/** Which Meta in-app browser this is, from its user agent; null in a normal browser. */
export function detectInApp(ua: string): InApp {
  const app = /Instagram/i.test(ua) ? "Instagram" : /Messenger|MESSENGER/.test(ua) ? "Messenger" : /FBAN|FBAV|FB_IAB|FBIOS|FB4A/i.test(ua) ? "Facebook" : null;
  if (!app) return null;
  const os = /Android/i.test(ua) ? "android" : /iPhone|iPad|iPod/i.test(ua) ? "ios" : "other";
  return { app, os };
}

/** An Android link that opens this same page in Chrome (or the default browser if Chrome isn't there). */
export function chromeIntentUrl(href: string): string {
  const u = new URL(href);
  return `intent://${u.host}${u.pathname}${u.search}${u.hash}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(href)};end`;
}
