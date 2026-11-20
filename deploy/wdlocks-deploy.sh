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
    PORT=3001
    PUBLIC_URL=https://ip79-99-44-153.pbiaas.com
    ;;
  production)
    # Until go-live, wdlocks.co.uk resolves to 127.0.0.1 on this server (/etc/hosts) and Caddy serves it with its
    # own internal certificate, which the server trusts. So these checks already test the production setup here.
    BASE=/srv/wdlocks-production
    UNIT=wdlocks-production
    PORT=3000
    PUBLIC_URL=https://wdlocks.co.uk
    ;;
  *) die "unknown environment '$ENV_NAME'" ;;
esac
[[ "$SHA" =~ ^[0-9a-f]{40}$ ]] || die "commit sha must be 40 lowercase hex characters"

APP_USER=wdlocks
KEEP=5
MAX_UPLOAD_BYTES=$((200 * 1024 * 1024))

exec 9>"/run/lock/wdlocks-deploy-$ENV_NAME.lock"
flock -n 9 || die "another $ENV_NAME deploy is already running"

[ -f "$BASE/shared/.env.production" ] || die "$BASE/shared/.env.production is missing"

STAMP=$(date -u +%Y%m%d-%H%M%S)
REL="$BASE/releases/$STAMP-${SHA:0:12}"
PREV=$(readlink -f "$BASE/current" 2>/dev/null || true)

echo "==> $ENV_NAME: unpacking ${SHA:0:12} into $REL"
mkdir -p "$REL"
head -c "$MAX_UPLOAD_BYTES" | tar -xz -C "$REL" --no-same-owner
[ -f "$REL/package.json" ] || die "upload did not contain package.json"
ln -s "$BASE/shared/.env.production" "$REL/.env.production"
echo "$SHA" > "$REL/.deployed-commit"
# Reuse the previous build cache so unchanged pages and images are not rebuilt from scratch.
if [ -n "$PREV" ] && [ -d "$PREV/.next/cache" ]; then
  mkdir -p "$REL/.next"
  cp -a "$PREV/.next/cache" "$REL/.next/cache"
fi
chown -R "$APP_USER:$APP_USER" "$REL"

echo "==> $ENV_NAME: npm ci and next build (as $APP_USER)"
runuser -u "$APP_USER" -- env -i \
  PATH=/usr/local/bin:/usr/bin:/bin \
  HOME="$BASE/shared" \
  npm_config_cache="$BASE/shared/.npm" \
  NEXT_TELEMETRY_DISABLED=1 \
  NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt \
  bash -c "cd '$REL' && npm ci --no-audit --no-fund && npm run build"

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
    echo "==> $ENV_NAME: health check FAILED, rolling back to $(cat "$PREV/.deployed-commit" 2>/dev/null || echo "$PREV")"
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
