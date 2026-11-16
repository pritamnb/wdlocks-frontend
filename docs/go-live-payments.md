# Going live with card payments (stage 3)

Prepared 16 Nov 2026 on branch `live-payments`. Nothing in this document has been switched on: production still runs
the demo checkout and staging the Stripe test-mode sandbox. Every step below that touches a dashboard, a key or the
server is for Pritam to do.

## Where things stand

| Stage | What | Status |
|---|---|---|
| 1 sandbox | Stripe test keys on staging; real test-mode payments, pretend orders | ✅ 12 Nov, still how staging runs |
| 2 orders | + WooCommerce REST key; test-card orders appear in WooCommerce, the webhook marks them paid | ✅ 12 Nov (test orders cancelled; key removed from staging again) |
| **3 live** | live Stripe keys + a production WooCommerce key on our own Node server at wdlocks.co.uk | **ready to run (this document)** |

The checkout code that takes the money is the code tested at stage 2. Stage 3 changes the keys and where the site runs,
and this branch adds what only matters once real shoppers use it:

- **Own-server setup.** `scripts/stripe-setup.mjs --target server` reads the live keys from `.env.live` (never
  `.env.local`, which every local server reads), checks them, registers the live webhook and the wallet domain
  (Apple Pay, Google Pay, Link), and writes `.env.server` for the server. `--verify` checks the deployed site afterwards.
- **Abandoned checkouts.** Each "Place order" creates a pending WooCommerce order before payment. WooCommerce only
  auto-cancels orders made by its own checkout, so ours would sit as "Pending payment" forever. They are now cancelled
  after `ABANDONED_ORDER_MINUTES` (default 120), with a note. Only orders this site created are touched (`_headless_site`
  meta), so the old checkout's unpaid orders on the shop (#5052–#5677) are never touched. A payment that still
  arrives later re-opens the order automatically. Runs in the background of a checkout, at most every 15 minutes, so the
  server needs no cron job.
- **Refunds.** A refund made in the Stripe Dashboard is now booked on the WooCommerce order (WooCommerce refund record,
  `api_refund: false`, so WooCommerce moves no money). A full refund turns the order "Refunded" and WooCommerce sends
  the customer its refund email. Partial and repeated refunds book only the difference. Stock is not put back
  automatically. `MIRROR_STRIPE_REFUNDS=off` goes back to a note only.
- **Declined card, second try.** The same order and PaymentIntent are reused (the order goes back from "Failed" to
  "Pending payment"), instead of a second order being left behind.
- **Mixed keys.** A live publishable key with a test secret key (or the reverse) makes the checkout refuse to start a
  payment (503, logged) instead of failing in the shopper's browser.

## Before go-live (prerequisites)

