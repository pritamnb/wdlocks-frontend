# Moving wdlocks.co.uk off Tomia (Fasthosts): runbook

Final plan, 19 Nov 2026. **Everything for wdlocks.co.uk leaves Tomia**: the new Next.js shop and
WordPress/WooCommerce both run on one Fasthosts VPS, and DNS moves to Fasthosts. WordPress keeps its address, so
`https://wdlocks.co.uk/wp-admin/` and every login stay the same. Other sites Tomia hosts for the client are not part of this.
Background and the hosting comparison: `hosting-vps-requirements.md`. Live payments: `go-live-payments.md`.

## How it fits together

```
wdlocks.co.uk   (registered at Fasthosts; DNS on Fasthosts nameservers after phase 2)
  @ and www → Fasthosts VPS (Caddy, HTTPS)
      /wp-admin  /wp-login.php  /wp-json  /wp-content  /wp-includes  /wp-cron.php  /xmlrpc.php  ?wc-api=
          → WordPress on the same server (PHP-FPM, files in /srv/wordpress, MariaDB)
      everything else → the Next.js site (127.0.0.1:3000)
  MX, SPF, DKIM, autodiscover and the other Microsoft 365 records → copied exactly, unchanged
```

Facts this plan rests on (checked 19 Nov 2026):

