# Guarantee page replication spec — Ultion guarantee registration → WD /guarantee

Captured 10 Nov 2026. Ultion has no standalone "guarantee" marketing page (`/guarantee/` and `/secure-locks-guarantee/`
redirect to the homepage); the guarantee lives in three places: the homepage "Register your £5,000 guarantee" panel
(already replicated), the `/guarantee-registration/` form page, and clause 14 of `/terms/`.

## Ultion /guarantee-registration/ anatomy

Single dark section (`guarantee-activation-alternative`, #353535), two columns:

- Left: H2 "Activate your **protection**." (orange word); "Exclusive Registration Benefits:" with three orange-tick
  bullets (KeyControl copy protection + Watch Video; £5000 guarantee for 5 years + "Full guarantee details are available
  here" → /terms/; lifetime protection, free); key photo.
- Right: form card — Your name, Your email address, KeyCode 1 (+ "Add another KeyCode" up to 5), "Where can I find
  this?" link, radio "I had a new door & lock installed" / "I had a new lock installed", [Activate Now], reCAPTCHA,
  "The information you are providing to us is safe — we don't share your data with anyone. See Details."
- Then the shared footer. No `<h1>`.

## What wdlocks.co.uk already has

`wdlocks.co.uk/guarantee-registration/` (Elementor): "Activate your £5000 Protection", benefits (burglary within 5 years
by snapping → £5,000; lifetime protection, free; data processed by a third-party security partner), form: Your name,
Your email address, Key Code (placeholder `WD12345678`), consent checkbox, [Activate Now]. Popups "About your data"
and "About the £5000 Guarantee" (28-day activation window, genuine keys, 14-day claim window). Elementor form
`post_id 5203`, `form_id 73d0ba3`, fields `form_fields[name|email|message]`, posted to `wp-admin/admin-ajax.php`.

The binding terms are clause 14 of `wdlocks.co.uk/terms/` ("The Watchdog Locksmith burglary guarantee"): first £5,000 of
uninsured loss; items stolen; lock installed within the preceding 5 years; entry solely by lock-snapping of the
registered lock; registered within 28 days of installation; claim form within 14 days; genuine Watchdog keys only;
maintained per clause 4.1 (Lution XM lubricant every 6 months or 5,000 cycles); burglary after registration; at our
discretion. Clause 14.1.5 says the claim form is "available here" but the page has no link — **client to add**.

## Watchdog version — `/guarantee`

| Section | Build |
|---|---|
| Activation panel | Dark `#1b1a1c`, Ultion's two columns: H1 "Activate your **protection**." (red word), "Registration benefits" with red ticks (the three WD benefits), guarantee key-tag render; right: card. **Handoff mode (default):** the card explains the three things you need (name, email, key number stamped `WD…`), "Where is my key number?" opens the helper modal, [Activate now ↗] goes to the WordPress form. **Proxy mode:** the full form (name, email, up to 5 key numbers, install type radios, consent) posts to `/api/guarantee`, which forwards to the Elementor endpoint. Proxy mode is **on** since 10 Nov 2026: one approved test submission (name "TEST from headless site (please ignore)", key WD00000000) was accepted by the Elementor endpoint ("Your submission was successful"). The client can delete that test entry from Elementor › Submissions. |
| What's covered | Cream; nine conditions from clause 14 as a two-column checklist with the big figures (£5,000 · 5 years · 28 days · 14 days); link to the full terms |
| How to claim | Three steps (report to police and get a crime reference · complete the claim form within 14 days · send the snapped lock and documents) with the claim-form note |
| Keep it valid | Two tiles: genuine Watchdog keys only (→ extra keys), lubricate every 6 months (→ lock lubricant) |
| Key-copy protection | Dark panel with the engraved-keys render: registering your key number means nobody can order a key cut to it without your say-so |
| FAQ | Six guarantee questions, FAQPage JSON-LD |
| Buy band | Existing |
| Links | Every "Activate £5,000 guarantee" button (header, mobile menu, hero card, homepage Guarantee panel, Keys menu, footer) → `/guarantee`; the WordPress form stays the destination of the panel's [Activate now ↗] |

Skipped: Trustpilot strip, reCAPTCHA (handled on the WordPress form), KeyControl video (no Watchdog film for it).
