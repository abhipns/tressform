"use client";

// Shown on the sign-in page when it's open inside the Instagram or Facebook
// app (21.10.2026; see lib/inAppBrowser.ts). Google sign-in doesn't work
// there, so: on Android, one tap (and one automatic try) opens the page in
// Chrome; on iPhone, simple steps to open it in Safari, plus "Copy link".

import { useEffect, useState } from "react";
import { chromeIntentUrl, detectInApp, type InApp } from "@/lib/inAppBrowser";

export function useInApp(): InApp {
  const [inApp, setInApp] = useState<InApp>(null);
  useEffect(() => setInApp(detectInApp(navigator.userAgent)), []);
  return inApp;
}

export default function InAppBrowserNotice({ inApp }: { inApp: NonNullable<InApp> }) {
  const [copied, setCopied] = useState(false);

  // Android: try opening Chrome straight away, once per visit.
  useEffect(() => {
    if (inApp.os !== "android") return;
    try {
      if (window.sessionStorage.getItem("tf_inapp_tried")) return;
      window.sessionStorage.setItem("tf_inapp_tried", "1");
    } catch {
      return;
    }
    window.location.href = chromeIntentUrl(window.location.href);
  }, [inApp.os]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      /* copying not allowed here */
    }
  }

  return (
    <div className="mb-6 rounded-lg2 border-[1.5px] border-lilac bg-lilac/10 p-5" role="alert">
      <p className="text-[17px] font-semibold text-ink-heading">Please open Tressform in your browser</p>
      <p className="mt-1.5 text-[14.5px] leading-[1.55] text-ink-body">
        You&apos;re inside the {inApp.app} app. Google doesn&apos;t allow signing in here, so continue in{" "}
        {inApp.os === "ios" ? "Safari" : "Chrome"}. It takes two taps.
      </p>
      {inApp.os === "android" ? (
        <a href={typeof window !== "undefined" ? chromeIntentUrl(window.location.href) : "#"} className="btn-primary mt-4 w-full !py-3">
          Open in Chrome
        </a>
      ) : (
        <ol className="mt-3 flex flex-col gap-2 text-[14.5px] text-ink-heading">
          <li>
            1. Tap <strong>•••</strong> at the {inApp.app === "Instagram" ? "top right" : "bottom right"} of the screen
          </li>
          <li>
            2. Choose <strong>{inApp.app === "Instagram" ? "Open in external browser" : "Open in browser"}</strong>
          </li>
        </ol>
      )}
      <button type="button" onClick={copy} className="mt-3 w-full text-center text-[13.5px] font-semibold text-mint-deep underline underline-offset-4">
        {copied ? "Link copied. Paste it in your browser." : "Or copy the link"}
      </button>
    </div>
  );
}