| # | Item | Who | Notes |
|---|---|---|---|
| 1 | Stripe account fully activated in live mode, payouts bank account, statement descriptor | client / Pritam | `--check` prints "charges enabled" when Stripe is happy |
| 2 | PayPal activated in the Stripe Dashboard (live), if PayPal should show | Pritam | Settings → Payment methods → PayPal (test mode needed no activation) |
| 3 | Radar rules added | client / Pritam | `docs/stripe-radar-rules.md` |
| 4 | Server running the site: Node 24, Caddy, systemd | Pritam | `deploy/` and README "Running on a plain server" (PR #15) |
| 5 | WordPress moved to its own address, e.g. `shop.wdlocks.co.uk`, so the new site can take `wdlocks.co.uk` | Tomia (WP Engine hosts it) | The one step that needs the WordPress host. Keep the MX (email) records as they are when DNS changes |
| 6 | A production WooCommerce REST key | Pritam, in wp-admin | WooCommerce → Settings → Advanced → REST API → Add key, description "Headless checkout (production)", Read/Write. Separate from the staging key so either can be revoked alone |
| 7 | WooCommerce e-mails checked | client | "New order" goes to the shop, "Processing order" and "Refunded order" go to the customer, as today |

## Steps

1. **Fill `.env.live`** (copy `.env.live.example`): live publishable and secret keys from the Stripe Dashboard with
   test mode off (Developers → API keys, Copy buttons, never through chat), the production WooCommerce key, and
   `NEXT_PUBLIC_SITE_URL=https://wdlocks.co.uk`, `NEXT_PUBLIC_WC_BASE=https://shop.wdlocks.co.uk` (WordPress's new
   address). The file is gitignored.
2. **Check:** `node scripts/stripe-setup.mjs --target server --check`. Changes nothing. Expect "Stripe live mode",
   "charges enabled", "WooCommerce REST key accepted".
3. **Set up:** `node scripts/stripe-setup.mjs --target server`. Creates the live webhook endpoint
   `https://wdlocks.co.uk/api/stripe/webhook` (its signing secret is written back to `.env.live`), registers
   `wdlocks.co.uk` for Apple Pay / Google Pay / Link, and writes `.env.server` (mode 600). Lines already in
   `.env.server` (rate limits, Turnstile, Redis) are kept.
4. **Copy to the server:** `scp .env.server <server>:/srv/wdlocks-frontend/.env.production` (merge with what is already
   there if the server has other settings), then delete `.env.server` locally.
5. **Build and restart on the server:** `cd /srv/wdlocks-frontend && git pull && npm ci && npm run build && sudo
   systemctl restart wdlocks-frontend`. The build must run after the file is in place: `NEXT_PUBLIC_*` values are
   baked in at build time.
6. **Verify:** `node scripts/stripe-setup.mjs --target server --verify`. Read-only checks: the webhook route answers
   400 `missing_signature` (keys loaded; 503 means the server did not read them), the Stripe webhook is enabled with all
   four events, the wallet domain is active, and the keys are live.
7. **First real purchase.** Buy the cheapest item with your own card on `https://wdlocks.co.uk`. Check:
   - the order appears in WooCommerce as Processing, with the note "Stripe payment succeeded: pi_…";
   - the shop's "New order" and the customer's "Processing order" e-mails arrive;
   - the payment shows in the Stripe Dashboard (live) → Payments.

   Then refund it in Stripe. The order should turn Refunded with a note, and the customer refund e-mail should
   arrive. Put the stock back by hand. On a phone, check that the Apple Pay or Google Pay button shows.
8. **First days:** Stripe Dashboard → Developers → Webhooks → the endpoint shows every delivery. Failures are retried
   by Stripe for 3 days and e-mailed to the account owner. Server log: `journalctl -u wdlocks-frontend | grep -E
   "checkout|stripe|orders"`.

## Rollback

Comment out `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and `STRIPE_SECRET_KEY` in `/srv/wdlocks-frontend/.env.production`,
rebuild and restart. The checkout then falls back to handing the basket to WooCommerce's own checkout. Note that this
fallback carries one product line per order (the known hand-off limit, docs/stripe-checkout-plan.md). Do not use
`NEXT_PUBLIC_CHECKOUT_MODE=demo` on the live domain: it shows a pretend payment to real shoppers. Disable the webhook
endpoint in the Stripe Dashboard while the keys are off.

## Settings (no code changes)

| Variable | Default | Effect |
|---|---|---|
| `ABANDONED_ORDER_MINUTES` | 120 | Cancel our unpaid orders after this many minutes (30–10080); `off` keeps them |
| `MIRROR_STRIPE_REFUNDS` | on | Book Stripe refunds on the WooCommerce order; `off` = note only |

## What the shop team sees in WooCommerce

The same admin as today: products, prices, stock, delivery prices and coupons are managed there, and new-site orders
arrive in the same Orders list. The differences:
- orders are guest orders;
- the payment method reads "Card / wallet (Stripe)";
- refunds are made in Stripe and then show on the order by themselves;
- unpaid orders disappear after two hours instead of piling up.

## Tested on this branch (16 Nov 2026)

No real WooCommerce order was created, changed or e-mailed:
- **Logic:** 16/16 checks, including that a real customer's unpaid order is never selected for cancelling, plus the
  refund arithmetic.
- **Route handlers:** 13/13, run in Node against a simulated WooCommerce order API, with real Stripe test-mode payments
  and refunds, and live read-only prices and delivery rates from the Store API. Covered:
  - abandoned order cancelled, another site's order left alone, an order paid in the meantime left alone;
  - £10.00 partial refund, then the remaining £31.39, booked; replays book nothing;
  - declined-then-retry reuses order and intent, and no second order is created;
  - mixed keys → 503 before any call.
- **Read-only against the real shop:** the sweep's query is accepted; its 7-day window currently holds no pending
  orders; real orders carry `date_created_gmt`; real refunds have the shape the code reads (`"-70.39"`).
- **Setup script:** `--target server --check` (test keys, changes nothing); the guards for a vercel.app address and a
  missing `.env.live`; `--verify` against staging passes all checks.
- Production build passes; typecheck and lint clean.

**Not yet run:** a stage-2 rehearsal of the new pieces against the real shop (test card → real WooCommerce order →
refund in Stripe → order Refunded). It creates real orders that e-mail the client, so it waits for Pritam's go. It
would run on staging with the staging WooCommerce key added back for the duration, and the orders would be cancelled
afterwards (docs/stripe-checkout-plan.md §5).
