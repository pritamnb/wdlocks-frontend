# Deploy pipeline (Fasthosts VPS)

| Branch | Environment | Address | How |
|---|---|---|---|
| `dev` | staging | https://ip79-99-44-153.pbiaas.com | automatic on every push (`.github/workflows/deploy-staging.yml`) |
| `main` | production | https://wdlocks.co.uk | by hand for now (below); prepared on the VPS 20 Nov, DNS still points at Tomia |

Work goes into `dev` (PR or push). When staging looks right, merge `dev` into `main`.
Pushes to `main` still deploy Vercel; that is unrelated to the VPS.

## What a deploy does

```text
GitHub Actions (push to dev)
  git archive <sha> | ssh deploy@79.99.44.153 "deploy <sha>"
    /usr/local/sbin/wdlocks-deploy-gate staging     forced command; accepts only "deploy <40-char sha>"
      sudo /usr/local/sbin/wdlocks-deploy staging <sha>
        unpack into /srv/wdlocks-staging/releases/<time>-<sha>
        link shared/.env.production, reuse previous .next/cache
        npm ci && npm run build                     as user wdlocks-stg; build reads WordPress over HTTP
        current -> new release, restart wdlocks-staging (127.0.0.1:3001)
        health checks: / and a product page (local and via Caddy), /wp-login.php
        on failure: current -> previous release, restart, job fails
        keep the newest 5 releases
```

A build failure never touches the live site (the switch happens after the build). A typical deploy takes about 1.5 minutes.

## Server layout

```text
/srv/wdlocks-staging/
  current -> releases/20261120-122744-1223e6bb7e83
  releases/            last 5 releases
  shared/.env.production   NEXT_PUBLIC_* are baked in at build time: redeploy after changing them
  shared/.npm              npm cache
/etc/systemd/system/wdlocks-staging.service   (deploy/wdlocks-staging.service)
/usr/local/sbin/wdlocks-deploy, wdlocks-deploy-gate   (deploy/*.sh; copy by hand when they change)
/etc/sudoers.d/wdlocks-deploy   deploy ALL=(root) NOPASSWD: /usr/local/sbin/wdlocks-deploy
/home/deploy/.ssh/authorized_keys   command="/usr/local/sbin/wdlocks-deploy-gate staging",restrict <key>
```

Caddy (`/etc/caddy/Caddyfile`) sends WordPress paths to PHP and everything else to 127.0.0.1:3001.
The old single-folder copy in `/srv/wdlocks-frontend` (unit `wdlocks-frontend`) is stopped and disabled; port 3000 now belongs to production.

## Who can read what (separated 20 Nov 2026)

The only secret in GitHub is the staging deploy key, and anything it deploys is code that runs on this server. So
staging code builds and runs as **its own user, `wdlocks-stg`**, which cannot read anything of production's. Production
runs as `wdlocks`. No shop secret (Stripe, WooCommerce, database, email) is stored in GitHub.

| Path | Owner, mode | Who can read it |
|---|---|---|
| `/srv/wdlocks-production` (incl. `shared/.env.production` with the live keys) | `root:wdlocks 0750`, file `0640` | root, `wdlocks` |
| `/srv/wdlocks-staging` | `root:wdlocks-stg 0750`, contents `wdlocks-stg` | root, `wdlocks-stg` |
| `/srv/wordpress`, `/srv/wordpress-staging` | `www-data:www-data 0750`, `wp-config.php 0640` | root, PHP (`www-data`), Caddy (in group `www-data`) |
| `/srv/restore` (backup files for `wdlocks-golive restore`), `/srv/backups` | `root 0700` | root |
| `/etc/caddy/certs` | `root:caddy 0750`, key `0640` | root, Caddy |

On top of that, the staging unit has `ProtectHome=true` and `InaccessiblePaths=` for production, WordPress, the backups
and `/root`. Checked on 20 Nov by trying, as `wdlocks-stg`, to read the production settings, both `wp-config.php`
files, the backups, the restore folder, the certificate key and the database: all refused.

## GitHub secrets

| Secret | Value |
|---|---|
| `STAGING_SSH_KEY` | private half of the `github-actions-staging` ed25519 key (exists only in GitHub) |
| `STAGING_KNOWN_HOSTS` | `ssh-keyscan 79.99.44.153` output, checked against the server's own host keys |

To rotate the key: generate a new pair, replace the line in `/home/deploy/.ssh/authorized_keys`, update `STAGING_SSH_KEY`.

## Common tasks

- **Redeploy without a code change** (for example after editing `.env.production`): Actions → Deploy to staging → Run workflow → branch `dev`.
- **Roll back by hand:** `ls -t /srv/wdlocks-staging/releases`, then
  `ln -sfn /srv/wdlocks-staging/releases/<older> /srv/wdlocks-staging/current && systemctl restart wdlocks-staging`.
