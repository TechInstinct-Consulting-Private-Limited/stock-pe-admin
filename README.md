# MarketPe Admin Console

Internal frontend for administering StockPe's demo contest lifecycle and review-only payout queue.

## What it does

- Administrator sign-in using the StockPe backend OTP flow
- Create and progress demo contests through valid statuses
- Settle contests and review simulated payouts; no real USDT is transferred
- View user directory data through the protected Admin API
- Keep preview-only Payments, Risk, Wallet and KYC sections isolated from live actions

## Local development

1. Run the StockPe backend and ensure its Admin API is reachable.
2. Run `npm install` once in this folder.
3. Run `npm run dev`.
4. Sign in using a user granted the `SUPER_ADMIN` or permitted admin role.

The default API is the configured HTTPS staging endpoint. It can be changed on the sign-in screen for local testing.

## Structure

- `app/` — application entry, shell and active workspace coordination
- `features/auth/` — administrator sign-in UI
- `features/users/` — read-only user directory UI
- `components/ui/` — shared UI primitives actually used by this console
- `types/` — shared Admin API types
- `lib/` — shared UI utilities

## Safety

This is a demo/review console. Do not treat a completed test payout as a blockchain transfer. Real money, KYC provider production credentials and wallet-provider payout actions require separate approved integrations.
