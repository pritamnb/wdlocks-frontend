/**
 * Responsive screenshot set for review.
 *   npm run shots                         → the live site, into screenshots/<date>/
 *   TARGET_URL=http://localhost:3000 npm run shots
 *   PW_HEADED=1 npm run shots             → watch it in a real window
 *
 * Uses the project's own Playwright (@playwright/test); run `npx playwright install chromium` once.
 */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('@playwright/test');

const targetUrl = (process.env.TARGET_URL || 'https://wdlocks.co.uk').replace(/\/$/, '');
const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
const outDir = process.env.PW_ARTIFACT_DIR || path.join(process.cwd(), 'screenshots', stamp);

const PAGES = [
  ['home', '/'],
  ['cylinder', '/products/3-star-alps-cylinder-door-lock'],
  ['keys', '/products/watchdog-3-star-alps-extra-keys'],
  ['products', '/products'],
  ['home-truths', '/home-truths'],
  ['guarantee', '/guarantee'],
  ['contact', '/contact'],
  ['trade', '/trade'],
  ['blog', '/blog'],
];
const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844, mobile: true },
  { name: 'tablet', width: 820, height: 1180, mobile: true },
  { name: 'desktop', width: 1440, height: 900, mobile: false },
];

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: !process.env.PW_HEADED });
  const problems = [];
  try {
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.mobile, hasTouch: vp.mobile, deviceScaleFactor: 2 });
      const page = await context.newPage();
      for (const [name, route] of PAGES) {
        // 'load', not 'networkidle': the live site keeps a connection open (tags, films), so it never goes idle.
        await page.goto(targetUrl + route, { waitUntil: 'load' });
        await page.waitForTimeout(1500);
        // Let lazy images and films settle, then capture the whole page.
        await page.evaluate(async () => {
          window.scrollTo(0, document.body.scrollHeight);
          await new Promise((r) => setTimeout(r, 600));
          window.scrollTo(0, 0);
          await new Promise((r) => setTimeout(r, 400));
        });
        const file = path.join(outDir, `${name}-${vp.name}.png`);
        await page.screenshot({ path: file, fullPage: true });
        const vpInfo = await page.evaluate(() => ({ layout: window.innerWidth, visual: Math.round(window.visualViewport?.width ?? window.innerWidth), overflow: document.documentElement.scrollWidth > window.innerWidth + 1 }));
        if (vpInfo.overflow || vpInfo.layout > vpInfo.visual + 1) problems.push(`${name} @ ${vp.name}: layout ${vpInfo.layout}px vs visual ${vpInfo.visual}px, overflow=${vpInfo.overflow}`);
        console.log(`${name.padEnd(12)} ${vp.name.padEnd(8)} ${path.relative(process.cwd(), file)}`);
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
  console.log(`\n${PAGES.length * VIEWPORTS.length} screenshots in ${path.relative(process.cwd(), outDir) || outDir}`);
  if (problems.length) {
    console.log('\nLayout problems:');
    for (const p of problems) console.log('  - ' + p);
    process.exitCode = 1;
  } else {
    console.log('No horizontal overflow or widened layout on any page.');
  }
})();
