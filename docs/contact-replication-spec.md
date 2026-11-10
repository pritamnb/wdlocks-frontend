# Contact page replication spec — Ultion /contact/ → WD /contact

Captured 10 Nov 2026 (desktop 1366 px).

## Ultion anatomy

| # | Section | What it is |
|---|---|---|
| 1 | `section-contact-title` | Light page; pill "HERE TO HELP"; H2 "Talk to an expert."; "Our specialist team are on hand to answer any questions you have." |
| 2 | `section-contact-boxes` | Two columns: **Request a callback** card (Your name, Your number, "What time shall we call you?" select of 10-minute slots for today/tomorrow inside opening hours, [Book my call]); right: **Give us a call** (hours Mon–Fri 8–6.30, Sat 9–4.30, Sun 10–3.30, phone pill) and **Send us an email** (email pill) |
| 3 | `section-contact-reviews` | Trustpilot quote slider |
| — | footer | shared. No `<h1>`. |

## What wdlocks.co.uk has

`/contact/`: "Get in Touch Today / Reach Out for Locksmith Assistance"; phone 0203 857 4718; email sales@wdlocks.co.uk;
address 397-399 Greenford Road, Greenford, Middlesex, UB6 8RF; Facebook `watchdoglocks`, Instagram `watchdog_locks`;
a Spectra "Send a Message" block (Full Name, Email, Subject, Message). **The Spectra front-end script is not loaded on
the page, so that form cannot submit** — client to check. No opening hours are published anywhere; the old locksmith
site advertises emergency locksmiths 24/7.

## Watchdog version — `/contact`

| Section | Build |
|---|---|
| Title | Cream; red pill "Here to help"; H1 "Talk to an expert."; one-line intro |
| Callback card | Name, phone, "When should we call?" select of plain windows (this morning / afternoon / evening, tomorrow morning / afternoon, any time; past windows hidden), optional "What is it about?"; [Book my call] |
| Call / email / visit cards | **Give us a call**: sales line, freephone, "Emergency locksmiths, 24 hours" → wdlocksmiths.co.uk; **Send us an email**: sales@wdlocks.co.uk; **Visit the shop**: address + OpenStreetMap embed (CSP already allows it); social links |
| Send a message | Name, email, subject, message, [Send message] (the WD form, since the WordPress one is dead) |
| Delivery | `/api/contact` sends both forms by email to sales@wdlocks.co.uk through Resend when `RESEND_API_KEY` is set (`CONTACT_TO` / `CONTACT_FROM` optional). Without a key the API answers 503 and the page falls back to opening the visitor's mail app with the message pre-filled, so nothing is lost. No opening hours are shown until the client confirms them. |
| Reviews slider | Skipped (no verified source); compact trust strip + buy band instead |
| JSON-LD | Organization with ContactPoint (sales, freephone) and PostalAddress |
| Links | Header "Contact", Keys menu "Contact us", footer "Contact" → `/contact` (footer keeps `id="contact"`) |
