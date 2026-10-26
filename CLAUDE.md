# Tressform — standing rules for every session

Next.js 14 + Supabase + PayU + fal.ai, live at www.tressform.co.in.

## Talking to the owner
- The owner is not technical. Use plain English, no jargon.
- End every task with a plain-English summary:
  1. What changed.
  2. What to check on the preview.
  3. Any step the owner must do, with exact links and button names.

## Money
- Money is always whole paise (integers), never rupees with decimals.
- All prices, costs and profit-and-loss maths live in `lib/pricing.ts` only.
- No free previews, ever: `FREE_PREVIEWS_ON` stays `false`.
- Tressform is not GST-registered: `GST_REGISTERED` stays `false`.

## Database changes
- Add a file `supabase/migrations/YYYYMMDD_name.sql` AND update `supabase/schema.sql`.
- New private tables: RLS on, `revoke all ... from anon, authenticated`,
  `grant all ... to service_role`, and read/write them only through server routes.
- Never assume the SQL has been run. At the end, give the owner the exact SQL
  and say it must be run in Supabase (SQL Editor) before merging.

## Before finishing
- Run `npx tsc --noEmit -p .` and `npx vitest run`. Both must pass.
- Add tests for any new pricing or credit rules.

## Privacy
- Never show or link the owner's personal name, phone number or social
  accounts anywhere on the site.

## Code comments
- Comments are dated (DD.MM.YYYY) and explain the owner's reason for the change.
