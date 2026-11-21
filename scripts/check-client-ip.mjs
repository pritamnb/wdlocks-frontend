#!/usr/bin/env node
/**
 * Checks, from outside, that the deployed site keys its rate limits on the visitor's real IP and not on a header the
 * visitor can forge (docs/developer-guide.md "Abuse protection"). Needs nothing from the host: run it after every move to a new server
 * or proxy.
 *
 *   node scripts/check-client-ip.mjs https://<site> [--limit 20]
 *
 * It sends `limit + 1` empty POSTs to /api/crime (a harmless route: an empty body is refused before any upstream
 * call), each with a different made-up address in every common client-IP header. If the server reads the real
 * address, the last one answers 429. If none does, the server trusts a forgeable header: fix CLIENT_IP_HEADER /
 * TRUSTED_PROXY_COUNT. Afterwards this machine is rate limited on /api/crime for up to a minute.
 *
 * --limit must match RATE_LIMIT_CRIME's per-minute count when that is overridden (default 20).
 */

const args = process.argv.slice(2);
const base = args.find((a) => /^https?:\/\//.test(a))?.replace(/\/+$/, '');
const limitArg = args.indexOf('--limit');
const limit = limitArg >= 0 ? Number(args[limitArg + 1]) : 20;

if (!base || !Number.isInteger(limit) || limit < 1 || limit > 500) {
  console.error('Usage: node scripts/check-client-ip.mjs https://<site> [--limit 20]');
  process.exit(2);
}

const FORGEABLE = ['X-Forwarded-For', 'X-Real-IP', 'CF-Connecting-IP', 'True-Client-IP', 'X-Client-IP', 'Fly-Client-IP'];

function fakeIp(i) {
  return `198.51.100.${(i % 250) + 1}`; // TEST-NET-2, never a real visitor
}

async function post(i) {
  const ip = fakeIp(i);
  const headers = { 'Content-Type': 'application/json', Forwarded: `for=${ip}` };
  for (const name of FORGEABLE) headers[name] = ip;
  const res = await fetch(`${base}/api/crime`, { method: 'POST', headers, body: '{}', redirect: 'manual' });
  return res.status;
}

const statuses = [];
for (let i = 0; i <= limit; i++) {
  const status = await post(i);
  statuses.push(status);
  if (status === 429) break;
}
console.log(`Responses: ${statuses.join(' ')}`);

const first429 = statuses.indexOf(429);
if (statuses.some((s) => s >= 300 && s < 400)) {
  console.error('FAIL: the site redirected the request; pass the final https:// address.');
  process.exit(1);
}
if (first429 === -1) {
  console.error(
    `FAIL: ${limit + 1} requests with forged client-IP headers were all accepted, so a visitor can dodge every rate ` +
      'limit. If the app answers on a public port with nothing in front, put deploy/Caddyfile in front and bind it to ' +
      '127.0.0.1. Behind your own proxy, set CLIENT_IP_HEADER to a header that proxy OVERWRITES (the Caddyfile sets ' +
      'X-Real-IP). Behind a host proxy that appends to X-Forwarded-For, unset CLIENT_IP_HEADER and set ' +
      'TRUSTED_PROXY_COUNT to the number of such proxies.',
  );
  process.exit(1);
}
if (first429 < limit) {
  console.warn(
    `CHECK: limited after ${first429} requests, earlier than the expected ${limit}. Either --limit does not match ` +
      'RATE_LIMIT_CRIME, someone else on this network used /api/crime in the last minute, or every visitor shares ' +
      'one address (see below).',
  );
}
console.log('PASS: forged headers do not buy a fresh rate-limit bucket.');
console.log(
  'Next, within a minute, from a DIFFERENT network (e.g. a laptop on a phone hotspot) run:\n' +
    `  curl -s -o /dev/null -w '%{http_code}\\n' -X POST ${base}/api/crime -H 'Content-Type: application/json' -d '{}'\n` +
    'It must answer 400, not 429. A 429 means the server sees every visitor as the proxy\'s address: set ' +
    'CLIENT_IP_HEADER, or raise TRUSTED_PROXY_COUNT to the number of proxies in front of the app.',
);