- **Logs:** `journalctl -u wdlocks-staging -f`; deploy output is in the Actions run.

## Production (prepared 20 Nov 2026, not live)

```text
wdlocks.co.uk, www  (Caddy; www → apex)            DNS still at Tomia/20i → 185.151.30.155, so nobody reaches this yet
  WordPress paths  → /srv/wordpress           database `wdlocks`         = copy of the live shop (18 Nov backup)
  everything else  → production_frontend      Next.js 127.0.0.1:3000 (unit wdlocks-production), or WordPress in an emergency
ip79-99-44-153.pbiaas.com (staging)
  WordPress paths  → /srv/wordpress-staging   database `wdlocks_staging` = test copy, guard + trimmed plugins
  everything else  → Next.js 127.0.0.1:3001   (unit wdlocks-staging)
```

**Deploy main to production** (from a checkout, as root over SSH; same script and health checks as staging):

```bash
sha=$(git rev-parse origin/main); git archive --format=tar.gz origin/main | ssh root@79.99.44.153 "/usr/local/sbin/wdlocks-deploy production $sha"
```

Settings: `/srv/wdlocks-production/shared/.env.production` (`NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_WC_BASE` =
`https://wdlocks.co.uk`, `NEXT_PUBLIC_CHECKOUT_MODE=demo` until the live Stripe keys go in).

**Why it already works without DNS:** on the server, `/etc/hosts` maps `wdlocks.co.uk` and `www` to 127.0.0.1, Caddy
serves both names with a real Let's Encrypt certificate issued before go-live by the DNS check (20 Nov 2026, files in
`/etc/caddy/certs/wdlocks.co.uk/`, expires 18 Feb 2027), so nothing special needs trusting. (Caddy's earlier internal
root stays in `/usr/local/share/ca-certificates/caddy-local-root.crt`, harmless.) So the build reads
the production WordPress on the same box and the health checks run against `https://wdlocks.co.uk`. The hosts line
stays after go-live (server-side calls stay local). To look from a Mac without touching DNS:
`curl --resolve wdlocks.co.uk:443:79.99.44.153 https://wdlocks.co.uk/`, or a hosts line `79.99.44.153 wdlocks.co.uk`
(the certificate is valid, so the browser does not warn; remove the line afterwards).

**The pre-issued certificate does not renew itself.** It was issued by `certbot --manual --preferred-challenges dns`
with two TXT records (`_acme-challenge`, `_acme-challenge.www`) added and then removed by hand at Fasthosts; the certbot
timer is disabled. After DNS points here, `wdlocks-golive tls` deletes the two pre-launch `tls` lines so Caddy fetches
and renews its own certificate. If Caddy cannot get one within 2 minutes, the script puts the pre-issued certificate
back. It must run before 18 Feb 2027; `wdlocks-golive status` shows the days left.

**The production WordPress is sealed until go-live:**

| Seal | Where | Lifted by |
|---|---|---|
| Pre-launch guard: no email, no outgoing HTTP except to this site, no webhooks, no Action Scheduler runner, noindex | `wp-content/mu-plugins/0-0-prelaunch-guard.php` (`deploy/prelaunch-guard.php`) | `wdlocks-golive open` |
| Firewall: PHP (user www-data) may only reach this machine, so plugins that bypass WordPress's HTTP functions are stopped too. Applies to staging WordPress as well | `/etc/ufw/before.rules`, block `wdlocks-php-egress` | `wdlocks-golive open` |
| `WPMS_ON` + `WPMS_DO_NOT_SEND`, `WP_ENVIRONMENT_TYPE=staging`, `DISABLE_WP_CRON` and no system cron | `wp-config.php` | `wdlocks-golive open` (cron via `/etc/cron.d/wordpress-production`) |
| Pre-issued certificate (valid, but does not renew) | Caddyfile `tls /etc/caddy/certs/…` ×2 | `wdlocks-golive tls`, once the Fasthosts nameservers point here |

`wdlocks-golive status` shows each one. The go-live order is in `docs/go-live-confidence.md` section 4.

**Emergency shop front** (rollback level A, no DNS change, nothing lost): `wdlocks-golive frontend wordpress` makes the
old Astra/Elementor shop serve every page from the same database; `wdlocks-golive frontend nextjs` switches back.
Tested 20 Nov: home, /shop/, a product page (£12.00) and /contact-us/ render on PHP 8.5 with all 34 live plugins.

**Nightly backup** (`deploy/wdlocks-backup.sh` → `/usr/local/sbin/wdlocks-backup`, 02:15 UTC): production database, its
wp-content + wp-config, and the server settings (Caddy, both `.env.production`, units, firewall, cron, our scripts).
Still on the same server: an off-server copy is a go-live gate.
