"use client";

// Loads the Meta Pixel and counts a PageView on every page (21.10.2026;
// see lib/metaPixel.ts). Not loaded on the owner's admin pages, and not at
// all until NEXT_PUBLIC_META_PIXEL_ID is set.

import Script from "next/script";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { META_PIXEL_ID, trackMeta } from "@/lib/metaPixel";

export default function MetaPixel() {
  const pathname = usePathname();
  const first = useRef(true);
  useEffect(() => {
    if (!META_PIXEL_ID || pathname?.startsWith("/admin")) return;
    // The first PageView is sent by the loader below; later page changes here.
    if (first.current) {
      first.current = false;
      return;
    }
    trackMeta("PageView");
  }, [pathname]);

  if (!META_PIXEL_ID || pathname?.startsWith("/admin")) return null;
  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID.replace(/[^0-9]/g, "")}');fbq('track','PageView');`}
    </Script>
  );
}
