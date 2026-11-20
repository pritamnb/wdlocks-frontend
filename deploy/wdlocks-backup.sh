#!/bin/bash
# Nightly backup for the wdlocks server: database every night (kept 14 days),
# WordPress files and server settings every night (kept 7 days). Stored in /srv/backups, root only.
set -euo pipefail
umask 077
day=$(date +%F)
base=/srv/backups
mkdir -p "$base/db" "$base/files" "$base/config"

# 1. Database
db="$base/db/wdlocks-$day.sql.gz"
mariadb-dump --single-transaction --quick --routines --default-character-set=utf8mb4 wdlocks | gzip -6 > "$db.tmp"
gzip -t "$db.tmp"
[ "$(stat -c %s "$db.tmp")" -gt 1000000 ] || { echo "database dump is suspiciously small"; exit 1; }
mv "$db.tmp" "$db"

# 2. WordPress files (uploads, plugins, themes, settings)
files="$base/files/wordpress-$day.tar.gz"
tar -czf "$files.tmp" -C /srv wordpress/wp-content wordpress/wp-config.php
gzip -t "$files.tmp"
mv "$files.tmp" "$files"

# 3. Server settings (Caddy, both storefront settings and units, PHP tuning, firewall, cron, our scripts)
cfg="$base/config/config-$day.tar.gz"
tar -czf "$cfg.tmp" -C / --ignore-failed-read etc/caddy srv/wdlocks-production/shared/.env.production \
  srv/wdlocks-staging/shared/.env.production etc/systemd/system/wdlocks-production.service \
  etc/systemd/system/wdlocks-staging.service etc/php/8.5/fpm/conf.d/90-wdlocks.ini etc/ufw/before.rules etc/hosts \
  etc/cron.d usr/local/sbin usr/local/share/wdlocks srv/wordpress-staging/wp-config.php 2>/dev/null
mv "$cfg.tmp" "$cfg"

# 4. Keep 14 nights of database, 7 nights of files and settings
find "$base/db" -name "wdlocks-*.sql.gz" -mtime +14 -delete
find "$base/files" -name "wordpress-*.tar.gz" -mtime +7 -delete
find "$base/config" -name "config-*.tar.gz" -mtime +7 -delete

echo "$(date -Is) ok db=$(stat -c %s "$db") files=$(stat -c %s "$files") config=$(stat -c %s "$cfg")"
