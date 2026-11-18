# Putting the new site on wdlocks.co.uk (Fasthosts): runbook

Final plan, 18 Nov 2026. **Only the new Next.js shop moves**, onto a Fasthosts VPS. **WordPress/WooCommerce stays with
Tomia on 20i**, at the same address: `https://wdlocks.co.uk/wp-admin/` keeps working. **DNS stays on 20i.**
Background and the hosting comparison: `hosting-vps-requirements.md`. Live payments: `go-live-payments.md`.

## How it fits together

```
wdlocks.co.uk   (DNS on 20i nameservers, managed by Tomia)
  @ and www → Fasthosts VPS (Caddy, HTTPS)
      /wp-admin  /wp-login.php  /wp-json  /wp-content  /wp-includes  /wp-cron.php  /xmlrpc.php  ?wc-api=
          → passed to WordPress on 20i (185.151.30.155), unchanged
      everything else → the Next.js site (127.0.0.1:3000)
  MX, SPF, DKIM, autodiscover and the other Microsoft 365 records → unchanged
```

Why this shape (checked 18 Nov 2026):

| Fact | Source |
|---|---|
| WordPress runs on **20i** (IP 185.151.30.155 registered to MNT-20i; Apache, PHP 8.4); nameservers `ns1–4.stackdns.com` are 20i's | whois; [20i nameservers](https://docs.20i.com/domain-names/our-nameservers) |
| Its certificate is a **wildcard** (`*.wdlocks.co.uk` + `wdlocks.co.uk`, Let's Encrypt, valid to 25 Dec 2026). 20i renews wildcards **only while its nameservers are authoritative**, so DNS stays on 20i | openssl; [20i: free SSL without 20i nameservers](https://docs.20i.com/ssl-certificates/free-ssl-without-20i-nameservers) |
| WordPress keeps its address, so no site-URL change and no database search-and-replace | [WordPress: changing the site URL](https://developer.wordpress.org/advanced-administration/upgrade/migrating/) |
| WordPress answers when reached by IP with the `wdlocks.co.uk` name (Store API 200); Caddy must send the matching Host/SNI to an HTTPS upstream | curl `--resolve`; [Caddy reverse_proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy) |
| `/wp-login.php` returns 403 to scripts: bot protection is on, so the VPS IP must be allow-listed | curl |
| Caddy gets the new site's certificate itself once a name points at the VPS and 80/443 are open | [Caddy automatic HTTPS](https://caddyserver.com/docs/automatic-https) |
| Next.js recommends a reverse proxy in front of `next start` | [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting) |
| Domain registrar is **Fasthosts** (renews 14 Jul 2028). Nothing changes there | Nominet whois |

The repo already has the server pieces: `deploy/wdlocks-frontend.service` and `deploy/Caddyfile` (PR #15), live
payments on our own server (PR #16), old-URL redirects (PR #19, #22), Google tags and noindex rules (PR #22). The app runs as
user `wdlocks` from `/srv/wdlocks-frontend`, settings in `/srv/wdlocks-frontend/.env.production`, on 127.0.0.1:3000
behind Caddy; the unit sets `CLIENT_IP_HEADER=x-real-ip`. `NEXT_PUBLIC_*` values are baked in at build: change, then rebuild.

---

## 0. Before starting

| # | Step | Who | Status |
|---|---|---|---|
| 1 | Full WordPress backup (UpdraftPlus, database + files) | Pritam | **Done 18 Nov** (18 files, 419 MB, verified). Second copy off this Mac still to do |
| 2 | Old-URL redirects, Google tags behind consent, noindex off-domain | Pritam | **Done** (PR #19, #22 merged) |
| 3 | Send Tomia the handover list below | Pritam | |
| 4 | Logins ready: Fasthosts, Stripe (live), Cloudflare Turnstile, Resend, GitHub | Client / Pritam | |
| 5 | Pick a quiet go-live slot | Client | |

### Tomia handover (WordPress / e-commerce only)

- Confirm WordPress/WooCommerce stays on the current 20i package, at https://wdlocks.co.uk.
- Keep DNS on 20i nameservers.
- Add `new.wdlocks.co.uk` A/AAAA → [VPS IPv4/IPv6] (testing).
- One day before go-live: TTL of `@` and `www` → 300.
- Go-live: `@` and `www` A/AAAA → [VPS IPv4/IPv6]. No other record changes.
- Allow-list [VPS IP] in the 20i firewall / bot protection and WordPress security plugins.
- WordPress to read the visitor IP from `X-Forwarded-For`, trusted from [VPS IP] only.
- Keep `/xmlrpc.php` and `/wp-json/` open to [VPS IP].
- Backup schedule and retention for WordPress.
- Contact person for go-live day.

Why the last few: all WordPress traffic will arrive from the VPS, and login-lockout plugins that ignore
`X-Forwarded-For` treat every visitor as the proxy ([wordpress.org](https://wordpress.org/support/topic/not-using-x-forwarded-for/),
[Wordfence](https://www.wordfence.com/help/dashboard/options/)); Jetpack needs `xmlrpc.php`
([Jetpack](https://jetpack.com/support/getting-started-with-jetpack/fixing-jetpack-connection-issues/)).

Separate, not needed for the move: the zone has an `msoid` CNAME, which Microsoft says is only for Microsoft 365
operated by 21Vianet and otherwise blocks Office activation
([Microsoft](https://learn.microsoft.com/en-us/microsoft-365/enterprise/external-domain-name-system-records)). The client's IT may want it removed.

## 1. Buy and secure the server (about 1 hour)

1. **Client buys** in the Fasthosts account that holds the domain: **VPS 2** (2 vCPU / 4 GB; WordPress is not on it),
   12 months, **UK**, **Ubuntu 24.04** ([Fasthosts VPS](https://www.fasthosts.co.uk/virtual-private-servers)). In the Cloud
   Panel: add the free **IPv6**, order **Cyber Protect** (daily backups), firewall **22, 80, 443** (TCP; 443 UDP too). Skip Plesk and paid SSL.
2. Client adds our **SSH public key** for a named admin user. Note the IPv4 and IPv6 and fill them into the Tomia list.
3. Harden:
   ```bash
   sudo apt update && sudo apt -y upgrade
   sudo apt -y install unattended-upgrades fail2ban ufw git
   sudo ufw allow OpenSSH && sudo ufw allow 80/tcp && sudo ufw allow 443 && sudo ufw enable
   # /etc/ssh/sshd_config: PermitRootLogin no, PasswordAuthentication no
   sudo systemctl restart ssh
   sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```

## 2. Install the software (about 30 minutes)

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt -y install nodejs
sudo adduser --system --group --home /srv/wdlocks-frontend wdlocks
```
Caddy from its apt repository ([caddyserver.com/docs/install](https://caddyserver.com/docs/install), "Debian, Ubuntu").

## 3. Deploy and test on `new.wdlocks.co.uk` (pretend payments)

1. As `wdlocks`, create an SSH key, add it to the GitHub repo as a **read-only deploy key**, then:
   ```bash
   sudo -u wdlocks git clone git@github.com:pritamnb/wdlocks-frontend.git /srv/wdlocks-frontend
   ```
2. `/srv/wdlocks-frontend/.env.production` (owner `wdlocks`, `chmod 600`):
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
   No Stripe or WooCommerce keys yet, so nothing real is created. This build says noindex and loads no Google tags
   (they switch on only when `NEXT_PUBLIC_SITE_URL` is `https://wdlocks.co.uk`).
3. Build and start:
   ```bash
   cd /srv/wdlocks-frontend && sudo -u wdlocks npm ci && sudo -u wdlocks npm run build
   sudo cp deploy/wdlocks-frontend.service /etc/systemd/system/
   sudo systemctl daemon-reload && sudo systemctl enable --now wdlocks-frontend
   ```
4. `/etc/caddy/Caddyfile` (the final file: `wdlocks.co.uk` and `www` simply wait for their certificates until DNS moves),
   then `sudo systemctl reload caddy`:
   ```
   (wordpress) {
   	# WordPress on 20i. Host and SNI must be wdlocks.co.uk, whatever name the visitor used.
   	reverse_proxy https://185.151.30.155 {
   		header_up Host wdlocks.co.uk
   		transport http {
   			tls_server_name wdlocks.co.uk
   		}
   	}
   }

   wdlocks.co.uk, new.wdlocks.co.uk {
   	encode zstd gzip

   	@wordpress path /wp-admin /wp-admin/* /wp-login.php /wp-json /wp-json/* /wp-content/* /wp-includes/* /wp-cron.php /xmlrpc.php
   	@wcapi query wc-api=*
   	handle @wordpress {
   		import wordpress
   	}
   	handle @wcapi {
   		import wordpress
   	}
   	handle {
   		reverse_proxy 127.0.0.1:3000 {
   			header_up X-Real-IP {remote_host}
   		}
   	}
   }

   www.wdlocks.co.uk {
   	redir https://wdlocks.co.uk{uri} permanent
   }
   ```
   Caddy sends `X-Forwarded-For` / `X-Forwarded-Proto` to WordPress by default; `?wc-api=` carries PayPal's callbacks.
5. Tomia adds `new` (list above). Caddy issues its certificate within a minute of the name resolving.
6. Add `new.wdlocks.co.uk` and `wdlocks.co.uk` to the Turnstile widget's allowed hostnames.
7. Test https://new.wdlocks.co.uk: every page type, product images (served through `/wp-content/`), basket, demo
   checkout, contact / trade / guarantee / crime forms, five old URLs, `https://new.wdlocks.co.uk/wp-json/wc/store/v1/products`
   answering, then `node scripts/check-client-ip.mjs https://new.wdlocks.co.uk` (must end in `429`). WordPress admin
   login is tested after go-live: WordPress sends logins to its own address, which is still 20i at this stage.

## 4. Releasing updates

```bash
cd /srv/wdlocks-frontend && sudo -u wdlocks git pull && sudo -u wdlocks npm ci \
  && sudo -u wdlocks npm run build && sudo systemctl restart wdlocks-frontend
```
At a quiet time. Roll back with `git checkout <previous commit>` and the same build and restart. Vercel keeps deploying
`main` to wdlocks-frontend.vercel.app as a staging copy (noindex, no tags).

## 5. Go-live (about 1 hour, quiet slot)

1. **Day before:** Tomia sets TTL 300 on `@` and `www`. Fresh UpdraftPlus backup, downloaded.
2. **Live payments**, as `go-live-payments.md`: fill `.env.live` on the Mac, `node scripts/stripe-setup.mjs --target server --check`,
   then `--target server` (live webhook `https://wdlocks.co.uk/api/stripe/webhook`, wallet domain, writes `.env.server`).
   Merge `.env.server` into `.env.production`, add the WooCommerce keys, remove `NEXT_PUBLIC_CHECKOUT_MODE=demo`, set
   `NEXT_PUBLIC_SITE_URL=https://wdlocks.co.uk` (keep `NEXT_PUBLIC_WC_BASE=https://wdlocks.co.uk`), rebuild and restart.
3. **DNS:** Tomia points `@` and `www` (A + AAAA) at the VPS. Caddy gets the certificates once they resolve.
4. **Check straight away:** home, category, product, basket, one real low-value order (refund it in Stripe; it should
   turn Refunded in WooCommerce), **WordPress admin login at https://wdlocks.co.uk/wp-admin/**, forms and their emails,
   five old URLs, `www` → apex, HTTPS, `check-client-ip.mjs https://wdlocks.co.uk`, then
   `node scripts/stripe-setup.mjs --target server --verify`.

**Rollback:** Tomia points `@` and `www` back to 185.151.30.155 / 2a07:7800::155. WordPress never changed, so with TTL 300
this takes about 5 minutes. Payments-only rollback: `go-live-payments.md`.

## 6. Tracking at launch (client's Tag Manager)

The live build loads GA4 G-HTQ28QJR8H on "analytics" consent and Tag Manager GTM-KMBS7ZK on "marketing" (it holds Google
Ads AW-17423822524, GA4 G-5YLV9SVBZ5, Microsoft Clarity and a Meta pixel). Its Ads conversions fire on WordPress
addresses that no longer exist, so in Tag Manager:

| Conversion today | Change the trigger to |
|---|---|
| Page `/order-received/` or event `purchase` | Custom event `purchase` (once per paid order on `/checkout/return`; `ecommerce.transaction_id`, `value`, `currency`) |
| Form submit on `/trade-application/` | Custom event `form_submit`, `form_name` = `trade_application` |
| Form submit on `/contact-us/` | Custom event `form_submit`, `form_name` = `contact_callback` or `contact_message` |
| `tel:` link clicks | No change |

`guarantee_registration` is sent for the guarantee form too. If Google Ads or Shopping ads link to old `/product/` URLs,
change them to `/products/`.

## 7. First week

1. Cyber Protect backup ran, and a restore works.
2. UptimeRobot (free) on `https://wdlocks.co.uk` and `https://wdlocks.co.uk/wp-login.php`.
3. Search Console: still verified (tags carried over), submit `https://wdlocks.co.uk/sitemap.xml`, check the Pages report for 404s after two weeks.
4. Tomia sets TTLs back to 3600.
5. Monthly: `sudo apt upgrade`, disk space, `journalctl -u wdlocks-frontend`. Someone named owns this.
