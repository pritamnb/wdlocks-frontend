import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end checks. Run against production by default; set E2E_BASE_URL to test a preview or local build:
 *   npm run test:e2e                      → https://wdlocks-frontend.vercel.app
 *   E2E_BASE_URL=http://localhost:3000 npm run test:e2e
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'https://wdlocks-frontend.vercel.app',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', testIgnore: /basket/, use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } } },
    { name: 'mobile', testIgnore: /basket/, use: { ...devices['Pixel 7'] } },
    // The live basket flow talks to the real Store API through the proxy; run it alone, after everything else.
    // Each proxied Store API call takes ~2 s on shared hosting; the checkout flows chain six or more, so allow 90 s.
    { name: 'basket-desktop', testMatch: /basket/, dependencies: ['desktop', 'mobile'], fullyParallel: false, timeout: 90_000, use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } } },
    { name: 'basket-mobile', testMatch: /basket/, dependencies: ['basket-desktop'], fullyParallel: false, timeout: 90_000, use: { ...devices['Pixel 7'] } },
  ],
});
