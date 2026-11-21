# WD Locks storefront

Next.js shop for [wdlocks.co.uk](https://wdlocks.co.uk). Products, stock and orders live in WooCommerce; this app is the shop front.

## Run it locally

Needs Node.js 22 or newer.

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Open http://localhost:3000.

To try the checkout locally, set `NEXT_PUBLIC_CHECKOUT_MODE=demo` in `.env.local`: nothing is charged and no order is created.
Never put live Stripe keys or a WooCommerce REST key in `.env.local`. With a WooCommerce key, local checkouts create real orders in the live shop.

## Other commands

```bash
npm run build && npm start   # production build
npm run lint
npm run test:e2e             # Playwright tests
```

## More

- How it works, settings and checkout: `docs/developer-guide.md`
- Deploying (staging and production on the VPS): `docs/deploy-pipeline.md`
