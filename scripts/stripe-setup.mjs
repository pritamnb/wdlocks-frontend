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
 * (writing its signing secret back to .env.local), and pushes the variables to Vercel.
 *
 * Rollout stages (docs/stripe-checkout-plan.md §6):
 *   1. staging + test keys, no WooCommerce key  → real Stripe test-mode payments, pretend orders ("sandbox")
 *   2. staging + test keys + WooCommerce key    → test-card orders appear in the WooCommerce admin
 *   3. production + live keys + WooCommerce key → go-live
 *
 *   node scripts/stripe-setup.mjs --target staging       the wdlocks-frontend-staging Vercel project (staging branch)
 *   node scripts/stripe-setup.mjs --target production    Vercel production
 *   add --check to only validate the keys and change nothing
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import Stripe from 'stripe';

const ENV_FILE = '.env.local';
const CHECK_ONLY = process.argv.includes('--check');
const TARGET = process.argv[process.argv.indexOf('--target') + 1];
if (!['staging', 'production'].includes(TARGET)) fail('Pass --target staging or --target production.');
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
if (!withWc && TARGET === 'production') fail('Production needs the WooCommerce REST key (WC_CONSUMER_KEY / WC_CONSUMER_SECRET) so real orders are created.');
if (TARGET === 'production' && mode === 'test') console.warn('  ! Test keys on production: shoppers will not be able to pay with real cards.');
if (whsec && !whsec.startsWith('whsec_')) fail(`${ENV_FILE}: STRIPE_WEBHOOK_SECRET must start with whsec_.`);
if (!/^https:\/\//.test(siteUrl)) fail(`${ENV_FILE}: NEXT_PUBLIC_SITE_URL must be the public https URL of the frontend (https://wdlocks-frontend.vercel.app) so the webhook can reach it.`);
const webhookUrl = `${siteUrl}/api/stripe/webhook`;
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
    description: `wdlocks-frontend checkout, ${TARGET} (Next.js on Vercel)`,
  });
  whsec = created.secret;
  const text = readFileSync(ENV_FILE, 'utf8');
  const line = `STRIPE_WEBHOOK_SECRET=${whsec}`;
  const next = /^#?\s*STRIPE_WEBHOOK_SECRET=.*$/m.test(text) ? text.replace(/^#?\s*STRIPE_WEBHOOK_SECRET=.*$/m, line) : `${text.replace(/\n?$/, '\n')}${line}\n`;
  writeFileSync(ENV_FILE, next);
  console.log(`✓ Webhook endpoint created (${created.id}); signing secret written to ${ENV_FILE}`);
}

if (CHECK_ONLY) {
  console.log('\nCheck only: nothing changed. Run without --check to register the webhook and push to Vercel.');
  process.exit(0);
}

// 5. Vercel env (staging = preview scoped to the `staging` git branch; production = production).
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

const deployCmd = TARGET === 'staging' ? `cd ${STAGING_DIR} && git merge main && vercel deploy --prod --yes` : 'vercel deploy --prod --yes';
console.log(`\nDone. Deploy to make it live:\n  ${deployCmd}\nThen test a ${mode}-mode payment at ${siteUrl}/checkout${mode === 'test' ? ' with card 4242 4242 4242 4242' : ''}.`);
