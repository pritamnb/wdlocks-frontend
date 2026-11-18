# Hosting wdlocks.co.uk on Fasthosts: step-by-step runbook

Updated 18 Nov 2026. Moves the Next.js site from Vercel to a **Fasthosts VPS** on **wdlocks.co.uk**, with
WordPress/WooCommerce moving to **shop.wdlocks.co.uk** (staying with Tomia). Background, prices and requirements:
`hosting-vps-requirements.md`.

This runbook follows the server setup already in the repo, so the steps and the code agree:

| Piece | Where it is defined | Status 18 Nov |
|---|---|---|
| Old WordPress URL redirects | PR #19 | **Merged** |
| systemd unit (`deploy/wdlocks-frontend.service`), Caddy config (`deploy/Caddyfile`), README "Running on a plain server", `scripts/check-client-ip.mjs` | PR #15 | **Merged** 18 Nov |
| Live Stripe payments on our own server: `scripts/stripe-setup.mjs --target server` / `--verify`, `docs/go-live-payments.md`, abandoned-order sweep | PR #16 | **Merged** 18 Nov |
| Google tags behind cookie consent, noindex on every copy except wdlocks.co.uk, second round of old-URL redirects, product search descriptions (from the redirects and SEO handover) | branch `launch-seo` | Open |

Conventions from those files: the app runs as user `wdlocks` from **`/srv/wdlocks-frontend`**, settings in
**`/srv/wdlocks-frontend/.env.production`**, listening on **127.0.0.1:3000 only**, behind **Caddy**, which overwrites
`X-Real-IP`; the unit sets `CLIENT_IP_HEADER=x-real-ip`. One process, so the rate limits need **no Upstash**.
`NEXT_PUBLIC_*` values are baked in at build time: change them, then **rebuild**.

Assumption: WordPress stays with Tomia, so buy **VPS 2** (2 vCPU / 4 GB). If WordPress moves too, buy RAM VPS 2 (8 GB)
and add PHP 8.4 + MariaDB in phase 2.

---

## Phase 0: Before buying anything

