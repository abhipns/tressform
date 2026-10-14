// Tressform credit at checkout (14.10.2026, owner's request).
//
// Customers earn credit from referrals (lib/referral.ts). At checkout a
// ticked-by-default box, "Use my ₹X credit", puts it toward a pack or photos:
//
//   price ₹399, credit ₹80   → pay ₹319 through PayU
//   price ₹199, credit ₹300  → free: no PayU step, order paid by credit, ₹101 left
//
// Rules (enforced on the server in /api/payment/create-order — the browser
// only shows the same sum):
//   - Credit used = the smaller of the balance and the price.
//   - The order's price_paise is what is actually charged; credit_used_paise
//     is stored next to it, so revenue figures are money really received.
//   - Credit leaves the balance only when the order is paid: straight away
//     for a free order, or when PayU confirms the payment (lib/payments.ts).
//     A cancelled or failed payment costs no credit.
//   - Taking credit is one database step (spend_credit) that refuses if the
//     balance is too low, so two open checkouts can't spend it twice.

export interface CreditSplit {
  /** Full price before credit. */
  pricePaise: number;
  /** Credit put toward it. */
  creditPaise: number;
  /** What the customer pays (0 = free with credit). */
  duePaise: number;
}

export function splitWithCredit(pricePaise: number, balancePaise: number, useCredit: boolean): CreditSplit {
  const price = Math.max(0, Math.round(pricePaise));
  const credit = useCredit ? Math.min(price, Math.max(0, Math.floor(balancePaise))) : 0;
  return { pricePaise: price, creditPaise: credit, duePaise: price - credit };
}

/** Transaction ids of orders paid entirely with credit (no PayU payment behind them). */
export const CREDIT_ONLY_TXN_PREFIX = "credit_";
