#!/usr/bin/env bash
# Forced command for the deploy user's SSH key. Installed as /usr/local/sbin/wdlocks-deploy-gate (root:root 0755).
# authorized_keys line (one key per environment):
#   command="/usr/local/sbin/wdlocks-deploy-gate staging",restrict ssh-ed25519 AAAA... github-actions-staging
# The client may only send "deploy <40-char sha>"; anything else is refused. The environment comes from the key,
# never from the client.
set -euo pipefail
ENV_NAME="${1:?environment missing}"
read -r verb sha extra <<<"${SSH_ORIGINAL_COMMAND:-}"
if [ "${verb:-}" != "deploy" ] || [ -n "${extra:-}" ] || ! [[ "${sha:-}" =~ ^[0-9a-f]{40}$ ]]; then
  echo "refused: expected 'deploy <sha>'" >&2
  exit 2
fi
exec sudo -n /usr/local/sbin/wdlocks-deploy "$ENV_NAME" "$sha"