| # | Step | Who | Status |
|---|---|---|---|
| 1 | Full backup of the current WordPress site (database + files), two copies in two places | Pritam | **Done 18 Nov** (UpdraftPlus, 18 files, 419 MB, verified). Second copy off this Mac still to do |
| 2 | Old-URL redirects in `main` (PR #19) | Pritam | **Done** |
| 3 | Snapshot of the public DNS records (table below) | Claude | **Done 18 Nov** |
| 4 | Ask Tomia for the **full DNS zone export** and how to change nameservers or records | Pritam → Tomia | Draft message below |
| 5 | Confirm logins: Fasthosts (domain), Tomia, Stripe, Cloudflare Turnstile, Resend, GitHub, Microsoft 365 | Client | |
| 6 | Merge PR #15 and PR #16 to `main` (pushing `main` redeploys Vercel production; both are inert there) | Pritam | **Done 18 Nov** |
| 8 | Search Console: give the owner's access to whoever checks launch (the SEO handover could not open it) | Client | |
| 9 | Google Tag Manager: point the Ads conversion triggers at the new site's events (see "Tracking at launch" below) | Whoever runs GTM-KMBS7ZK | |
| 7 | Pick a quiet switch-over slot and tell the office the shop may pause for 15 minutes | Client | |

### DNS records today (public lookup, 18 Nov 2026, nameservers ns1–4.stackdns.com = 20i/Tomia)

| Name | Type | Value | Keep after the move? |
|---|---|---|---|
| `@` | A / AAAA | 185.151.30.155 / 2a07:7800::155 (WordPress on 20i) | Changes to the VPS at switch-over |
| `www` | A / AAAA | same as `@` | Changes to the VPS at switch-over |
| `*` (wildcard) | A / AAAA | 185.151.30.155 / 2a07:7800::155 | Ask Tomia; replace with explicit `shop` |
| `@` | MX | 10 `wdlocks-co-uk.mail.protection.outlook.com` | **Yes, exactly** (email) |
| `@` | TXT | `v=spf1 include:spf.protection.outlook.com -all` | **Yes** |
| `@` | TXT | `MS=ms71555982` | **Yes** |
| `@` | TXT | `202004140715190lu4lhivx8ja17hlywpe2pwwsjscxpdiqib4lbq14jm3ib88u1` (verification token) | **Yes** |
| `autodiscover` | CNAME | `autodiscover.outlook.com` | **Yes** (Outlook setup) |
| `selector1._domainkey` | CNAME | `selector1-wdlocks-co-uk._domainkey.WATCHDOGLOCKSMITHS.onmicrosoft.com` | **Yes** (email signing, DKIM) |
| `selector2._domainkey` | CNAME | `selector2-wdlocks-co-uk._domainkey.WATCHDOGLOCKSMITHS.onmicrosoft.com` | **Yes** (DKIM) |
| `enterpriseenrollment` | CNAME | `enterpriseenrollment.manage.microsoft.com` | **Yes** (Microsoft device management) |
| `enterpriseregistration` | CNAME | `enterpriseregistration.windows.net` | **Yes** |
| `ftp` | CNAME | `ftp.gb.stackcp.com` (20i FTP) | Yes while WordPress is at Tomia |
| `mail`, `webmail` | A | 213.171.216.40 (old Fasthosts mail) | Copy as-is; ask the client if still used |
| `_dmarc` | none (only the wildcard) | | **Add** DMARC |

SOA TTL 3600. Public lookups cannot list everything: the zone export from Tomia is the source of truth.

### Who controls what (checked 18 Nov 2026)

- **Registrar: Fasthosts** (Nominet record, registered 2014, expires 14 Jul 2028). Whoever holds the Fasthosts login
  changes the nameservers; Tomia's permission is not needed. DNSSEC is off, so nothing extra is needed for the move.
- **DNS records: at Tomia/20i** (nameservers ns1–4.stackdns.com) until the nameservers move. Only someone with the
  Tomia/20i control panel login (StackCP) can export or edit them: Tomia, unless someone at Watchdog has their own login.
- **Shop subdomain with HTTPS:** inside the hosting account, so the same. A WordPress admin login cannot do it.
- **WordPress address and payment webhook URLs:** any WordPress admin.

### Draft message to Tomia (Pritam to send)

> Hi Tomia team,
>
> We're moving the main wdlocks.co.uk website to a new server. WordPress and WooCommerce will stay with you, on a
> subdomain. Email (Microsoft 365) is not changing. Could you please help with the following:
> 1. **DNS export.** Please send us a full export of the DNS zone for wdlocks.co.uk, with every record, including the
>    wildcard and any records that aren't visible publicly.
> 2. **One DNS record for testing.** While DNS is still with you, please add a record `new.wdlocks.co.uk` pointing to
>    our new server. We'll send the IP addresses once the server is ready.
> 3. **Shop subdomain.** On a date we'll agree with you, please add `shop.wdlocks.co.uk` to the hosting with an HTTPS
>    certificate, so WordPress can run there. We'll handle the WordPress settings ourselves unless you'd prefer to do it.
> 4. **Backups.** What backups do you keep of the site? How often are they taken, and for how long are they kept?
>    Could you give us a copy if we ask?
> 5. **DNS move, for your information.** The domain is registered with Fasthosts, and we plan to move its nameservers
>    there later. Does your hosting depend on any DNS records we should keep, for example the wildcard, `ftp`, or
>    records for the HTTPS certificate?
>
> Many thanks

## Phase 1: Buy and secure the server (about 1 hour)

1. **Client buys** in the Fasthosts account that holds the domain: **VPS 2**, 12 months, **UK** data centre,
   **Ubuntu 24.04**. In the Cloud Panel: add one free **IPv6**, order **Cyber Protect** (daily backups), and set the
   firewall policy to **22, 80, 443** (TCP; also 443 UDP for HTTP/3). Skip Plesk and paid SSL.
2. Client adds our **SSH public key** for a named admin account (no shared passwords). Note the IPv4 and IPv6.
3. Harden, as the admin user:
   ```bash
   sudo apt update && sudo apt -y upgrade
   sudo apt -y install unattended-upgrades fail2ban ufw git
   sudo ufw allow OpenSSH && sudo ufw allow 80/tcp && sudo ufw allow 443 && sudo ufw enable
   # /etc/ssh/sshd_config: PermitRootLogin no, PasswordAuthentication no
   sudo systemctl restart ssh
   ```
4. Swap, so a build never runs out of memory on 4 GB:
   ```bash
   sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```

## Phase 2: Install the software (about 30 minutes)

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt -y install nodejs            # Node 24 LTS; the unit runs /usr/bin/npm
sudo adduser --system --group --home /srv/wdlocks-frontend wdlocks
```
Install **Caddy** from its official apt repository (caddyserver.com/docs/install, "Debian, Ubuntu").

## Phase 3: Deploy on a test name, with pretend payments (about 1 hour)

1. Give the server read access to GitHub: as `wdlocks`, create an SSH key and add it to the repo as a **read-only
   deploy key**. Then:
   ```bash
   sudo -u wdlocks git clone git@github.com:pritamnb/wdlocks-frontend.git /srv/wdlocks-frontend
   ```
2. `/srv/wdlocks-frontend/.env.production` (owner `wdlocks`, `chmod 600`). For the test phase WordPress is still on the
   main domain, and the checkout is in **demo mode with no Stripe or WooCommerce keys**, so nothing real is created:
   ```
   NEXT_PUBLIC_SITE_URL=https://new.wdlocks.co.uk
   NEXT_PUBLIC_WC_BASE=https://wdlocks.co.uk
   NEXT_PUBLIC_CHECKOUT_MODE=demo
   RESEND_API_KEY=…
   CONTACT_FROM=…
   CONTACT_TO=…
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=…
   TURNSTILE_SECRET_KEY=…
   ```
   Leave `UPSTASH_*`, `TRUSTED_PROXY_COUNT` and `CLIENT_IP_HEADER` out (the unit sets the last one).
3. Build and install the service:
   ```bash
   cd /srv/wdlocks-frontend && sudo -u wdlocks npm ci && sudo -u wdlocks npm run build
   sudo cp deploy/wdlocks-frontend.service /etc/systemd/system/
   sudo systemctl daemon-reload && sudo systemctl enable --now wdlocks-frontend
   ```
4. `/etc/caddy/Caddyfile`, based on `deploy/Caddyfile`, then `sudo systemctl reload caddy`:
   ```
   new.wdlocks.co.uk {
   	encode zstd gzip
   	reverse_proxy 127.0.0.1:3000 {
   		header_up X-Real-IP {remote_host}
   	}
   }
   ```
5. DNS (still at Tomia): add `new` → the VPS IPv4 (A) and IPv6 (AAAA). Without it the wildcard sends `new` to
   WordPress. Caddy issues the certificate within a minute of the name resolving.
6. Add `new.wdlocks.co.uk` and `wdlocks.co.uk` to the Turnstile widget's allowed hostnames.
7. Test https://new.wdlocks.co.uk: every page type, product images, basket, a demo checkout, contact, trade, guarantee
   and crime forms, five old URLs redirecting, security headers. Then the rate-limit check from PR #15:
   ```bash
   node scripts/check-client-ip.mjs https://new.wdlocks.co.uk
   ```
   It must end in `429`, and the one-line `curl` it prints must **not** be limited from a phone hotspot.

## Phase 4: Releasing updates

The same steps as `docs/go-live-payments.md` step 5, at a quiet time (the site may error for the minute the build
replaces its files):
```bash
cd /srv/wdlocks-frontend && sudo -u wdlocks git pull && sudo -u wdlocks npm ci \
  && sudo -u wdlocks npm run build && sudo systemctl restart wdlocks-frontend
```
Roll back: `sudo -u wdlocks git checkout <previous commit>`, then the same build and restart. Vercel keeps
auto-deploying `main` to wdlocks-frontend.vercel.app, which stays as the staging copy.

## Phase 5: Move DNS to Fasthosts (a few days before switch-over)

Its own step, so email is proven before the website moves.
1. In the Fasthosts control panel, recreate **every record from Tomia's zone export** (cross-check the table in
   phase 0), plus `new` → the VPS. Replace the wildcard with an explicit `shop` → 185.151.30.155 / 2a07:7800::155 unless
   Tomia needs the wildcard.
2. Add DMARC: TXT `_dmarc` = `v=DMARC1; p=none; rua=mailto:<a mailbox the client reads>`. Add Resend's SPF/DKIM
   records for the contact-form sender.
3. Switch the nameservers to Fasthosts. Over the next day check email sends and arrives, and Outlook still connects.
4. At least a day before phase 6, lower the TTL of `@`, `www` and `shop` to **300 seconds**.

## Phase 6: Switch-over (about 1 hour, in the quiet slot)

1. **Fresh backup** of WordPress (UpdraftPlus, as on 18 Nov) and download it.
2. **WordPress to the subdomain** (Tomia, or whoever has WordPress admin): Tomia adds `shop.wdlocks.co.uk` with HTTPS;
   change WordPress Address and Site Address to `https://shop.wdlocks.co.uk`; database search-and-replace; update the
   WooPayments and PayPal webhook URLs. Check https://shop.wdlocks.co.uk/wp-json/wc/store/v1/products answers.
3. **Caddyfile** for the real names, then `sudo systemctl reload caddy`:
   ```
   wdlocks.co.uk, new.wdlocks.co.uk {
   	encode zstd gzip
   	reverse_proxy 127.0.0.1:3000 {
   		header_up X-Real-IP {remote_host}
   	}
   }
   www.wdlocks.co.uk {
   	redir https://wdlocks.co.uk{uri} permanent
   }
   ```
4. **DNS**: point `@` and `www` at the VPS (A + AAAA). Caddy gets certificates once they resolve.
5. **Live payments**, exactly as `docs/go-live-payments.md` (PR #16): fill `.env.live` on your Mac, run
   `node scripts/stripe-setup.mjs --target server --check`, then `--target server` (creates the live webhook for
   `https://wdlocks.co.uk/api/stripe/webhook`, registers the wallet domain, writes `.env.server`). Merge `.env.server`
   into `/srv/wdlocks-frontend/.env.production`, remove `NEXT_PUBLIC_CHECKOUT_MODE=demo`, set
   `NEXT_PUBLIC_SITE_URL=https://wdlocks.co.uk` and `NEXT_PUBLIC_WC_BASE=https://shop.wdlocks.co.uk`, then rebuild and
   restart (phase 4 command). Finish with `node scripts/stripe-setup.mjs --target server --verify`.
6. **Check straight away**: home, a category, a product, basket, one real low-value order (then refund it in Stripe:
   the order should turn Refunded in WooCommerce), contact/trade/guarantee forms and their emails, five old URLs,
   `www` → apex, HTTPS on `wdlocks.co.uk` and `shop.wdlocks.co.uk`, and `check-client-ip.mjs https://wdlocks.co.uk`.

**Rollback:** point `@` and `www` back to 185.151.30.155 and change WordPress back to `https://wdlocks.co.uk`. With a
300-second TTL this takes about 5 minutes. For payments only, see the rollback in `docs/go-live-payments.md`.

### Tracking at launch

The live build (`NEXT_PUBLIC_SITE_URL=https://wdlocks.co.uk`) loads the same Google tags as WordPress, only after the
visitor accepts cookies: GA4 G-HTQ28QJR8H on "analytics", Tag Manager GTM-KMBS7ZK on "marketing" (it holds Google Ads
AW-17423822524, GA4 G-5YLV9SVBZ5, Microsoft Clarity and a Meta pixel). Every other build sends nothing to Google and
says noindex. The container's Ads conversions fire on WordPress addresses that no longer exist, so in Tag Manager:

| Conversion today | Change the trigger to |
|---|---|
| Page `/order-received/` or event `purchase` | Custom event `purchase` (pushed once per paid order on `/checkout/return`, GA4 ecommerce shape: `transaction_id`, `value`, `currency`) |
| Form submit on `/trade-application/` | Custom event `form_submit` with `form_name` = `trade_application` |
| Form submit on `/contact-us/` | Custom event `form_submit` with `form_name` = `contact_callback` or `contact_message` |
| `tel:` link clicks | No change |

Also `guarantee_registration` is sent for the guarantee form. Check with Tag Assistant on the test name by building it
with `NEXT_PUBLIC_GOOGLE_TAGS=on`. If any Google Ads or Shopping ads link to old `/product/` URLs, change their final
URLs to the new `/products/` addresses.

## Phase 7: First week

1. Confirm the daily **Cyber Protect** backup ran and a restore works.
2. **UptimeRobot** (free) on `wdlocks.co.uk` and `shop.wdlocks.co.uk`, alerts by email or SMS.
3. **Google Search Console**: property still verifies (the two verification tags carry over), submit
   `https://wdlocks.co.uk/sitemap.xml`, and check the Pages report for new 404s after two weeks. GA4 shows visits again.
4. TTLs back to 3600 seconds.
5. Monthly: `sudo apt upgrade`, check disk space, `journalctl -u wdlocks-frontend`. Someone named owns this.
