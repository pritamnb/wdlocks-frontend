# Stripe Radar rules against card testing

Recommendations only. Nothing in this repo changes the Stripe account: the client (or whoever holds the Stripe
Dashboard login) adds these by hand, in **test mode first**, then in live mode at launch. Written 16 Nov 2026 (Pass 56);
attribute names checked against Stripe's
[supported attributes](https://docs.stripe.com/radar/rules/supported-attributes) and
[rules reference](https://docs.stripe.com/radar/rules/reference) on that date.

## Why this shop needs them

Card testers look for a checkout that creates a PaymentIntent for any visitor and tells them quickly whether a card
was accepted. Ours does that by design, and each attempt also creates a pending WooCommerce order. The site now has
three layers in front of Stripe:

1. **Rate limits** per IP on `/api/checkout/intent` (10 a minute, 30 an hour; `src/lib/rate-limit.ts`).
2. **Cloudflare Turnstile** on Place order once its keys are set (`src/lib/turnstile.ts`).
3. **Radar**, below. Radar is the only layer that sees the card itself, so it catches testers who rotate IPs
   (residential proxies) and solve or farm bot checks.

A single PaymentIntent can be confirmed again and again with different cards from the browser, which our rate
limit cannot see (the confirm call goes straight from Stripe.js to Stripe). Radar's per-IP and per-email counters
cover that gap.

## Plan

Radar's machine-learning blocking and its built-in rules come with every Stripe account. **Custom rules (everything
below) need Radar for Fraud Teams**, a paid add-on per screened transaction. Check the current price in the Dashboard
(Radar → Rules). If the client does not want it, keep the built-in rules on (block "highest" risk, request 3DS when
required) and rely on layers 1 and 2.

What Radar can see from this checkout: Stripe.js runs on our checkout page, so Radar gets the visitor's IP and device
signals; `StripePayment.tsx` sends the billing name, email, phone and address with the payment method, so the email
counters work. Counters exclude the payment being checked: `:total_charges_per_ip_address_hourly: > 4` means "this is at
least the 6th attempt from this IP in the hour".

## Recommended rules

Start every rule as a **Review** rule (or use Radar's "Test rule" preview on past payments), watch for a week, then
promote to **Block**. Real customers of a lock shop buy once or twice; a household rarely tries more than two cards.

### Card testing (block)

| Rule | Catches |
|---|---|
| `Block if :card_count_for_ip_address_hourly: > 3` | one IP trying many different cards |
| `Block if :declined_charges_per_ip_address_hourly: > 3` | one IP collecting declines |
| `Block if :card_count_for_email_daily: > 3` | one email trying many cards (testers often reuse a throwaway email) |
| `Block if :declined_charges_per_email_daily: > 4` | repeated declines on one email |
| `Block if :email_count_for_card_daily: > 3` | one card used with many emails (card being sold on / shared in a testing kit) |
| `Block if :declined_charges_per_card_number_daily: > 4` | one card retried after declines (CVC / expiry guessing) |
| `Block if :total_charges_per_ip_address_hourly: > 10` | sheer volume from one IP, accepted or not |

`card_count_*` and `email_count_*` attributes are capped at 25 by Stripe, so keep thresholds well under that.

### Low-value probes (review, then block)

Card testers use the cheapest thing in the shop. On 16 Nov 2026 the cheapest Store API item was £5.00 (keyed-alike
service) and Royal Mail delivery starts at £6.40, so no real order with delivery comes to less than £11.40:

- `Review if :amount_in_gbp: < 11.00` (re-check the threshold if prices or delivery charges change)

### Risk signals (request 3DS / review)

Request-3DS rules run before block rules, and 3DS shifts liability for fraud to the issuer:

- `Request 3D Secure if :risk_level: = 'elevated'`
- `Request 3D Secure if :seconds_since_card_first_seen: < 300 and :card_count_for_ip_address_hourly: > 1`
- `Review if :is_anonymous_ip: and :card_country: != :ip_country:` (VPN / Tor plus a foreign card)
- `Review if :is_disposable_email:`
- `Block if :risk_level: = 'highest'` (already the built-in default; leave it on)

We deliver to the UK only (the intent route refuses non-GB delivery addresses), so foreign cards are not wrong in
themselves (expats, gifts), but foreign card + anonymous IP + new card is the usual tester pattern.

### Do not

- Do not block on `:cvc_check: = 'fail'` or `:address_zip_check:` alone: wallets (Apple Pay, Google Pay) send no CVC,
  and post-authorization rules briefly put an authorization on the shopper's statement. Radar's built-in rules
  already handle these.
- Do not block whole countries: EU geo-blocking rules apply to EU shoppers, and the shop already restricts delivery.

## What to watch after launch

- **Radar → Reviews** and **Payments → Blocked** weekly for the first month: false positives show up as genuine
  names and addresses with one declined card each.
- **Developers → Logs** for bursts of `payment_intent.payment_failed` events on one order.
- WooCommerce: a run of `pending` orders with the same email or address and no payment is a sign of testing that
  got past the limits; cancel them (the webhook marks failed payments on the order).
- Stripe sends an email when it detects card testing on the account; act on it the same day (lower the thresholds,
  switch the review rules to block).

## If an attack is happening now

1. Turn on Turnstile if it is not on yet (`NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY`, redeploy).
2. Lower the checkout limits in `RATE_LIMITS.checkoutIntent` (e.g. 3 a minute, 10 an hour) and redeploy.
3. In Radar, temporarily `Block if :card_count_for_ip_address_daily: > 1` and
   `Request 3D Secure if :amount_in_gbp: > 0` (every payment), then relax once it stops.
4. Tell Stripe support: they can apply account-level card-testing protection.
