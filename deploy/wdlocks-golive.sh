#!/usr/bin/env bash
# Go-live switches for wdlocks.co.uk on the Fasthosts VPS. Installed as /usr/local/sbin/wdlocks-golive (root:root 0755).
#
# Before go-live the production slot is a sealed copy of the live shop: a pre-launch guard (mu-plugin) and a firewall
# rule stop WordPress from emailing anyone or calling PayPal / WooPayments / ManageWP / Google / Meta, and WordPress
# cron is off. Each step below lifts one of those, in the order of docs/fasthosts-runbook.md phase 6.
#
# Certificate: Caddy serves wdlocks.co.uk and www with a real Let's Encrypt certificate that was issued BEFORE go-live
# by the DNS check (certbot, TXT records added by hand at Fasthosts, 20 Nov 2026; files in /etc/caddy/certs/). So the
# moment DNS points here, visitors get a valid certificate. That certificate does not renew itself (expires 18 Feb 2027):
# `wdlocks-golive tls` hands renewal to Caddy once DNS points here.
#
#   wdlocks-golive status                  what is still sealed
#   wdlocks-golive restore <dir>           1. final UpdraftPlus backup (db.gz + zips in <dir>) replaces the copy
#   wdlocks-golive open                    2. unseal WordPress: guard + firewall off, email on, cron on
#   wdlocks-golive tls                     3. AFTER DNS points here (any time before Feb 2027): Caddy renews the certificate itself
#   wdlocks-golive frontend wordpress      emergency: old WordPress shop front for every page (same database)
#   wdlocks-golive frontend nextjs         back to the new Next.js shop front
set -euo pipefail

WPD=/srv/wordpress
WP=(sudo -u www-data /usr/local/bin/wp --path="$WPD")
GUARD="$WPD/wp-content/mu-plugins/0-0-prelaunch-guard.php"
GUARD_SRC=/usr/local/share/wdlocks/0-0-prelaunch-guard.php
CADDYFILE=/etc/caddy/Caddyfile
FRONTEND=/etc/caddy/production-frontend.caddy
CRON=/etc/cron.d/wordpress-production
UFW=/etc/ufw/before.rules

die() { echo "golive: $*" >&2; exit 1; }
say() { echo "==> $*"; }
[ "$(id -u)" = 0 ] || die "run as root"

reload_caddy() {
  caddy validate --config "$CADDYFILE" --adapter caddyfile >/dev/null 2>&1 || die "Caddyfile does not validate; nothing reloaded"
  systemctl reload caddy
}

PRELAUNCH_TLS='^[[:space:]]*tls (internal|/etc/caddy/certs/)'
MANUAL_CERT=/etc/caddy/certs/wdlocks.co.uk/fullchain.pem

served_cert() { # served_cert <openssl x509 option...>: the certificate Caddy is serving for wdlocks.co.uk right now
  echo | openssl s_client -connect 127.0.0.1:443 -servername wdlocks.co.uk 2>/dev/null | openssl x509 -noout "$@" 2>/dev/null || true
}

cert_state() {
  if grep -Eq '^[[:space:]]*tls internal' "$CADDYFILE"; then
    echo "INTERNAL (browsers will warn)"
  elif grep -Eq "$PRELAUNCH_TLS" "$CADDYFILE"; then
    local end; end=$(openssl x509 -in "$MANUAL_CERT" -noout -enddate | cut -d= -f2)
    local days=$(( ($(date -d "$end" +%s) - $(date +%s)) / 86400 ))
    echo "pre-issued Let's Encrypt, does NOT renew, $days days left (run 'tls' after DNS)"
  else
    echo "automatic (Caddy renews), $(served_cert -issuer | sed 's/.*CN *= *//')"
  fi
}

