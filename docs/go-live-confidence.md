# wdlocks.co.uk: moving the live shop from Tomia to the Fasthosts VPS

Readiness check, backups and rollback. Written 20 Nov 2026. The step-by-step commands are in
`fasthosts-runbook.md` (phases 6, 8 and 9). This page answers three questions: is it safe, are the backups
good, and how do we switch back.

## Verdict

**The move is safe to do, but not today.** The hard part already works: the live WordPress database and files
restore cleanly onto the VPS (127 tables, 383 orders, 380 users), and the new shop runs on it with HTTPS. Six things
still need doing before go-live day. They are listed under "Before go-live". None of them is risky. They are checks
and a few settings.

The move can be reversed at every stage. Until Tomia is cancelled, the old site stays exactly as it is, and
switching back means changing two DNS records.

---

## 1. Backups: checked again today (20 Nov)

Folder: `~/Downloads/WD/migration/`

| Backup | What it contains | Check today | Result |
|---|---|---|---|
| UpdraftPlus, **18 Nov 19:42** (18 files, about 419 MB) | Database plus plugins, themes, uploads, mu-plugins, others | `gzip -t` on the database and `unzip -t` on all 17 zips | **All intact.** Database: 127 tables, WordPress 7.1.5, WooCommerce 11.3.0 (HPOS), 389 orders (newest #6254), 379 users, 1,206 posts, 2,288 comments. sha1 `67f799f0…` matches the value recorded on 18 Nov |
| Database copies "(1)" and "(2)" | Same file | sha1 | Identical to the original (duplicate downloads). Keep one as a spare or delete them |
| All-in-One WP Migration, **19 Nov 17:51** (`WP-Backup/…l0cxmm4ffer4.wpress`, 1.57 GB) | Database (56 MB, 390 orders, newest #6255) plus all of wp-content, including a copy of the server's `updraft/` folder | Walked every header to the end of the archive | **Intact**: 43,661 entries, end block exactly at the end of the file, no truncation. This is the copy the VPS was built from |
| VPS nightly backup (`/srv/backups`, 02:15 UTC) | Database, wp-content plus wp-config, server settings | Log | Last run 20 Nov, OK. A test restore matched exactly |

**What the backups do not contain** (all known, none blocking):
- `wp-config.php` and `.htaccess`. Both were read from wp-admin on 19 Nov: no custom settings, only standard rules. The VPS has its own.
- WordPress core files. These are downloaded fresh, the same version (7.1.5).
- Anything after 19 Nov 17:51. Orders keep arriving on the old site, so **a final backup is taken on go-live day**, after the shop is closed (runbook phase 6, step 1).

**Gaps to close:**
1. **Every copy is on this Mac.** Copy the folder to a second place: an external drive, or the client's OneDrive/SharePoint (they have Microsoft 365). One copy is not a backup.
2. **The VPS backups stay on the VPS.** Before the VPS becomes the live shop, they need a copy off the server: Fasthosts Cyber Protect (already paid since March 2024 but never set up), or a nightly copy to OneDrive or another server.

## 2. Backing up the old hosting account at Tomia (20i)

The live site runs on a 20i/StackCP account that Tomia manages (`/home/sites/2b/8/85d1d37e3c/public_html`,
database server `shareddb-c.hosting.stackcp.net`). You have no login there, so the only full copy of the account at
hosting level is one Tomia makes. Ask them for these once. It is a request for copies only; they change nothing.

| Ask Tomia for | Why | If they never send it |
|---|---|---|
| A **20i Backup/Restore ZIP** of the wdlocks.co.uk package with **Files and Databases** both ticked (Manage Hosting → Options → Manage → Web Files → Backup/Restore → Create Backup → Download; [20i docs](https://docs.20i.com/web-hosting/backup-restore-tool)) | The only backup that includes the whole `public_html`: wp-config.php, .htaccess, and any stray file outside wp-content | Our backups cover everything WordPress needs |
| A **DNS zone export** for wdlocks.co.uk | A full list of DNS records, including any name nobody has asked about | The record table in runbook phase 2, plus Microsoft 365 admin → Domains → DNS records |
| Confirmation that **Timeline Backups** run on the package, and how many days they keep | 20i keeps 30 days of web and database snapshots on that plan. It is a safety net on their side | Our own backups |
| Their **notice period** | Tomia is the switch-back target until we cancel | Assume one month |

**Not at Tomia, so nothing to back up there:**
- **Email.** The MX record points to Microsoft 365 (Outlook). Mailboxes, Teams and Intune do not change with the website. The rule is to copy those DNS records exactly and never edit them.
- **Customer accounts** (380 users, passwords stored hashed) and order history. Both are in the database backup and move with it. Customers log in with the same passwords.

**Accounts and licences to write down before go-live** (they are tied to the site, not the server):
- Elementor Pro ("Expert" plan), Astra Pro, Independent Analytics Pro (renews around April 2027), YITH filter. Licences are checked by domain. The domain stays the same, so they should keep working. Note the keys from each plugin's licence screen in case one asks to be activated again.
- Payments: the PayPal account connected in WooCommerce PayPal Payments, the WooPayments account, and Stripe (the new checkout).
- ManageWP. Someone has remote admin access through the ManageWP Worker plugin. Find out whose account it is (runbook phase 9 removes it if it belongs to Tomia).
- Admin users: pritam, "Bing" (born2web.co.uk, an outside agency), "Delower". Decide who keeps access.

## 3. Before go-live: gates

| # | Gate | Status |
|---|---|---|
| 1 | Backup copied off this Mac | To do (you) |
| 2 | Off-server backup for the VPS (Cyber Protect or a nightly copy to OneDrive) | To do |
| 3 | Rehearsal on the VPS, tested while logged in: wp-admin order, product and settings screens; one **demo** checkout from start to finish; WP Mail SMTP test email; contact and trade forms | Partly done (pages, API and login page checked on 20 Nov) |
| 4 | Live payment keys ready: `.env.live` filled, `stripe-setup.mjs --target server --check` passes (PR #16 merged 18 Nov) | To do (needs the client's live Stripe keys) |
| 5 | DNS TTL of `@` and `www` lowered to **300 seconds at least 24 hours before** go-live | To do (whoever holds the DNS) |
| 6 | Quiet slot agreed with the client, for example a weekday evening (about 2 hours) | To do |

**Production is set up on the VPS (20 Nov, later the same day)**, details in `deploy-pipeline.md` → "Production":
- `wdlocks.co.uk` and `www` are configured in Caddy with a **real Let's Encrypt certificate issued before go-live** (DNS check, 20 Nov). Visitors get a valid certificate the moment DNS points here, so there is no warning window.
- The production WordPress (`/srv/wordpress`) holds the **18 Nov live backup, restored with the exact go-live procedure**: 382 orders (newest #6254), 379 users, all 34 live plugins active on PHP 8.5, and no fatal errors.
- The production Next.js (`wdlocks-production`, port 3000) is built from `main` against that WordPress. All its pages return 200, prices match the live shop, and old URLs redirect.
- Staging now has its own WordPress copy and database, so staging tests never touch the production data.
- The production copy is sealed: no email, no outgoing calls (enforced in code and by the firewall), no cron. `wdlocks-golive open` lifts the seal.

Server notes:
- The VPS has **no IPv6 address**. At go-live the `@` and `www` **AAAA records must be deleted**, not edited. Otherwise visitors on IPv6 keep reaching the old Tomia site. To switch back, add them again (`2a07:7800::155`).
- Checkout runs in pretend mode until the live Stripe keys are added (gate 4). The contact and trade forms need their Resend and Turnstile keys in the production `.env.production`.

## 4. Go-live in one line per step

Server commands are `wdlocks-golive …` (`deploy/wdlocks-golive.sh`; `wdlocks-golive status` shows where things stand).

1. **Old site:** take a final UpdraftPlus backup and download it. **The old shop stays open** (no downtime, decided 20 Nov): the shop gets about one order a day, and any order placed on the old site between the backup and the DNS change is still paid through WooPayments and is picked up in step 6. From the backup on, nobody edits products, orders or settings in the old wp-admin. (Stricter option: WooCommerce → Settings → Site visibility → Coming soon, store pages only, closes the shop for about an hour instead.)
2. **VPS:** copy the files to `/srv/restore/final/`, then run `wdlocks-golive restore /srv/restore/final`. It checks every file, keeps a safety copy of the database, lays the files over, and replaces the database whole. Compare the order count it prints with the old site.
3. **VPS:** run `wdlocks-golive open` (removes the guard and firewall rule, turns email on, starts cron, sets environment = production). Add the live payment settings (`stripe-setup.mjs --target server`, docs/go-live-payments.md), remove `NEXT_PUBLIC_CHECKOUT_MODE=demo`, and redeploy `main` to production.
4. **DNS:** `@` and `www` A records to `79.99.44.153`; delete the AAAA records and the `*` wildcard. The certificate is already valid. When the Fasthosts nameservers answer with the VPS (a few minutes), run `wdlocks-golive tls` so Caddy takes over renewal; it checks the nameservers first and puts the pre-issued certificate back if Caddy cannot get its own.
5. **Check:** home page, product, basket, one real low-value order (then refund it), wp-admin login, email test, forms, five old URLs.
6. **Old site, right after the switch and again after 48 hours:** look for orders newer than the last one restored. Copy any across (or fulfil them from the old wp-admin). After 48 hours, set the old site to Coming soon.

## 5. Switching back: three levels

| Problem | What to do | Time | Data |
|---|---|---|---|
| **A. Only the new front end is broken** (pages, basket or checkout misbehave) | On the VPS, run `wdlocks-golive frontend wordpress`. The old Astra/Elementor shop is then live again **on the same server and database**. No DNS change. `wdlocks-golive frontend nextjs` switches back | Seconds | **Nothing lost**: same database, so orders, stock and customers stay in one place. The old checkout plugins (PayPal, WooPayments) return with the final restore. Tested 20 Nov on the production copy: home, /shop/, a product page and /contact-us/ all rendered |
| **B. The server or platform is the problem** (VPS down, WordPress broken after the restore) | 1. List the orders placed on the VPS since go-live (WooCommerce → Orders, newer than the last old order number). 2. At the DNS host: `@` and `www` A back to `185.151.30.155`, AAAA `2a07:7800::155` added again. 3. Old site: switch Coming soon off. 4. Enter the listed orders again on the old site, and redo any product or price edits made since go-live | About 5 minutes (TTL 300) plus re-entering orders | Orders placed on the VPS exist only there and in Stripe until they are re-entered. That is why the old site must not be changed or cancelled during this period |
| **C. After Tomia is cancelled** | Restore the final UpdraftPlus backup, or the latest VPS nightly backup, onto any WordPress host, then point DNS at it | Hours | Back to the last backup. This is why both off-machine copies (gates 1 and 2) matter |

Rules that keep switching back possible:
- **Do not cancel Tomia** until two stable weeks have passed (runbook phase 9). Until then it is level B.
- **Do not edit the old site** after go-live, except to switch Coming soon off when switching back.
- **Keep the TTL at 300** for those two weeks. Raise it to 3600 afterwards.
- **Who presses the DNS button matters.** Today the zone is in Tomia's 20i account, so Tomia would make both the go-live change and any switch back. Runbook phase 2 (moving the zone to Fasthosts) puts both in your hands. Your choice; switching back works the same either way. One fact to plan for: when the Tomia package is cancelled, the 20i zone goes with it, so DNS has to live somewhere else before cancellation.

## 6. What published guidance says, and how this plan matches it

| Guidance | Source | In this plan |
|---|---|---|
| If the domain stays the same, moving means copying the files and the database. Never change the `guid` column; when URLs change, use `wp search-replace` with `--skip-columns=guid` | [WordPress handbook: Migrating](https://developer.wordpress.org/advanced-administration/upgrade/migrating/) | The final restore keeps `https://wdlocks.co.uk`, so the database needs no URL change. The test copy used wp-cli search-replace |
| Lower the TTL to 300 seconds 24–48 hours ahead. Keep the old host running. Switching back is "one low-TTL DNS change" | [HostAccent](https://www.hostaccent.com/blog/migrate-wordpress-new-host-without-downtime), [UltraWebHosting](https://www.ultrawebhosting.com/guides/migrate-cpanel-website-without-downtime) | Gate 5, rule "do not cancel Tomia" |
| WooCommerce: close the old store between the final copy and the DNS change, or orders land on the stale server. Payment webhooks follow the domain, but check them after the switch. Do not let Action Scheduler or cron run on both servers. Make caches skip the basket and checkout. Check that email still passes SPF and DKIM | [Urumi: WooCommerce without downtime](https://urumi.ai/blog/migrate-woocommerce-hosting-without-downtime/), [Bluehost](https://www.bluehost.com/blog/how-move-your-wordpress-website-without-downtime/) | Coming soon right after the final backup. Webhooks keep the same URL. Cron is enabled only on the VPS, and the old site stays closed. No page cache sits in front of the checkout. Mail goes through Microsoft 365 SMTP, which is unchanged |
| WooPayments may go into "Safe Mode" if it sees the same account on two sites | [WooCommerce: WooPayments site migrations](https://woocommerce.com/document/woopayments/account-management/site-migrations/) | The test copy has no payment plugins. After go-live only the VPS is open. If Safe Mode appears, follow that page |
| 20i: manual backup of Files plus Databases as a ZIP; 30 days of automatic snapshots | [20i docs](https://docs.20i.com/web-hosting/backup-restore-tool) | Section 2, request to Tomia |