| Fact | Source |
|---|---|
| WordPress 7.1.5, WooCommerce 11.3.0 (HPOS on), PHP 8.4.27, MariaDB 10.11.20, table prefix `wp_`, single site | header of the 18 Nov backup |
| Ubuntu 24.04 ships MariaDB 10.11 (same series) and PHP 8.3 (one release older than the site runs on; fixes arrive with automatic updates) | [Ubuntu packages](https://packages.ubuntu.com/noble/) |
| WordPress sends its email through **WP Mail SMTP → `smtp.office365.com:587`** as `noreply@wdlocks.co.uk`; the setting and password are in the database, so order emails keep working from any server | `wp_mail_smtp` option in the backup |
| 34 active plugins. **ManageWP Worker** gives remote admin access to whoever holds the ManageWP account; **Bot Traffic Shield** and **CHEQ** block bots and may block the server's own requests | `active_plugins` in the backup |
| The backup does not contain `wp-config.php` or `.htaccess` | UpdraftPlus file list |
| WordPress keeps its address, so the final restore needs no URL change | [WordPress: migrating](https://developer.wordpress.org/advanced-administration/upgrade/migrating/) |
| Nameservers are 20i's (`ns1–4.stackdns.com`); the zone lives in Tomia's 20i account. The Fasthosts DNS zone exists but is inactive and out of date | dig; Fasthosts panel |
| 20i's certificate for the old site is a wildcard valid to **25 Dec 2026**; 20i renews wildcards only while its nameservers are in charge | openssl; [20i](https://docs.20i.com/ssl-certificates/free-ssl-without-20i-nameservers) |
| Caddy serves PHP through PHP-FPM with `php_fastcgi` and gets its own certificates once a name points at the server | [php_fastcgi](https://caddyserver.com/docs/caddyfile/directives/php_fastcgi); [automatic HTTPS](https://caddyserver.com/docs/automatic-https) |

The repo already has the server pieces: `deploy/wdlocks-frontend.service` and `deploy/Caddyfile` (PR #15), live
payments on our own server (PR #16), old-URL redirects (PR #19, #22), Google tags and noindex rules (PR #22). The app runs as
user `wdlocks` from `/srv/wdlocks-frontend`, settings in `/srv/wdlocks-frontend/.env.production`, on 127.0.0.1:3000
behind Caddy; the unit sets `CLIENT_IP_HEADER=x-real-ip`. `NEXT_PUBLIC_*` values are baked in at build: change, then rebuild.

---

## 0. Before starting

| # | Step | Who | Status |
|---|---|---|---|
| 1 | Full WordPress backup (UpdraftPlus, database + files) | Pritam | **Done 18 Nov** (18 files, 419 MB, verified). Used for the rehearsal. Second copy off this Mac still to do |
| 2 | Old-URL redirects, Google tags behind consent, noindex off-domain | Pritam | **Done** (PR #19, #22 merged) |
| 3 | Decide the server (phase 1) | Client | |
| 4 | Send Tomia the one message below | Client / Pritam | |
| 5 | Logins ready: Fasthosts, Microsoft 365 admin, Stripe (live), Cloudflare Turnstile, Resend, GitHub | Client / Pritam | |
| 6 | Pick a quiet go-live slot **before the old certificate expires** (see phase 2) | Client | |

### The one message to Tomia

Nothing below blocks the move; each item has a fallback. Tomia does no work on go-live day.

- A **DNS zone export** for wdlocks.co.uk from 20i (fallback: the table in phase 2 plus the Microsoft 365 check).
- A copy of **`wp-config.php` and `.htaccess`** from the site root, to carry over any custom settings (fallback: start
  from a fresh `wp-config.php`; WordPress and the plugins keep their settings in the database).
- Their **notice period** for the wdlocks.co.uk package. Do not cancel yet: it is the rollback until phase 9.

## 1. Server (about 1 hour)

The account already has a VPS XL (4 vCore / 8 GB / 160 GB, CentOS 7 + Plesk, £29.30/mo ex VAT, created June 2024) that
no domain points at. **The client must say what it is for before anyone touches it.**

| Option | Cost | Use when |
|---|---|---|
| **Buy RAM VPS 2** (2 vCPU / 8 GB / 120 GB NVMe), 12 months, UK, Ubuntu 24.04. Recommended | £12/mo for 3 months, then £17/mo ex VAT ([Fasthosts](https://www.fasthosts.co.uk/virtual-private-servers), 19 Nov) | Always works. Cancel the old VPS once the client confirms it is unused |
| Reinstall the existing VPS with Ubuntu 24.04 | £29.30/mo, already being paid | Only if the client confirms nothing on it is needed. Reinstalling erases it |

If builds slow the shop down, RAM VPS 2 upgrades to VPS 4 (4 vCPU / 8 GB / 240 GB, £22/mo) in the Cloud Panel.

1. In the Cloud Panel: add the free **IPv6**, order **Cyber Protect** (daily backups), firewall **22, 80, 443** (TCP; 443 UDP too). Skip Plesk and paid SSL.
2. Client adds our **SSH public key** for a named admin user. Note the IPv4 and IPv6.
3. Harden:
   ```bash
   sudo apt update && sudo apt -y upgrade
   sudo apt -y install unattended-upgrades fail2ban ufw git unzip
   sudo ufw allow OpenSSH && sudo ufw allow 80/tcp && sudo ufw allow 443 && sudo ufw enable
   # /etc/ssh/sshd_config: PermitRootLogin no, PasswordAuthentication no
   sudo systemctl restart ssh
   sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```

## 2. Move DNS to Fasthosts (about 1 hour, then wait 48 hours)

The aim is a nameserver change that nobody notices: the Fasthosts zone is made an exact copy of the live one first.

1. In the Fasthosts panel, open the domain's **Advanced DNS**. Delete the old records there and enter these, read from
   20i's nameserver on 19 Nov 2026 (TTL 3600 unless noted):

   | Name | Type | Value |
   |---|---|---|
   | `@` and `www` | A | `185.151.30.155` (TTL 300) |
   | `@` and `www` | AAAA | `2a07:7800::155` (TTL 300) |
   | `*` (wildcard; skip if the panel refuses it, nothing known uses it) | A, AAAA | `185.151.30.155`, `2a07:7800::155` |
   | `@` | MX 10 | `wdlocks-co-uk.mail.protection.outlook.com` |
   | `@` | TXT | `v=spf1 include:spf.protection.outlook.com -all` |
   | `@` | TXT | `MS=ms71555982` |
   | `@` | TXT | `202004140715190lu4lhivx8ja17hlywpe2pwwsjscxpdiqib4lbq14jm3ib88u1` |
   | `selector1._domainkey` | CNAME | `selector1-wdlocks-co-uk._domainkey.WATCHDOGLOCKSMITHS.onmicrosoft.com` |
   | `selector2._domainkey` | CNAME | `selector2-wdlocks-co-uk._domainkey.WATCHDOGLOCKSMITHS.onmicrosoft.com` |
   | `autodiscover` | CNAME | `autodiscover.outlook.com` |
   | `enterpriseregistration` | CNAME | `enterpriseregistration.windows.net` |
   | `enterpriseenrollment` | CNAME | `enterpriseenrollment.manage.microsoft.com` |
   | `msoid` | CNAME | `clientconfig.microsoftonline-p.net` |
   | `mail`, `smtp`, `webmail`, `mcp` | A | `213.171.216.40` |
   | `ftp` | CNAME | `ftp.gb.stackcp.com` |
   | `new` | A, AAAA | the VPS addresses (TTL 300). New, for testing |

2. **Check nothing is missing.** A public lookup only finds names someone asks for. Compare with Tomia's zone export if
   it came; otherwise open Microsoft 365 admin → Settings → Domains → wdlocks.co.uk → DNS records and confirm every
   record Microsoft lists is in the table.
3. Check the old site's certificate date. Go-live (phase 6) must happen before it, because 20i may not renew it once
   its nameservers are no longer in charge:
   ```bash
   echo | openssl s_client -connect 185.151.30.155:443 -servername wdlocks.co.uk 2>/dev/null | openssl x509 -noout -enddate
   ```
4. In the domain's **Nameservers** setting, switch from `ns1–4.stackdns.com` to Fasthosts' own nameservers.
5. Over the next 48 hours: `dig NS wdlocks.co.uk +short` shows Fasthosts; the old site loads; an email in and out
   arrives; Outlook and Teams sign in.

**Rollback:** set the nameservers back to `ns1–4.stackdns.com`. The 20i zone is untouched until Tomia is cancelled.

From here on, every DNS change is ours to make in the Fasthosts panel.

## 3. Install the software (about 45 minutes)

```bash
# Next.js
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt -y install nodejs
sudo adduser --system --group --home /srv/wdlocks-frontend wdlocks

# WordPress
sudo apt -y install mariadb-server php8.3-fpm php8.3-mysql php8.3-curl php8.3-gd php8.3-imagick php8.3-mbstring \
  php8.3-xml php8.3-zip php8.3-intl php8.3-bcmath php8.3-soap
printf 'memory_limit=256M\nupload_max_filesize=64M\npost_max_size=64M\nmax_execution_time=120\n' \
  | sudo tee /etc/php/8.3/fpm/conf.d/90-wdlocks.ini
sudo systemctl restart php8.3-fpm
curl -fsSLo /tmp/wp https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar
sudo install -m 755 /tmp/wp /usr/local/bin/wp
sudo mkdir -p /srv/wordpress /srv/restore/final /srv/backups
sudo chown www-data:www-data /srv/wordpress /srv/backups && sudo chown -R $USER /srv/restore
```
Caddy from its apt repository ([caddyserver.com/docs/install](https://caddyserver.com/docs/install), "Debian, Ubuntu"),
then let it reach PHP: `sudo usermod -aG www-data caddy && sudo systemctl restart caddy`.

Database (pick a long random password; it goes only into `wp-config.php`):
```bash
sudo mariadb -e "CREATE DATABASE wdlocks CHARACTER SET utf8mb4;
  CREATE USER 'wdlocks_wp'@'localhost' IDENTIFIED BY '<password>';
  GRANT ALL ON wdlocks.* TO 'wdlocks_wp'@'localhost';"
```

## 4. WordPress rehearsal (18 Nov backup, on `new.wdlocks.co.uk`)

A practice run of the restore. The copy lives at `new.wdlocks.co.uk` and **must not talk to customers or outside
services**. Everything done to its database here is thrown away at go-live, when the fresh backup replaces it.

1. Copy the 18 backup files from the Mac to `/srv/restore/` with `scp` (one `-db.gz` only; the folder on the Mac also
   holds two duplicates). Then, with `WP="sudo -u www-data wp --path=/srv/wordpress"`:
   ```bash
   $WP core download --version=7.1.5 --locale=en_GB        # the version in the backup's first lines
   $WP config create --dbname=wdlocks --dbuser=wdlocks_wp --prompt=dbpass
   $WP config set DISABLE_WP_CRON true --raw
   $WP config set WPMS_ON true --raw && $WP config set WPMS_DO_NOT_SEND true --raw   # WP Mail SMTP sends nothing
   cd /srv/restore
   for z in *-plugins*.zip *-themes.zip *-uploads*.zip *-mu-plugins.zip; do sudo -u www-data unzip -oq "$z" -d /srv/wordpress/wp-content; done
   sudo -u www-data unzip -oq *-others.zip 'languages/*' -d /srv/wordpress/wp-content
   gunzip -c *-db.gz | $WP db import -
   ```
   If Tomia sent `wp-config.php`, copy across its custom `define(...)` lines (not the database lines or keys).
2. Silence the copy and give it its test address, before any browser reaches it:
   ```bash
   $WP plugin deactivate worker woocommerce-payments woocommerce-paypal-payments google-listings-and-ads \
     facebook-for-woocommerce feedoptimise woo-product-feed-pro google-site-kit --skip-plugins --skip-themes
   $WP search-replace 'https://wdlocks.co.uk' 'https://new.wdlocks.co.uk' --all-tables --skip-columns=guid --skip-plugins --skip-themes
   ```
3. Check after phase 5 puts Caddy in front: log in at `https://new.wdlocks.co.uk/wp-admin/`, open an order, a product
   and Media; `https://new.wdlocks.co.uk/wp-json/wc/store/v1/products` answers; WooCommerce → Status shows no red rows.
   If the Store API answers 403 or 429 to the server, allow-list the server's IP in Bot Traffic Shield and CHEQ, and
   write down what was changed: it has to be repeated after the final restore.

Apache rules in the old `.htaccess` do not apply under Caddy. WordPress permalinks work without them; check the copy
of `.htaccess` for anything else (redirects, blocks) and decide whether it is still wanted.

## 5. Deploy the shop and test on `new.wdlocks.co.uk` (pretend payments)

1. As `wdlocks`, create an SSH key, add it to the GitHub repo as a **read-only deploy key**, then:
   ```bash
   sudo -u wdlocks git clone git@github.com:pritamnb/wdlocks-frontend.git /srv/wdlocks-frontend
   ```
2. `/srv/wdlocks-frontend/.env.production` (owner `wdlocks`, `chmod 600`):
   ```
   NEXT_PUBLIC_SITE_URL=https://new.wdlocks.co.uk
   NEXT_PUBLIC_WC_BASE=https://new.wdlocks.co.uk
   NEXT_PUBLIC_CHECKOUT_MODE=demo
   RESEND_API_KEY=…
   CONTACT_FROM=…
   CONTACT_TO=…
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=…
   TURNSTILE_SECRET_KEY=…
   ```
   `NEXT_PUBLIC_WC_BASE` points at the rehearsal copy, so the shop is tested against the WordPress it will really use.
   No Stripe or WooCommerce keys yet, so nothing real is created. This build says noindex and loads no Google tags
   (they switch on only when `NEXT_PUBLIC_SITE_URL` is `https://wdlocks.co.uk`).
3. `/etc/caddy/Caddyfile` (the final file: `wdlocks.co.uk` and `www` simply wait for their certificates until DNS moves).
   Check it with `caddy validate --config /etc/caddy/Caddyfile` (it has not been run on a server yet), then
   `sudo systemctl reload caddy`:
   ```
   (wordpress) {
   	root * /srv/wordpress
   	php_fastcgi unix//run/php/php8.3-fpm.sock
   	file_server
   }

   wdlocks.co.uk, new.wdlocks.co.uk {
   	encode zstd gzip

   	# Uploaded files are never run as code.
   	@uploadsphp path_regexp ^/wp-content/uploads/.*\.php$
   	@wordpress path /wp-admin /wp-admin/* /wp-login.php /wp-json /wp-json/* /wp-content/* /wp-includes/* /wp-cron.php /xmlrpc.php
   	@wcapi query wc-api=*
   	handle @uploadsphp {
   		respond 403
   	}
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
   WordPress now sees each visitor's real address directly; `?wc-api=` carries PayPal's callbacks.
4. Build and start (WordPress must already answer, because the build reads the catalogue from it):
   ```bash
   cd /srv/wdlocks-frontend && sudo -u wdlocks npm ci && sudo -u wdlocks npm run build
   sudo cp deploy/wdlocks-frontend.service /etc/systemd/system/
   sudo systemctl daemon-reload && sudo systemctl enable --now wdlocks-frontend
   ```
5. Add `new.wdlocks.co.uk` and `wdlocks.co.uk` to the Turnstile widget's allowed hostnames.
6. Test https://new.wdlocks.co.uk: every page type, product images (served through `/wp-content/`), basket, demo
   checkout, contact / trade / guarantee / crime forms, five old URLs, the WordPress checks in phase 4, then
   `node scripts/check-client-ip.mjs https://new.wdlocks.co.uk` (must end in `429`).

Releasing updates, now and after go-live:
```bash
cd /srv/wdlocks-frontend && sudo -u wdlocks git pull && sudo -u wdlocks npm ci \
  && sudo -u wdlocks npm run build && sudo systemctl restart wdlocks-frontend
```
At a quiet time. Roll back with `git checkout <previous commit>` and the same build and restart. Vercel keeps deploying
`main` to wdlocks-frontend.vercel.app as a staging copy (noindex, no tags).

## 6. Go-live (about 2 hours, quiet slot)

> **20 Nov:** the server side of this phase is now scripted: `wdlocks-golive restore | open | tls | frontend` on the VPS
> (`deploy/wdlocks-golive.sh`, order in `docs/go-live-confidence.md` section 4). The steps below remain the reference.

The old shop takes orders until the moment of the final backup, so the steps run in this order without a break.

1. **Old site:** fresh full UpdraftPlus backup, downloaded, copied to `/srv/restore/final/`. Then, **after** the backup,
   WooCommerce → Settings → Site visibility → **Coming soon**, so no order can land on the old server afterwards.
2. **Final restore** on the VPS. The database is replaced whole; files are laid over the rehearsal copy:
   ```bash
   cd /srv/restore/final
   for z in *-plugins*.zip *-themes.zip *-uploads*.zip *-mu-plugins.zip; do sudo -u www-data unzip -oq "$z" -d /srv/wordpress/wp-content; done
   $WP db reset --yes && gunzip -c *-db.gz | $WP db import -
   $WP config delete WPMS_ON && $WP config delete WPMS_DO_NOT_SEND
   $WP core version      # must match the backup's first lines; if not: $WP core update --version=<that version>
   ```
   The database now says `https://wdlocks.co.uk` again and every plugin is active as on the old site. Repeat any
   allow-listing noted in phase 4.
3. **WordPress scheduled tasks and nightly database copy**, `/etc/cron.d/wordpress`:
   ```
   */5 * * * * www-data /usr/local/bin/wp --path=/srv/wordpress cron event run --due-now --quiet
   15 2 * * *  www-data /usr/local/bin/wp --path=/srv/wordpress db export - | gzip > /srv/backups/wp-$(date +\%F).sql.gz
   45 2 * * *  www-data find /srv/backups -name 'wp-*.sql.gz' -mtime +14 -delete
   ```
4. **Live payments**, as `go-live-payments.md`: fill `.env.live` on the Mac, `node scripts/stripe-setup.mjs --target server --check`,
   then `--target server` (live webhook `https://wdlocks.co.uk/api/stripe/webhook`, wallet domain, writes `.env.server`).
   Merge `.env.server` into `.env.production`, add the WooCommerce keys, remove `NEXT_PUBLIC_CHECKOUT_MODE=demo`, set
   `NEXT_PUBLIC_SITE_URL=https://wdlocks.co.uk` and `NEXT_PUBLIC_WC_BASE=https://wdlocks.co.uk`, rebuild and restart.
   Until DNS moves, this build reads the catalogue from the old server, which holds the same data. If the old
   server's API does not answer in Coming soon mode and the build fails, do step 5 first and rebuild as soon as the
   certificate is issued.
5. **DNS**, in the Fasthosts panel: `@` and `www` A + AAAA → the VPS. Delete the `*` wildcard records. Caddy gets the
   certificates within a minute of the names resolving.
6. **Check straight away:** home, category, product, basket, one real low-value order (it appears in WooCommerce →
   Orders and the "New order" email arrives; refund it in Stripe and it should turn Refunded in WooCommerce),
   **WordPress admin login at https://wdlocks.co.uk/wp-admin/** (everyone signs in once more), WP Mail SMTP → Tools →
   Email Test, forms and their emails, five old URLs, `www` → apex, HTTPS, `check-client-ip.mjs https://wdlocks.co.uk`,
   then `node scripts/stripe-setup.mjs --target server --verify`.

**Rollback:** point `@` and `www` back to `185.151.30.155` / `2a07:7800::155` and switch Coming soon off on the old
site; with TTL 300 this takes about 5 minutes. Orders taken on the VPS in between exist only there and in Stripe, so
list them first (WooCommerce → Orders on the VPS) and re-enter them on the old site. Payments-only rollback: `go-live-payments.md`.

## 7. Tracking at launch (client's Tag Manager)

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

## 8. First week

1. Cyber Protect backup ran and a restore works; `/srv/backups` has a database copy for each night.
2. UptimeRobot (free) on `https://wdlocks.co.uk` and `https://wdlocks.co.uk/wp-json/`.
3. Search Console: still verified (tags carried over), submit `https://wdlocks.co.uk/sitemap.xml`, check the Pages report for 404s after two weeks.
4. DNS: TTL of `@` and `www` back to 3600. Add DMARC (`_dmarc` TXT `v=DMARC1; p=none; rua=mailto:<client mailbox>`) and
   Resend's records for the `CONTACT_FROM` domain (neither exists today).
5. Monthly, by a named person: `sudo apt upgrade`; WordPress, plugin and theme updates in wp-admin (after a backup);
   disk space; `journalctl -u wdlocks-frontend`. Tomia no longer does any of this.

## 9. Leaving Tomia (after two stable weeks)

1. Remove what gave the old host access: the **ManageWP Worker** plugin (if the ManageWP account is Tomia's), any
   Tomia WordPress admin users, and the `ftp` DNS record.
2. Change the secrets that sat in the database on their server: the `noreply@wdlocks.co.uk` mailbox password (then
   update it in WP Mail SMTP), the PayPal API credentials, and the shop's WooCommerce REST key (make a new one in
   wp-admin, put it in `.env.production`, restart, delete the old one). The database password and WordPress keys are already new.
3. The client cancels **only the wdlocks.co.uk package** with Tomia, in writing, within the notice period. After that
   there is no rollback to the old server: keep the final UpdraftPlus backup.
4. Cancel what is no longer used at Fasthosts once the client confirms: the old VPS XL (if a new server was bought) and
   the leftover "Ultimate additional site" hosting package for wdlocks.co.uk.

Separate, not needed for the move: the `msoid` CNAME is, according to Microsoft, only for Microsoft 365 operated by
21Vianet and otherwise blocks Office activation
([Microsoft](https://learn.microsoft.com/en-us/microsoft-365/enterprise/external-domain-name-system-records)). The client's IT may want it removed.
