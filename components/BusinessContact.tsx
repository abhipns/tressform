// Who runs Tressform and how to reach them — shown on the Contact page and
// at the foot of each legal page. Everything comes from lib/business.ts.
// The address row is left out while no address has been set there.

import { BUSINESS, OPERATOR_LINE, addressLines } from "@/lib/business";

export default function BusinessContact({ heading = "Contact us" }: { heading?: string }) {
  const address = addressLines();
  return (
    <div className="rounded-lg2 border border-line bg-surface p-6">
      <h3 className="mb-2 text-[16px]">{heading}</h3>
      <p className="mb-4 text-[14.5px] leading-[1.6] text-ink-body">{OPERATOR_LINE}</p>
      <dl className="grid gap-x-5 gap-y-2.5 text-[14.5px] leading-[1.5] sm:grid-cols-[88px_1fr]">
        <dt className="text-ink-muted">Email</dt>
        <dd>
          <a href={`mailto:${BUSINESS.supportEmail}`} className="font-semibold text-mint-deep">
            {BUSINESS.supportEmail}
          </a>
        </dd>
        <dt className="text-ink-muted">Phone</dt>
        <dd>
          <a href={`tel:${BUSINESS.phoneHref}`} className="font-semibold text-mint-deep">
            {BUSINESS.phoneDisplay}
          </a>
        </dd>
        {address.length > 0 && (
          <>
            <dt className="text-ink-muted">Address</dt>
            <dd className="text-ink-body">
              {address.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </dd>
          </>
        )}
        {BUSINESS.gstin && (
          <>
            <dt className="text-ink-muted">GSTIN</dt>
            <dd className="text-ink-body">{BUSINESS.gstin}</dd>
          </>
        )}
      </dl>
    </div>
  );
}