cmd_status() {
  printf '%-28s %s\n' "pre-launch guard (mu-plugin)" "$([ -f "$GUARD" ] && echo ON || echo off)"
  printf '%-28s %s\n' "PHP egress firewall" "$(grep -q 'BEGIN wdlocks-php-egress' "$UFW" && echo ON || echo off)"
  printf '%-28s %s\n' "WP Mail SMTP do-not-send" "$("${WP[@]}" config has WPMS_DO_NOT_SEND --skip-plugins --skip-themes 2>/dev/null && echo ON || echo off)"
  printf '%-28s %s\n' "WordPress cron" "$([ -f "$CRON" ] && echo on || echo OFF)"
  printf '%-28s %s\n' "certificate" "$(cert_state)"
  printf '%-28s %s\n' "shop front" "$(grep -q reverse_proxy "$FRONTEND" && echo nextjs || echo WORDPRESS)"
  printf '%-28s %s\n' "checkout mode" "$(grep -E '^NEXT_PUBLIC_CHECKOUT_MODE=' /srv/wdlocks-production/shared/.env.production | cut -d= -f2 || true)"
  printf '%-28s %s\n' "siteurl" "$("${WP[@]}" option get siteurl --skip-plugins --skip-themes)"
  printf '%-28s %s\n' "orders / newest" "$("${WP[@]}" db query 'select count(*), max(id) from wp_wc_orders where type="shop_order"' --skip-column-names --skip-plugins --skip-themes | tr '\t' ' ')"
}

