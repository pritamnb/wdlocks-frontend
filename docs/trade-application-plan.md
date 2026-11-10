# Trade application page — plan

Status: **planned, not built** (10 Nov 2026). Requested as "make a plan to implement".

## What exists today

`wdlocks.co.uk/trade-application/` (Elementor):

- Title "Trade Application" under the "PROTECTED BY WATCHDOG locksmith" eyebrow.
- **The body copy is a generic SEO article about finding trustworthy locksmiths in Bristol** (with "Contact" pasted
  where "auto locksmiths" should be) and a stray "grey cup live stream" line. None of it is about trade accounts.
- A working Elementor Pro form (post 4783, form `bc00e91`): Company Name, Contact Name, Trading Address, Post Code,
  Email Address, Phone Number, Type of Business → [Submit].
- Ultion has no trade page at all: its "Are you an installer? Click Here" strip links off-site to brisant-secure.com.

Our site links to the WordPress page from the trust strip ("Are you an installer? Apply for trade →"), the Locks menu
and the footer.

## What to build — `/trade`

| Section | Build |
|---|---|
| Hero | Dark panel in the Guarantee/Home-truths style: eyebrow "For locksmiths, installers and door companies", H1 "Fit the lock you can stand behind.", one line on Watchdog's 3 Star / Diamond / SBD credentials, the cylinder X-ray render |
| Why trade with Watchdog | Four tiles with sourced facts only: 3 Star Kitemark TS 007 + Sold Secure Diamond + Secured by Design; £5,000 guarantee registered by your customer in two minutes; keyed-alike and extra keys cut to key number, same-day dispatch before 3pm; supplied by Brisant Secure (Allegion). Trade pricing, credit terms and delivery arrangements **only once the client confirms them** (nothing is published today) |
| How it works | Three steps: apply → we confirm your account → order by phone, email or the trade price list |
| Application form | The seven WordPress fields, plus an optional "Approximate monthly volume" select and a consent line. Posts to `/api/trade`, which forwards to the Elementor endpoint (same proven pattern as the guarantee form: `elementor_pro_forms_send_form`, post 4783, form `bc00e91`, fields `form_fields[cname|field_27542ea|field_dbab9c8|field_f60e7bd|emailaddress|field_2c3a377|message]`). Ship in handoff mode first; switch to proxy after one approved test submission, exactly as the guarantee form was done |
| FAQ | Who can apply, how long approval takes, minimum order, VAT invoices, where to see trade prices (answers to come from the client) |
| Closer | Accreditations strip + "Already a trade customer? Call 0203 857 4718" |
| Links | Trust strip, Locks menu "Trade application" and footer "Trade application" → `/trade`; sitemap entry |

## Open questions for the client (needed before the page can say anything concrete)

1. Trade pricing: a discount, a price list, or account-specific?
2. Approval criteria (locksmith, installer, fabricator, retailer?) and turnaround.
3. Credit terms or pro-forma only; minimum order; carriage paid threshold.
4. Who receives applications (the Elementor form currently emails whoever is set in WordPress).
5. Replace the Bristol article on the WordPress page, or let it redirect to `/trade` once the headless page is live.

## Effort

Half a day: page + four components (hero, tiles, steps, form), `/api/trade` route (copy of `/api/guarantee` with the
field map), docs and the link changes. Testing needs one live submission approval, as before.
