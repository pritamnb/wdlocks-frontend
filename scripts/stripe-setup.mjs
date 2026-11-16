#!/usr/bin/env node
/**
 * One-shot Stripe + WooCommerce checkout setup (docs/stripe-checkout-plan.md).
 *
 * Reads the keys from .env.local (never from the command line, so they stay out of shell history and chat):
 *   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY  pk_test_… / pk_live_…
 *   STRIPE_SECRET_KEY                   sk_test_… / rk_test_… / sk_live_… / rk_live_…  (same mode as the publishable key)
 *   WC_CONSUMER_KEY / WC_CONSUMER_SECRET ck_… / cs_…  (WooCommerce → Settings → Advanced → REST API, Read/Write)
 *   STRIPE_WEBHOOK_SECRET               whsec_… (optional: created for you when missing)
 *
 * Then: checks the keys work, registers the webhook endpoint on the Stripe account if none exists for the target
 * (writing its signing secret back to .env.local), registers the site's domain for Apple Pay / Google Pay / Link, and
 * pushes the variables to Vercel, or, for our own Node server, writes them to .env.server (gitignored, mode 600) for
 * copying to /srv/wdlocks-frontend/.env.production (deploy/wdlocks-frontend.service reads that file). --target server
 * reads the live keys from .env.live, never .env.local (local servers read .env.local and must stay on test keys).
 *
 * Rollout stages (docs/stripe-checkout-plan.md §6):
 *   1. staging + test keys, no WooCommerce key  → real Stripe test-mode payments, pretend orders ("sandbox")
 *   2. staging + test keys + WooCommerce key    → test-card orders appear in the WooCommerce admin
 *   3. production + live keys + WooCommerce key → go-live
 *
 *   node scripts/stripe-setup.mjs --target staging       the wdlocks-frontend-staging Vercel project (staging branch)
 *   node scripts/stripe-setup.mjs --target production    Vercel production
 *   node scripts/stripe-setup.mjs --target server        our own Node server (docs/go-live-payments.md): .env.live → .env.server
 *   add --check to only validate the keys and change nothing
 *   add --verify (after deploying) to check the live site: webhook route configured, Stripe endpoint enabled, wallet domain
 */
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import Stripe from 'stripe';

const CHECK_ONLY = process.argv.includes('--check');
const VERIFY = process.argv.includes('--verify');
const TARGET = process.argv[process.argv.indexOf('--target') + 1];
if (!['staging', 'production', 'server'].includes(TARGET)) fail('Pass --target staging, --target production (Vercel) or --target server (own Node server).');
/** Live targets: real shoppers, real money. */
const LIVE_TARGET = TARGET === 'production' || TARGET === 'server';
/**
 * Where the keys come from. Live keys never go in .env.local: every local `next dev` / `next start` reads that file, so a
 * local checkout test would charge real cards. --target server reads .env.live instead (or --env <file>).
 */
const ENV_ARG = process.argv.includes('--env') ? process.argv[process.argv.indexOf('--env') + 1] : null;
const ENV_FILE = ENV_ARG ?? (TARGET === 'server' ? '.env.live' : '.env.local');
if (!existsSync(ENV_FILE)) fail(`${ENV_FILE} not found.${TARGET === 'server' ? ' Create it from .env.live.example (live keys, NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_WC_BASE); it is gitignored.' : ''}`);
/**
 * What --target server writes, for copying to /srv/wdlocks-frontend/.env.production on the server (Next.js reads that
 * at `next build` / `next start`, systemd reads it too). Named .env.server here so nothing on this machine loads it.
 */
const SERVER_ENV_FILE = '.env.server';
/**
 * Staging is its own Vercel project (wdlocks-frontend-staging, no login wall, deployed from the `staging` branch in the
 * git worktree ../wdlocks-frontend-staging) because preview deployments on this plan sit behind Vercel Authentication,
 * which Stripe's webhook and the client's phone could not get through.
 */
const STAGING_URL = 'https://wdlocks-frontend-staging.vercel.app';
const STAGING_DIR = new URL('../../wdlocks-frontend-staging/', import.meta.url).pathname;
const VERCEL_CWD = TARGET === 'staging' ? STAGING_DIR : process.cwd();
const WEBHOOK_EVENTS = ['payment_intent.succeeded', 'payment_intent.payment_failed', 'payment_intent.processing', 'charge.refunded'];
const STRIPE_API_VERSION = '2026-10-28.endive';

function fail(msg) {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
}

function parseEnv(text) {
  const out = {};
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}

