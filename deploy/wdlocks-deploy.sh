#!/usr/bin/env bash
# Release script for the Next.js storefront on the Fasthosts VPS.
# Installed as /usr/local/sbin/wdlocks-deploy (root:root 0755). GitHub Actions never runs this directly:
# it pipes `git archive` of one commit over SSH to the deploy user, whose key may only run
# /usr/local/sbin/wdlocks-deploy-gate, which calls this script through sudo.
#
#   wdlocks-deploy <environment> <40-char commit sha>   < release.tar.gz
#
# Each release is unpacked into its own folder, built on the server (the build prerenders product pages
# from the WordPress on this box), switched live by moving the `current` symlink, health-checked, and
# rolled back to the previous release if any check fails. The last 5 releases are kept.
set -euo pipefail

die() { echo "deploy: $*" >&2; exit 1; }

ENV_NAME="${1:-}"
SHA="${2:-}"

case "$ENV_NAME" in
  staging)
    BASE=/srv/wdlocks-staging
    UNIT=wdlocks-staging
    # Staging code arrives automatically from GitHub, so it builds and runs as its own user, which cannot read
    # anything of production's (/srv/wdlocks-production is root:wdlocks 0750).
    APP_USER=wdlocks-stg
    PORT=3001
    PUBLIC_URL=https://ip79-99-44-153.pbiaas.com
    ;;
  production)
    # wdlocks.co.uk resolves to this server's own public IP, 79.99.44.153 (/etc/hosts), and Caddy serves it with a real
    # Let's Encrypt certificate (issued before go-live by DNS check). Not 127.0.0.1: Next 16's image optimiser refuses
    # local addresses, so every WooCommerce photo would fail with "url parameter is not allowed". So these checks test the production setup here, before and after DNS.
    BASE=/srv/wdlocks-production
    UNIT=wdlocks-production
    APP_USER=wdlocks
    PORT=3000
    PUBLIC_URL=https://wdlocks.co.uk
    ;;
  *) die "unknown environment '$ENV_NAME'" ;;
esac
[[ "$SHA" =~ ^[0-9a-f]{40}$ ]] || die "commit sha must be 40 lowercase hex characters"

KEEP=5
MAX_UPLOAD_BYTES=$((200 * 1024 * 1024))

exec 9>"/run/lock/wdlocks-deploy-$ENV_NAME.lock"
flock -n 9 || die "another $ENV_NAME deploy is already running"

[ -f "$BASE/shared/.env.production" ] || die "$BASE/shared/.env.production is missing"

STAMP=$(date -u +%Y%m%d-%H%M%S)
REL="$BASE/releases/$STAMP-${SHA:0:12}"
PREV=$(readlink -f "$BASE/current" 2>/dev/null || true)

# Root never follows a symlink the upload or the app user controls (security review, 21 Nov 2026). The upload and every
# earlier release are untrusted: staging code arrives automatically from GitHub, and a release folder belongs to the app
# user once it is built. So:
#  - releases/ is root-owned (the app user can read its releases but not swap one for a symlink);
#  - the new release is unpacked into a root-owned folder, and an upload containing any symlink is refused before root
#    writes anything into it (the repository has none; git archive would keep them);
#  - root only writes two names it creates itself; the folder is handed to the app user after that;
#  - the build cache is copied from the previous release by the app user, never by root;
#  - root never reads a file inside a release (the rollback message uses the folder name, which holds the commit).
chown root:"$APP_USER" "$BASE/releases"
chmod 750 "$BASE/releases"

echo "==> $ENV_NAME: unpacking ${SHA:0:12} into $REL"
mkdir -m 755 "$REL"
head -c "$MAX_UPLOAD_BYTES" | tar -xz -C "$REL" --no-same-owner --no-same-permissions
links=$(find "$REL" -type l -printf '%P -> %l\n' | head -5)
if [ -n "$links" ]; then
  rm -rf -- "$REL"
  die "upload contains symlinks, refused: ${links//$'\n'/; }"
fi
[ -f "$REL/package.json" ] || { rm -rf -- "$REL"; die "upload did not contain package.json"; }
rm -rf -- "$REL/.env.production" "$REL/.deployed-commit" "$REL/.next"
ln -sT "$BASE/shared/.env.production" "$REL/.env.production"
printf '%s\n' "$SHA" > "$REL/.deployed-commit"
chown -hR "$APP_USER:$APP_USER" "$REL"

run_as_app() {
  runuser -u "$APP_USER" -- env -i \
    PATH=/usr/local/bin:/usr/bin:/bin \
    HOME="$BASE/shared" \
    npm_config_cache="$BASE/shared/.npm" \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt \
    bash -c "$1"
}

# Reuse the previous build cache so unchanged pages and images are not rebuilt from scratch. Done as the app user: the
# previous release is the app user's, so it can only copy what that user may read anyway. Best effort.
if [ -n "$PREV" ] && [ -d "$PREV" ]; then
  run_as_app "cd '$REL' && mkdir .next && [ -d '$PREV/.next/cache' ] && cp -a '$PREV/.next/cache' .next/cache" || true
fi

echo "==> $ENV_NAME: npm ci and next build (as $APP_USER)"
run_as_app "cd '$REL' && npm ci --no-audit --no-fund && npm run build"

switch_to() {
  ln -sfn "$1" "$BASE/current.next"
  mv -Tf "$BASE/current.next" "$BASE/current"
  systemctl restart "$UNIT"
}

check() { # check <url> [extra curl args...]: expects HTTP 200
  local url="$1"; shift
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 "$@" "$url" || true)
  echo "    $code  $url"
  [ "$code" = "200" ]
}

healthy() {
  local i
  for i in $(seq 1 30); do # up to 60 s for next start to come up
    curl -s -o /dev/null --max-time 5 "http://127.0.0.1:$PORT/" && break
    sleep 2
  done
  local slug
  slug=$(curl -s --max-time 15 "$PUBLIC_URL/wp-json/wc/store/v1/products?per_page=1" | jq -r '.[0].slug // empty' || true)
  [ -n "$slug" ] || { echo "    could not read a product slug from the Store API"; return 1; }
  check "http://127.0.0.1:$PORT/" &&
    check "http://127.0.0.1:$PORT/products/$slug" &&
    check "$PUBLIC_URL/" &&
    check "$PUBLIC_URL/products/$slug" &&
    check "$PUBLIC_URL/wp-login.php"
}

echo "==> $ENV_NAME: switching live to ${SHA:0:12}"
switch_to "$REL"

echo "==> $ENV_NAME: health checks"
if ! healthy; then
  if [ -n "$PREV" ] && [ -d "$PREV" ]; then
    echo "==> $ENV_NAME: health check FAILED, rolling back to $(basename "$PREV")"
    switch_to "$PREV"
    healthy || echo "    previous release is not healthy either: check 'journalctl -u $UNIT'"
  fi
  die "release ${SHA:0:12} failed its health checks"
fi

echo "==> $ENV_NAME: pruning old releases (keeping $KEEP)"
CURRENT=$(readlink -f "$BASE/current")
{ ls -1dt "$BASE"/releases/*/ | sed 's:/$::' | grep -vxF "$CURRENT" || true; } | tail -n +"$KEEP" | while read -r old; do
  rm -rf -- "$old"
done

echo "==> $ENV_NAME: live on ${SHA:0:12}"
