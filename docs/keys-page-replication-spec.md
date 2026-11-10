# Keys page replication spec — Ultion /get-keys/product/ → WD extra keys

Captured 10 Nov 2026. Ultion sells keys with a two-step flow: choose quantity (1–6 chips, 3 preselected) and type the
engraved keycode, then "Get price and buy" validates the code and adds to the basket.

| # | Ultion element | Watchdog version | Status |
|---|---|---|---|
| 1 | Image left: "Horizontal dimple key / Vertical classic key" explainer + warning "Non-genuine keys damage your lock & invalidate your guarantee" | Key render with the same warning badge | Build |
| 2 | H1 "The Ultion Key", price £22.50, 7 bullets | H1 from WooCommerce, live price (£12), 7 Watchdog bullets | Build |
| 3 | "How many keys do you need?" chips 1–6, 3 default, "we recommend ordering enough keys to leave a spare" | Same chips and note | Build |
| 4 | "What's your keycode? (engraved on your current key)" with live validation | "What's your key number?" with format check and a "Where is my key number?" helper | Build |
| 5 | "Get price and buy" (disabled until valid) | 3 Star keys (product 4266): WooCommerce requires the key number as a product field the Store API cannot set, so the button shows the total and continues to the wdlocks.co.uk product page with quantity and key number in the URL. 1 Star keys (6062): adds to the basket natively. | Build (documented limit) |
| 6 | Trustpilot quote slider | Skipped until a verified reviews source exists | Pending |
| 7 | Dark "The Real Deal. Secure, precision cut keys" with giant key | Dark "Genuine Watchdog keys, cut to your number" with the Watchdog key render | Build |
| 8 | "Key Protection with Key Control" + How it works video | "Key protection by key number" with the engraved keys render; How it works → the inside-the-lock film | Build |
| 9 | "Order today, delivers tomorrow" marquee | Existing delivery promise | Have |

Handoff note: when `backend/wd-cart-handoff.php` is installed, extend it to accept `wd_keycode=<number>` and set it as the
product field on the 4266 line so the native basket can carry keys too.