const env = parseEnv(readFileSync(ENV_FILE, 'utf8'));
const siteUrl = TARGET === 'staging' ? STAGING_URL : (env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '');
const wcBase = (env.NEXT_PUBLIC_WC_BASE ?? 'https://wdlocks.co.uk').replace(/\/$/, '');
const pk = env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const sk = env.STRIPE_SECRET_KEY;
const ck = env.WC_CONSUMER_KEY;
const cs = env.WC_CONSUMER_SECRET;
let whsec = env.STRIPE_WEBHOOK_SECRET;

// 1. Shape checks (no values are ever printed).
if (!pk || !/^pk_(test|live)_/.test(pk)) fail(`${ENV_FILE}: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must start with pk_test_ or pk_live_.`);
// Stripe's permission-based keys ("Full access – except sensitive operations") start with rk_; they work the same way.
if (!sk || !/^(sk|rk)_(test|live)_/.test(sk)) fail(`${ENV_FILE}: STRIPE_SECRET_KEY must start with sk_test_, rk_test_, sk_live_ or rk_live_.`);
const mode = pk.startsWith('pk_live_') ? 'live' : 'test';
if (!/^(sk|rk)_/.test(sk) || !sk.includes(`_${mode}_`)) fail(`The publishable key is ${mode} mode but the secret key is not. Both must come from the same mode.`);
const withWc = Boolean(ck || cs);
if (withWc && (!ck || !ck.startsWith('ck_'))) fail(`${ENV_FILE}: WC_CONSUMER_KEY must start with ck_.`);
if (withWc && (!cs || !cs.startsWith('cs_'))) fail(`${ENV_FILE}: WC_CONSUMER_SECRET must start with cs_.`);
if (!withWc && LIVE_TARGET) fail('Production needs the WooCommerce REST key (WC_CONSUMER_KEY / WC_CONSUMER_SECRET) so real orders are created.');
if (LIVE_TARGET && mode === 'test') console.warn('  ! Test keys on production: shoppers will not be able to pay with real cards.');
if (whsec && !whsec.startsWith('whsec_')) fail(`${ENV_FILE}: STRIPE_WEBHOOK_SECRET must start with whsec_.`);
if (!/^https:\/\//.test(siteUrl)) fail(`${ENV_FILE}: NEXT_PUBLIC_SITE_URL must be the public https URL of the frontend (https://wdlocks-frontend.vercel.app) so the webhook can reach it.`);
const webhookUrl = `${siteUrl}/api/stripe/webhook`;
const siteHost = new URL(siteUrl).hostname;
if (TARGET === 'server' && /vercel\.app$/.test(siteHost)) fail(`${ENV_FILE}: NEXT_PUBLIC_SITE_URL is ${siteUrl}; for --target server it must be the real shop domain (https://wdlocks.co.uk).`);
console.log(`Target: ${TARGET} · Stripe ${mode} mode · WooCommerce orders: ${withWc ? 'yes' : 'no (sandbox: pretend orders)'} · webhook: ${webhookUrl}`);

// 2. Stripe key works?
const stripe = new Stripe(sk, { apiVersion: STRIPE_API_VERSION });
let account;
try {
  account = await stripe.accounts.retrieve();
} catch (e) {
  fail(`Stripe rejected the secret key: ${e.message}`);
}
console.log(`✓ Stripe account ${account.id} (${account.country ?? '?'}, ${account.settings?.dashboard?.display_name ?? account.business_profile?.name ?? 'no name'}), charges ${account.charges_enabled ? 'enabled' : 'NOT enabled yet'}`);
if (mode === 'live' && !account.charges_enabled) console.warn('  ! Live mode but charges are not enabled: Stripe onboarding is incomplete.');

if (VERIFY) await verifyDeployed();

// 3. WooCommerce REST key works (read/write needed for orders)?
if (withWc) {
  const auth = 'Basic ' + Buffer.from(`${ck}:${cs}`).toString('base64');
  const wcRes = await fetch(`${wcBase}/wp-json/wc/v3/orders?per_page=1&status=any`, { headers: { Authorization: auth, 'User-Agent': 'wdlocks-frontend setup' } });
  if (wcRes.status === 401 || wcRes.status === 403) fail(`WooCommerce rejected the REST key (${wcRes.status}). Check it is Read/Write and that the site allows Basic auth over https.`);
  if (!wcRes.ok) fail(`WooCommerce REST returned ${wcRes.status} from ${wcBase}/wp-json/wc/v3/orders.`);
  console.log(`✓ WooCommerce REST key accepted by ${wcBase} (orders endpoint readable)`);
}

// 4. Webhook endpoint.
const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
const existing = endpoints.data.find((w) => w.url === webhookUrl);
if (existing) {
  const missing = WEBHOOK_EVENTS.filter((ev) => !existing.enabled_events.includes(ev) && !existing.enabled_events.includes('*'));
  console.log(`✓ Webhook endpoint already registered (${existing.id}, ${existing.status})${missing.length ? ` — missing events: ${missing.join(', ')}` : ''}`);
  if (!whsec) fail('That endpoint\'s signing secret is only shown once by Stripe. Copy it from Developers → Webhooks → this endpoint → "Signing secret" into STRIPE_WEBHOOK_SECRET in .env.local, or delete the endpoint and run again to create a fresh one.');
  if (missing.length && !CHECK_ONLY) {
    await stripe.webhookEndpoints.update(existing.id, { enabled_events: [...new Set([...existing.enabled_events, ...WEBHOOK_EVENTS])] });
    console.log('  → added the missing events');
  }
} else if (CHECK_ONLY) {
  console.log(`· No webhook endpoint for ${webhookUrl} yet (would be created on a full run)`);
} else {
  const created = await stripe.webhookEndpoints.create({
    url: webhookUrl,
    enabled_events: WEBHOOK_EVENTS,
    api_version: STRIPE_API_VERSION,
    description: `wdlocks-frontend checkout, ${TARGET} (${TARGET === 'server' ? 'own Node server' : 'Next.js on Vercel'})`,
  });
  whsec = created.secret;
  const text = readFileSync(ENV_FILE, 'utf8');
  const line = `STRIPE_WEBHOOK_SECRET=${whsec}`;
  const next = /^#?\s*STRIPE_WEBHOOK_SECRET=.*$/m.test(text) ? text.replace(/^#?\s*STRIPE_WEBHOOK_SECRET=.*$/m, line) : `${text.replace(/\n?$/, '\n')}${line}\n`;
  writeFileSync(ENV_FILE, next);
  console.log(`✓ Webhook endpoint created (${created.id}); signing secret written to ${ENV_FILE}`);
}

// 5. Apple Pay / Google Pay / Link only show on domains registered with the account (per mode).
const domains = await stripe.paymentMethodDomains.list({ domain_name: siteHost, limit: 1 });
let domain = domains.data[0];
if (!domain && !CHECK_ONLY) {
  domain = await stripe.paymentMethodDomains.create({ domain_name: siteHost, enabled: true });
  console.log(`✓ Payment method domain registered: ${siteHost} (${domain.id})`);
} else if (!domain) {
  console.log(`· ${siteHost} is not registered for Apple Pay / Google Pay yet (would be registered on a full run)`);
} else {
  console.log(`✓ Payment method domain already registered: ${siteHost} (${domain.id})`);
}
if (domain) console.log(`  Apple Pay ${domain.apple_pay?.status ?? '?'} · Google Pay ${domain.google_pay?.status ?? '?'} · Link ${domain.link?.status ?? '?'}`);

if (CHECK_ONLY) {
  console.log(`\nCheck only: nothing changed. Run without --check to register the webhook and ${TARGET === 'server' ? `write ${SERVER_ENV_FILE}` : 'push to Vercel'}.`);
  process.exit(0);
}

// 6a. Own Node server: write the variables to .env.server (merged into any existing file, so rate-limit,
// Turnstile and other settings already there survive). The demo switch is commented out: live keys win anyway, but a
// leftover NEXT_PUBLIC_CHECKOUT_MODE=demo would confuse whoever reads the file later.
if (TARGET === 'server') {
  const serverVars = {
    NEXT_PUBLIC_SITE_URL: siteUrl,
    NEXT_PUBLIC_WC_BASE: wcBase,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: pk,
    STRIPE_SECRET_KEY: sk,
    STRIPE_WEBHOOK_SECRET: whsec,
    WC_CONSUMER_KEY: ck,
    WC_CONSUMER_SECRET: cs,
  };
  let text = existsSync(SERVER_ENV_FILE) ? readFileSync(SERVER_ENV_FILE, 'utf8') : `# WD Locks storefront, production settings (written by scripts/stripe-setup.mjs --target server).\n# Copy to /srv/wdlocks-frontend/.env.production on the server. Never commit this file.\n`;
  for (const [name, value] of Object.entries(serverVars)) {
    const line = `${name}=${value}`;
    const re = new RegExp(`^#?\\s*${name}=.*$`, 'm');
    text = re.test(text) ? text.replace(re, line) : `${text.replace(/\n?$/, '\n')}${line}\n`;
  }
  text = text.replace(/^NEXT_PUBLIC_CHECKOUT_MODE=.*$/m, '# NEXT_PUBLIC_CHECKOUT_MODE=demo  (off: live payments)');
  writeFileSync(SERVER_ENV_FILE, text, { mode: 0o600 });
  chmodSync(SERVER_ENV_FILE, 0o600);
  console.log(`✓ ${SERVER_ENV_FILE} written (${Object.keys(serverVars).length} checkout variables; other lines kept; mode 600)`);
  console.log(`\nNext (docs/go-live-payments.md):
  1. scp ${SERVER_ENV_FILE} <server>:/srv/wdlocks-frontend/.env.production   (then delete ${SERVER_ENV_FILE} here)
  2. on the server: cd /srv/wdlocks-frontend && git pull && npm ci && npm run build && sudo systemctl restart wdlocks-frontend
     (NEXT_PUBLIC_* values are baked in by the build, so the build must run after the file is in place)
  3. node scripts/stripe-setup.mjs --target server --verify`);
  process.exit(0);
}

// 6b. Vercel env (staging = preview scoped to the `staging` git branch; production = production).
const vars = {
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: pk,
  STRIPE_SECRET_KEY: sk,
  STRIPE_WEBHOOK_SECRET: whsec,
  ...(withWc ? { WC_CONSUMER_KEY: ck, WC_CONSUMER_SECRET: cs } : {}),
  ...(TARGET === 'staging' ? { NEXT_PUBLIC_CHECKOUT_MODE: 'demo' } : {}),
};
for (const [name, value] of Object.entries(vars)) {
  const args = ['env', 'add', name, '--environment', 'production', '--force'];
  const r = spawnSync('vercel', [...args, '--sensitive'], { input: value, encoding: 'utf8', cwd: VERCEL_CWD });
  if (r.status !== 0) {
    // --sensitive is only available on some plans; retry without it.
    const r2 = spawnSync('vercel', args, { input: value, encoding: 'utf8', cwd: VERCEL_CWD });
    if (r2.status !== 0) fail(`vercel env add ${name} failed:\n${(r2.stderr || r2.stdout).trim()}`);
  }
  console.log(`✓ Vercel ${TARGET}: ${name}`);
}

const deployCmd = TARGET === 'staging' ? `git -C ${STAGING_DIR} merge main && vercel deploy --prod --yes --cwd ${STAGING_DIR}` : 'vercel deploy --prod --yes';
console.log(`\nDone. Deploy to make it live:\n  ${deployCmd}\nThen test a ${mode}-mode payment at ${siteUrl}/checkout${mode === 'test' ? ' with card 4242 4242 4242 4242' : ''}.`);

/**
 * --verify: read-only checks against the deployed site and the Stripe account. Exits non-zero on any failure.
 *   - POST without a signature to the webhook route: 400 missing_signature = keys loaded; 503 = not configured.
 *   - the Stripe webhook endpoint for this URL exists, is enabled and has every event.
 *   - the domain is registered for wallets.
 */
async function verifyDeployed() {
  let ok = true;
  const say = (pass, msg) => { console.log(`${pass ? '✓' : '✗'} ${msg}`); if (!pass) ok = false; };
  try {
    const r = await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const body = await r.json().catch(() => ({}));
    say(r.status === 400 && body.code === 'missing_signature', `webhook route ${webhookUrl} answers ${r.status} ${body.code ?? ''}${r.status === 503 ? ' (server has no Stripe keys: check .env.production and restart)' : ''}`);
  } catch (e) {
    say(false, `webhook route unreachable: ${e.message}`);
  }
  const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
  const ep = endpoints.data.find((w) => w.url === webhookUrl);
  const missing = ep ? WEBHOOK_EVENTS.filter((ev) => !ep.enabled_events.includes(ev) && !ep.enabled_events.includes('*')) : WEBHOOK_EVENTS;
  say(Boolean(ep) && ep.status === 'enabled' && missing.length === 0, ep ? `Stripe ${mode}-mode webhook ${ep.id} ${ep.status}${missing.length ? `, missing ${missing.join(', ')}` : ''}` : `no Stripe ${mode}-mode webhook for ${webhookUrl}`);
  const d = (await stripe.paymentMethodDomains.list({ domain_name: siteHost, limit: 1 })).data[0];
  say(Boolean(d), d ? `wallet domain ${siteHost}: Apple Pay ${d.apple_pay?.status ?? '?'} · Google Pay ${d.google_pay?.status ?? '?'}` : `${siteHost} not registered for Apple Pay / Google Pay`);
  say(mode === 'live' || !LIVE_TARGET, `keys are ${mode} mode`);
  console.log(ok ? '\nAll checks passed. Next: one real purchase with your own card, then refund it in Stripe (docs/go-live-payments.md step 7).' : '\nSome checks failed (see above).');
  process.exit(ok ? 0 : 1);
}
