# Basket & checkout replication spec — Ultion → WD Locks

Captured 10 Nov 2026 with an anonymous test basket (default lock, no personal data, removed afterwards).

## What Ultion does

| Step | Ultion | Notes |
|---|---|---|
| Mini-cart drawer (header basket icon) | Right-hand drawer "Basket": line (thumb, name, options, − qty +, Remove item, price), "Don't Forget" upsell card (Lock Lubricant, Quick Add), Subtotal, [Go to checkout], "View Basket" | WooCommerce Blocks mini-cart, restyled |
| Cart page `/cart/` | Orange trust bar "3 million+ homes · £5,000 security guarantee · Trustpilot 12500+"; table (thumbnail, Product with Size/Colour/Type, Price, Quantity, Subtotal, × remove); coupon field; "Cart totals" (Subtotal, Shipping DPD £7.95, Total incl. VAT); [Proceed to checkout]; review slider | Classic WooCommerce cart template, restyled |
| Checkout `/checkout/` | Stripped header (logo + Trustpilot only); H1 Checkout; "Got a Coupon?" collapsed; Shipping Details (email, phone, first/last name, Find Address via Postcode, "Shipping same as Billing"); Payment (Stripe card fields inline, PayPal radio); right column Order Summary (line with qty stepper and bin, Subtotal, Shipping DPD £7.95, Total inc VAT, terms checkbox, [Complete purchase], "Delivers Wed 11th November") | Single page, same domain. Configurator "Checkout Now" lands here directly |

## Constraint

Payment for WD Locks happens on wdlocks.co.uk (WooPayments, PayPal); the headless basket is handed over there. So the
Watchdog flow has three steps: drawer → `/basket` → `/checkout` (review) → wdlocks.co.uk/checkout (payment). The last step
is a WordPress change the client must make (hide the theme header, add the trust strip, cards before PayPal, postcode lookup).

## Watchdog version

| Step | Build |
|---|---|
| Drawer | Keep (already Ultion-shaped). Button renamed "Go to checkout" → `/checkout`; add "View basket" → `/basket` |
| `/basket` | Red trust bar (£5,000 guarantee · Kitemark 3★ · same-day dispatch before 3pm); table with thumbnail, name + options, unit price, quantity stepper, line total, remove; "Don't forget" upsells; Basket totals: Subtotal inc VAT, Delivery "from £6.40, chosen at checkout", Total; [Proceed to checkout] → `/checkout`; coupons: note "enter at checkout" (the proxy does not apply coupons yet) |
| `/checkout` (review) | Two columns like Ultion: left "Your details and payment are taken on our secure checkout" with what to expect (email, address with postcode lookup, cards or PayPal), payment marks, delivery options table with arrival dates; right Order Summary (lines with qty/remove, Subtotal, Delivery from £6.40, Total inc VAT, "Arrives …" estimate, [Continue to secure payment]). Continue clears the headless basket and hands off (plugin mode: all lines; native: single line, with the existing guard). Both pages `noindex`. |
| Product "Checkout now" | Adds the line then goes to `/checkout` (review) instead of handing off blind |
| wdlocks.co.uk checkout | WordPress: hide header/footer nav on the checkout template, add trust strip + delivery date, cards first. Documented for the client; not possible from this repo |

Skipped: Trustpilot bars and review sliders (no verified source); coupon field (no proxy endpoint yet — add `/api/cart/coupon` later).
