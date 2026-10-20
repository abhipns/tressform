// One barber point with its label in bold: "**Sides:** low taper, #2 to #0.5"
// (20.10.2026, lib/content/barberPoints.ts).

import { splitPoint } from "@/lib/content/barberPoints";

export default function BarberPointText({ point }: { point: string }) {
  const { label, text } = splitPoint(point);
  if (!label) return <span>{text}</span>;
  return (
    <span>
      <strong className="font-semibold text-ink-heading">{label}:</strong> {text}
    </span>
  );
}
