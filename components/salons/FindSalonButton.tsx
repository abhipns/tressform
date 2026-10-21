"use client";

// "Find a salon" — shown only once at least one partner salon has been
// approved (lib/useSalonsAvailable.ts), so customers never land on an empty
// list (21.10.2026).

import Link from "next/link";
import { useSalonsAvailable } from "@/lib/useSalonsAvailable";

export default function FindSalonButton({ className = "" }: { className?: string }) {
  const any = useSalonsAvailable();
  if (!any) return null;
  return (
    <Link href="/salons" className={`btn-primary !px-6 !py-3 !text-[15.5px] ${className}`}>
      Find a salon
    </Link>
  );
}
