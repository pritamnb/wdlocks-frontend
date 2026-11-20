# Deploy pipeline (Fasthosts VPS)

| Branch | Environment | Address | How |
|---|---|---|---|
| `dev` | staging | https://ip79-99-44-153.pbiaas.com | automatic on every push (`.github/workflows/deploy-staging.yml`) |
| `main` | production | https://wdlocks.co.uk | not set up yet: a manual button, added at go-live |

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
        npm ci && npm run build                     as user wdlocks; build reads WordPress on the same box
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
The old single-folder copy in `/srv/wdlocks-frontend` (unit `wdlocks-frontend`, port 3000) is stopped and disabled, kept only as a fallback.

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
