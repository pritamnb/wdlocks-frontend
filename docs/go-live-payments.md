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
  "Pending payment"), instead of a second order being left behind. Because Stripe's "payment failed" event for the first
  attempt can arrive after the retry has succeeded, the webhook only marks an order Failed while the payment still
  needs a new card, and the confirmation page asks Stripe directly when WooCommerce has not caught up yet (found in the
  rehearsal, see below).
- **Mixed keys.** A live publishable key with a test secret key (or the reverse) makes the checkout refuse to start a
  payment (503, logged) instead of failing in the shopper's browser.

## Before go-live (prerequisites)

| # | Item | Who | Notes |
|---|---|---|---|
| 1 | Stripe account fully activated in live mode, payouts bank account, statement descriptor | client / Pritam | `--check` prints "charges enabled" when Stripe is happy |
| 2 | PayPal activated in the Stripe Dashboard (live), if PayPal should show | Pritam | Settings → Payment methods → PayPal (test mode needed no activation) |
| 3 | Radar rules added | client / Pritam | `docs/stripe-radar-rules.md` |
| 4 | Server running the site: Node 24, Caddy, systemd | Pritam | `deploy/` and README "Running on a plain server" (PR #15) |
| 5 | WordPress keeps `https://wdlocks.co.uk` but moves onto the same VPS (`fasthosts-runbook.md`, phases 4 and 6); `@`/`www` are pointed at the VPS in the Fasthosts DNS panel | Pritam | No step needs Tomia. Keep the MX (email) records as they are when DNS changes |
| 6 | A production WooCommerce REST key | Pritam, in wp-admin | WooCommerce → Settings → Advanced → REST API → Add key, description "Headless checkout (production)", Read/Write. Separate from the staging key so either can be revoked alone |
| 7 | WooCommerce e-mails checked | client | "New order" goes to the shop, "Processing order" and "Refunded order" go to the customer, as today |

## Steps

1. **Fill `.env.live`** (copy `.env.live.example`): live publishable and secret keys from the Stripe Dashboard with
   test mode off (Developers → API keys, Copy buttons, never through chat), the production WooCommerce key, and
   `NEXT_PUBLIC_SITE_URL=https://wdlocks.co.uk`, `NEXT_PUBLIC_WC_BASE=https://wdlocks.co.uk` (WordPress keeps its
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
- unpaid orders are cancelled after two hours instead of piling up.

E-mails (seen in the rehearsal): "New order" for each paid order; WooCommerce's "Failed order" when a card is declined;
"Cancelled order" when the clean-up cancels an abandoned checkout. WooCommerce's own checkout sends the same three
e-mails. Any of them can be switched off under WooCommerce → Settings → Emails.

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

## Rehearsal against the real shop (17 Nov 2026, Pritam's go)

How it was run:
- Staging ran this branch with the staging WooCommerce key and `ABANDONED_ORDER_MINUTES=30`, so Stripe was in test
  mode with real WooCommerce orders.
- Product: Bruno (£19.99 + £6.40 delivery = £26.39; stock not tracked, so no stock moved).
- Afterwards all seven test orders (#6240, #6241, #6243–#6246, #6249) were cancelled with a note. The key and the
  setting were removed from staging, staging was redeployed from its own branch, and it makes pretend orders again
  (checked: order #939466, no new WooCommerce order).

| Run | What happened | Result |
|---|---|---|
| R1 #6240 | Paid with 4242 → refunded in Stripe | Processing with "Stripe payment succeeded" note, "New order" e-mail sent; after the refund **Refunded**, refund record −£26.39, note "booked on this order automatically", WooCommerce's customer refund e-mail fired |
| R2 #6241 | 3-D Secure challenge left open | Stripe failed the attempt when the challenge expired; the webhook marked it **Failed** (so the sweep correctly left it) |
| R3 #6243 | Declined (0002), then paid (4242) | Same order and PaymentIntent reused, order paid, **but the confirmation page said "Payment didn't go through"**: the late "failed" event had marked the reused order Failed and the page trusted it. **Fixed** in 0399190 (see above); without the fix a shopper charged once could have paid again |
| R4b #6246 | Same as R3, after the fix | Both attempts on #6246 / one PaymentIntent, **"Thank you, your order is confirmed"**, basket emptied, order Processing |
| R5 #6244 | Order created, payment never attempted (browser blocked Stripe's confirm call) | Pending payment for 30 minutes, then **Cancelled** by the sweep with its note, triggered by R6's checkout (works on Vercel through `after()`) |
| R6 #6249 | Paid with 4242 | Confirmed; ran the sweep; refunded in Stripe → Refunded |
| — | Refunds of #6243, #6246, #6249 in Stripe | Each turned Refunded with its refund record |

Two things to tell the client before launch: test purchases send the shop real "New order" e-mails (the rehearsal sent
four), and cancelling an abandoned checkout sends "Cancelled order" (the same as WooCommerce's own unpaid-order
clean-up today).
