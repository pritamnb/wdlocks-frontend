# Moving wdlocks.co.uk to the new site: hosting requirements

18 Nov 2026. Goal: serve the new Next.js site (today at wdlocks-frontend.vercel.app) on **wdlocks.co.uk**, on a server
the client owns, choosing between **Fasthosts** and **Hostinger KVM 2**. Tomia (on 20i) hosts WordPress only, so it
cannot run this app.

> **Final plan (19 Nov 2026), see `fasthosts-runbook.md`:** everything for wdlocks.co.uk leaves Tomia. The Next.js
> site and WordPress/WooCommerce run on one Fasthosts 8 GB VPS (**RAM VPS 2**); WordPress keeps its address
> (`/wp-admin`, `/wp-json`, `/wp-content` are served by PHP on the same server). **DNS moves to Fasthosts**, where the
> domain is registered. No WordPress subdomain. This replaces the 18 Nov plan (WordPress and DNS staying on 20i).

## What is true today (checked 18 Nov 2026)

| Item | Finding |
|---|---|
| Domain registrar | **Fasthosts** (Nominet tag LIVEDOMAINS), registered 2014, expires **14 Jul 2028** |
| DNS servers | `ns1–ns4.stackdns.com` = **20i** (Tomia's platform), so DNS changes go through Tomia today |
| Current web server | 185.151.30.155 / 2a07:7800::155, 20i network, Apache + PHP 8.4 (WordPress/WooCommerce) |
| SSL now | Let's Encrypt, issued by 20i, valid to 25 Dec 2026 |
| Email | **Microsoft 365**: MX `wdlocks-co-uk.mail.protection.outlook.com`, SPF `include:spf.protection.outlook.com -all`, TXT `MS=ms71555982`, plus one more verification TXT. No DMARC record |
| New app | Next.js 16.4, 8 server routes (Stripe intent/status/webhook, contact, guarantee, trade, crime, demo), timed page refresh (60 s / 1 h / 1 day), image optimisation, security headers incl. HSTS `includeSubDomains; preload` |

## Requirements

### 1. Domain and DNS
- **Decided:** DNS moves from 20i to Fasthosts DNS. The Fasthosts zone is first made an exact copy of the live one
  (every Microsoft 365 record included), then the nameservers are switched; the record list is in the runbook, phase 2.
- After that we change `@` and `www` (A + AAAA) → the VPS at go-live ourselves, with TTL 300.
- Add after go-live: DMARC (`_dmarc` TXT, start with `p=none`), and Resend's SPF/DKIM records so contact-form emails
  from `CONTACT_FROM` are not marked as spam. Neither exists today (checked 19 Nov).

### 2. SSL (HTTPS)
- Free Let's Encrypt certificates with **automatic renewal** for `wdlocks.co.uk` and `www.wdlocks.co.uk` on the VPS
  (Caddy does this automatically). WordPress is served under the same names, so it needs no certificate of its own.
- HTTP → HTTPS redirect and `www` → apex redirect.
- Because the site sends HSTS with `includeSubDomains`, **every subdomain must work over HTTPS**. Checked 18 Nov:
  `mail`, `webmail` and `ftp` do not answer on the web at all, so nothing in use breaks.

### 3. Server for the Next.js app
- Linux VPS (Ubuntu 24.04 LTS), **UK data centre** (customers are UK; Vercel runs it in London today).
- **Node.js 22 or 24 LTS** (Next 16 needs 20.9+), npm.
- A process manager to keep the app running and restart it after crashes or reboots: **systemd** (`deploy/wdlocks-frontend.service`, PR #15).
- A reverse proxy on ports 80/443 forwarding to the app on 127.0.0.1:3000: **Caddy** (`deploy/Caddyfile`, PR #15), with compression.
- Size: the build needs about 2–3 GB of RAM; running needs about 0.5 GB. **2 vCPU / 4 GB minimum** for the app alone,
  **8 GB if WordPress moves onto the same server**. 10 GB of writable disk for the app, its page cache and image cache.
- Outbound HTTPS allowed to Stripe, the WooCommerce site, Resend, Upstash, Cloudflare Turnstile and the police/postcode APIs.
- Secrets set as environment variables on the server (never in git):
  `NEXT_PUBLIC_SITE_URL=https://wdlocks.co.uk`, `NEXT_PUBLIC_WC_BASE=https://wdlocks.co.uk` (WordPress keeps its address),
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `WC_CONSUMER_KEY`,
  `WC_CONSUMER_SECRET`, `RESEND_API_KEY`, `CONTACT_FROM`, `CONTACT_TO`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`,
  `TURNSTILE_SECRET_KEY`. The unit sets `CLIENT_IP_HEADER=x-real-ip`; one process needs no Upstash store
  (README "Running on a plain server", PR #15).
- **Stripe webhook**: change the endpoint in the Stripe dashboard to `https://wdlocks.co.uk/api/stripe/webhook` at
  cutover and update `STRIPE_WEBHOOK_SECRET`.
- Deploys: Vercel's push-to-deploy goes away. Replace with a deploy script or a GitHub Action over SSH
  (pull → `npm ci` → `npm run build` → restart), keeping the previous build for a one-command rollback.

### 4. WordPress / WooCommerce (still needed for products, stock, orders, guarantee form)
- **Decided:** WordPress moves onto the same VPS and keeps `https://wdlocks.co.uk`. Its address, settings and webhook
  URLs do not change. Caddy serves `/wp-admin`, `/wp-login.php`, `/wp-json`, `/wp-content`, `/wp-includes`,
  `/wp-cron.php`, `/xmlrpc.php` and `?wc-api=` from PHP-FPM (PHP 8.3, MariaDB 10.11, files in `/srv/wordpress`).
- It is restored from an UpdraftPlus backup: a rehearsal with the 18 Nov backup, then a fresh one at go-live.
- WordPress, plugin and theme updates and the daily database backup become our job; Tomia did them until now.

### 5. Security and upkeep (both options are self-managed servers)
- Firewall open only on 22, 80, 443; SSH keys only, no password logins; fail2ban; automatic security updates; non-root user.
- **Daily backups** kept off the server (Hostinger includes weekly only; Fasthosts backups are a paid add-on). If
  WordPress is on the server, back up its database daily too.
- Uptime monitoring with alerts (for example UptimeRobot, free), log rotation, disk-space alerts.
- A named person who patches the server monthly and renews nothing by hand.

### 6. SEO and switch-over
- Merge the old-URL redirects (PR #19) before the switch so Google's 73 indexed URLs keep working.
- Keep Google Search Console verification (the tags carried over in PR #19, or a DNS TXT record).
- Build and test on the new server under a temporary name first (e.g. `new.wdlocks.co.uk`), then switch DNS, keep the
  old site for 48 hours, and test checkout, Stripe webhook, contact, trade and guarantee forms straight after.

## Fasthosts vs Hostinger (prices as shown on their UK pages, 18 Nov 2026, unchanged on 19 Nov; check VAT at checkout)

| | Hostinger KVM 2 | Fasthosts VPS 2 | Fasthosts RAM VPS 2 |
|---|---|---|---|
| CPU / RAM / disk | 2 vCPU / 8 GB / 100 GB NVMe | 2 vCPU / 4 GB / 120 GB NVMe | 2 vCPU / 8 GB / 120 GB NVMe |
| Price | £6.79/mo for 24 months (£162.96 upfront), then **£12.99/mo** | £4/mo for 3 months, then **£12/mo** | £12/mo for 3 months, then **£17/mo** |
| Contract | 24 months for that price | 1 or 12 months | 1 or 12 months |
| UK data centre | Yes | Yes (also DE, ES, US) | Yes |
| Backups | Free weekly | Paid add-on | Paid add-on |
| Control panel | None needed; Node.js one-click and Coolify templates | Plesk optional, extra | Plesk optional, extra |
| Management | Self-managed | Self-managed | Self-managed |
| Other | Cheapest 8 GB | Domain already at Fasthosts; UK support; Tier IV, ISO 27001 | Same as VPS 2 |

## What about AWS? (checked 18 Nov 2026)

| AWS option | Fit for this site | Cost |
|---|---|---|
| **Amplify Hosting** (managed Next.js, closest to Vercel) | **Not today.** AWS documents support for "Next.js versions 12 through 15"; Next.js 16 is not mentioned, and on-demand page refresh is unsupported. This site is on Next.js 16.4 | Pay per use: $0.01/build minute, $0.15/GB served, $0.30 per million server requests, $0.20 per GB-hour; free tier 15 GB transfer and 500,000 requests a month |
| **Lightsail** (simple server, London region) | **Yes.** Same setup as the VPS options above (Node, systemd, Caddy, SSL), still self-managed | 4 GB: **$24/mo**; 8 GB: **$44/mo** (2 vCPU, includes IPv4 and 4–5 TB transfer). Automatic snapshots $0.05 per GB a month |
| **EC2 + load balancer / ECS** | Works, but needs real AWS skills (networking, IAM, scaling) and costs more to run | Usage-based, highest of the three |

AWS brings stronger infrastructure, a London region, and services the internal Admin/CRM may use later (managed
databases, S3 backups, CloudFront, SES email). For the website alone it costs about three times Hostinger for the same
8 GB, bills in US dollars, and is no less work to look after. Amplify becomes worth revisiting once AWS lists Next.js 16 support.

## Chosen: Fasthosts (setup plan, 18 Nov 2026; step-by-step detail in `fasthosts-runbook.md`)

### What to buy
| Item | Choice | Why |
|---|---|---|
| Plan | **RAM VPS 2**: 2 vCPU / 8 GB / 120 GB NVMe, £12/mo for 3 months, then £17/mo (prices rechecked 19 Nov) | Room for the Next.js app, its builds, PHP and MariaDB. Upgrade to VPS 4 (4 vCPU / 8 GB / 240 GB, £22/mo) if builds slow the shop. The account's existing VPS XL is the alternative, see the runbook, phase 1 |
| Contract | 12 months, pay monthly or upfront | Upfront gives a bigger discount |
| Data centre | **UK** | Customers are UK |
| Operating system | **Ubuntu 24.04 LTS** | Long support, best Node.js guides |
| IPv6 | Add one free address in the Cloud Panel | The site should answer on IPv6 too |
| Backups | **Cyber Protect** add-on, scheduled daily | Fasthosts does not include backups. Price is shown in the Cloud Panel, not on the sales page |
| Skip | Plesk (£5/mo) and paid SSL certificates | Not needed: Caddy gets free Let's Encrypt certificates and renews them |

Fasthosts shows prices with a VAT toggle; confirm the VAT-inclusive total at checkout. Upgrading to a bigger plan later is a few clicks in the Cloud Panel.

### Setup order and who does what
Step by step in `fasthosts-runbook.md`. In short: the client decides the server and adds our SSH key; we move DNS to
Fasthosts, install, restore WordPress as a rehearsal, deploy and test on `new.wdlocks.co.uk`; at go-live we restore a
fresh backup, switch on live payments and point `@` and `www` at the VPS. Tomia is asked only for a zone export, a
copy of `wp-config.php` and the notice period, and its package is cancelled after two stable weeks. Until then,
rollback is pointing `@` and `www` back.

## Earlier recommendation (before Fasthosts was chosen)

**Hostinger KVM 2 in the UK data centre.** It is the cheapest way to get 8 GB of RAM, which leaves room for builds and
for WordPress later, and it includes weekly backups. Put DNS on Cloudflare so the client is not tied to either host.
Choose **Fasthosts** instead if the client values one UK supplier and one bill (the domain is already there) over price:
VPS 2 is enough if WordPress stays with Tomia, RAM VPS 2 if WordPress moves too.

## Sources
- AWS Lightsail pricing: https://aws.amazon.com/lightsail/pricing/
- AWS Amplify Next.js support: https://docs.aws.amazon.com/amplify/latest/userguide/ssr-amplify-support.html
- AWS Amplify pricing: https://aws.amazon.com/amplify/pricing/
- Hostinger VPS (UK): https://www.hostinger.com/uk/vps-hosting
- Fasthosts VPS: https://www.fasthosts.co.uk/virtual-private-servers
- Nominet WHOIS for wdlocks.co.uk; public DNS lookups; TLS certificate of wdlocks.co.uk (all 18 Nov 2026)
- App requirements: `next.config.ts`, `src/app/api/*`, `src/lib/rate-limit.ts`, `vercel.json` in this repo