cmd_restore() {
  local dir="${1:-}"
  [ -d "$dir" ] || die "usage: wdlocks-golive restore <folder with the UpdraftPlus files>"
  local db; db=$(ls "$dir"/*-db.gz 2>/dev/null | head -1)
  [ -n "$db" ] || die "no *-db.gz in $dir"
  [ -f "$GUARD" ] || die "the guard is already off: restoring now would let the restored plugins act. Re-install it first."
  say "checking the backup files"
  gzip -t "$db"
  local z; for z in "$dir"/*.zip; do unzip -tq "$z" >/dev/null || die "$z is damaged"; done
  head -c 2000 < <(gunzip -c "$db") | grep -E '^# (Generated|WordPress Version|Backup of)' || true

  say "safety copy of the current database"
  local safety="/srv/backups/db/pre-restore-$(date +%F-%H%M).sql.gz"
  mariadb-dump --single-transaction --quick wdlocks | gzip > "$safety" && echo "    $safety"

  say "files: laying plugins, themes, uploads, mu-plugins, others over wp-content"
  for z in "$dir"/*-plugins*.zip "$dir"/*-themes.zip "$dir"/*-uploads*.zip "$dir"/*-mu-plugins.zip "$dir"/*-others.zip; do
    [ -f "$z" ] && unzip -oq "$z" -d "$WPD/wp-content"
  done
  install -o www-data -g www-data -m 644 "$GUARD_SRC" "$GUARD"   # the guard stays until `open`
  chown -R www-data:www-data "$WPD/wp-content"

  say "database: replacing it whole"
  "${WP[@]}" db reset --yes --quiet --skip-plugins --skip-themes
  gunzip -c "$db" | "${WP[@]}" db import - --quiet --skip-plugins --skip-themes
  "${WP[@]}" cache flush --skip-plugins --skip-themes --quiet 2>/dev/null || true
  cmd_status
  echo "Next: compare 'orders / newest' with WooCommerce > Orders on the old site, then: wdlocks-golive open"
}

cmd_open() {
  say "removing the pre-launch guard"
  rm -f "$GUARD"
  say "removing the PHP egress firewall rule"
  if grep -q 'BEGIN wdlocks-php-egress' "$UFW"; then
    sed -i '/# BEGIN wdlocks-php-egress/,/# END wdlocks-php-egress/d' "$UFW"
    ufw reload >/dev/null
  fi
  say "email on (WP Mail SMTP uses its own settings from the database), environment = production"
  "${WP[@]}" config delete WPMS_DO_NOT_SEND --skip-plugins --skip-themes 2>/dev/null || true
  "${WP[@]}" config delete WPMS_ON --skip-plugins --skip-themes 2>/dev/null || true
  "${WP[@]}" config set WP_ENVIRONMENT_TYPE production --skip-plugins --skip-themes --quiet
  say "WordPress cron every 5 minutes"
  cat > "$CRON" <<'EOF'
# WordPress scheduled tasks for wdlocks.co.uk (WP-cron itself is off: DISABLE_WP_CRON in wp-config.php).
*/5 * * * * www-data /usr/local/bin/wp --path=/srv/wordpress cron event run --due-now --quiet
EOF
  chmod 644 "$CRON"
  cmd_status
  echo "Next: live payment settings + redeploy (docs/go-live-payments.md), then DNS, then: wdlocks-golive tls"
}

cmd_tls() {
  grep -Eq "$PRELAUNCH_TLS" "$CADDYFILE" || { say "Caddy already manages the certificate: $(cert_state)"; return 0; }
  # Let's Encrypt asks the domain's own nameservers, so check those (a public resolver can hold the old answer for an hour).
  local me; me=$(curl -s -4 --max-time 10 https://api.ipify.org || true)
  [ -n "$me" ] || die "could not find this server's public IP"
  local ns host ip
  for ns in ns1.livedns.co.uk ns2.livedns.co.uk ns3.livedns.co.uk; do
    for host in wdlocks.co.uk www.wdlocks.co.uk; do
      ip=$(dig +short A "$host" @"$ns" | tail -1)
      [ "$ip" = "$me" ] || die "$ns says $host = '${ip}', this server is '${me}'. Point DNS here first."
    done
    [ -z "$(dig +short AAAA wdlocks.co.uk @"$ns")" ] || die "$ns still has an AAAA (IPv6) record for wdlocks.co.uk: delete it first."
  done

  say "handing the wdlocks.co.uk certificate to Caddy (it fetches its own and renews it)"
  local before; before=$(served_cert -serial)
  local backup; backup="$CADDYFILE.bak-$(date +%Y%m%d-%H%M%S)-pre-tls"
  cp -a "$CADDYFILE" "$backup"
  sed -i -E "\#$PRELAUNCH_TLS#d" "$CADDYFILE"
  reload_caddy
  local i serial="" issuer=""
  for i in $(seq 1 30); do
    serial=$(served_cert -serial); issuer=$(served_cert -issuer)
    if [ -n "$serial" ] && [ "$serial" != "$before" ] && ! grep -q "Caddy Local" <<<"$issuer"; then
      echo "    $issuer"
      echo "    $(served_cert -enddate)"
      return 0
    fi
    sleep 4
  done
  say "Caddy did not get its own certificate within 2 minutes: putting the pre-issued one back"
  cp -a "$backup" "$CADDYFILE"
  reload_caddy
  die "still on the pre-issued certificate (valid until $(openssl x509 -in "$MANUAL_CERT" -noout -enddate | cut -d= -f2)). See: journalctl -u caddy -n 80"
}

cmd_frontend() {
  case "${1:-}" in
    nextjs)
      cat > "$FRONTEND" <<'EOF'
# Production shop front: the new Next.js site (normal). Switched by: wdlocks-golive frontend nextjs|wordpress
(production_frontend) {
	reverse_proxy 127.0.0.1:3000 {
		header_up X-Real-IP {remote_host}
	}
}
EOF
      ;;
    wordpress)
      cat > "$FRONTEND" <<'EOF'
# Production shop front: EMERGENCY, the old WordPress shop serves every page (same database, nothing lost).
# Back to normal: wdlocks-golive frontend nextjs
(production_frontend) {
	import wordpress_production
}
EOF
      ;;
    *) die "usage: wdlocks-golive frontend nextjs|wordpress" ;;
  esac
  reload_caddy
  say "shop front is now: $1"
}

case "${1:-}" in
  status) cmd_status ;;
  restore) cmd_restore "${2:-}" ;;
  open) cmd_open ;;
  tls) cmd_tls ;;
  frontend) cmd_frontend "${2:-}" ;;
  *) sed -n '2,15p' "$0"; exit 1 ;;
esac
