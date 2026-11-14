// Step 1 of 2 for public/brand/product/guarantee-keytags-cutout.webp (step 2: keytags-cutout.mjs, then sharp → WebP q92,
// alphaQuality 100, smartSubsample). Fits the four sides of each key tag from its saturated (red / black) parts and prints the corner points.
// The tags' white faces meet the white page with no visible edge, so the silhouette has to come from geometry.
import { createRequire } from 'node:module';
const sharp = createRequire(import.meta.url)('sharp');

/** The client's photo (WhatsApp, 13 Nov 2026, 1199 × 1312 JPEG). Pass its path as the first argument. */
const SRC = process.argv[2];
if (!SRC) throw new Error('usage: node scripts/images/<script>.mjs <path to the WhatsApp JPEG> [out]');
const { data, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, C = info.channels;
const px = (x, y) => { const i = (y * W + x) * C; return [data[i], data[i + 1], data[i + 2]]; };
/** "Ink" strength: 0 for page white, ~255 for red or black. */
const ink = (x, y) => { const [r, g, b] = px(x, y); return 255 - Math.min(r, g, b); };

/** First position along a scan where ink crosses 128, with linear sub-pixel interpolation. */
function crossing(points) {
  for (let k = 1; k < points.length; k++) {
    const a = points[k - 1].v, b = points[k].v;
    if (a < 128 && b >= 128) return points[k - 1].t + (128 - a) / (b - a);
  }
  return null;
}
const scanX = (y, x0, x1) => { const step = x1 > x0 ? 1 : -1; const out = []; for (let x = x0; x !== x1; x += step) out.push({ t: x, v: ink(x, y) }); const c = crossing(out); return c === null ? null : (step > 0 ? c : c); };
const scanY = (x, y0, y1) => { const step = y1 > y0 ? 1 : -1; const out = []; for (let y = y0; y !== y1; y += step) out.push({ t: y, v: ink(x, y) }); return crossing(out); };

/** Robust fit of u = a·v + b: Theil–Sen start (median of pairwise slopes), then least squares on points within 1.5 px. */
function fit(pairs) {
  const run = (ps) => { const n = ps.length; let sv = 0, su = 0, svv = 0, svu = 0; for (const [v, u] of ps) { sv += v; su += u; svv += v * v; svu += v * u; } const a = (n * svu - sv * su) / (n * svv - sv * sv); return { a, b: (su - a * sv) / n }; };
  const med = (xs) => { const s = [...xs].sort((p, q) => p - q); return s[s.length >> 1]; };
  const slopes = [];
  for (let i = 0; i < pairs.length; i += 3) for (let j = i + 7; j < pairs.length; j += 7) slopes.push((pairs[j][1] - pairs[i][1]) / (pairs[j][0] - pairs[i][0]));
  const a0 = med(slopes);
  const b0 = med(pairs.map(([v, u]) => u - a0 * v));
  let kept = pairs.filter(([v, u]) => Math.abs(a0 * v + b0 - u) < 1.5);
  let f = run(kept);
  kept = pairs.filter(([v, u]) => Math.abs(f.a * v + f.b - u) < 1.5);
  f = run(kept);
  const rms = Math.sqrt(kept.reduce((s, [v, u]) => s + (f.a * v + f.b - u) ** 2, 0) / kept.length);
  return { ...f, n: kept.length, of: pairs.length, rms: +rms.toFixed(2) };
}

function side(kind, range, scan) {
  const pairs = [];
  for (let v = range[0]; v <= range[1]; v++) { const u = scan(v); if (u !== null) pairs.push([v, u]); }
  return { kind, ...fit(pairs) };
}

// Left tag: sides from the red bottom band, top from the red chevron band, bottom from the red band.
const L = {
  left: side('x(y)', [950, 1240], (y) => scanX(y, 40, 400)),
  right: side('x(y)', [950, 1220], (y) => scanX(y, 700, 380)),
  top: side('y(x)', [90, 255], (x) => scanY(x, 200, 400)),
  bottom: side('y(x)', [200, 470], (x) => scanY(x, H - 1, 1150)),
};
// Right tag: sides from the black lower half, top from the red chevron, bottom from the black band.
const R = {
  left: side('x(y)', [720, 1120], (y) => scanX(y, 545, 900)),
  right: side('x(y)', [600, 1000], (y) => scanX(y, W - 1, 900)),
  top: side('y(x)', [520, 730], (x) => scanY(x, 60, 330)),
  bottom: side('y(x)', [830, 1110], (x) => scanY(x, H - 1, 1000)),
};

/** Intersection of x = a1·y + b1 with y = a2·x + b2. */
function meet(xy, yx) { const y = (yx.a * xy.b + yx.b) / (1 - yx.a * xy.a); return [xy.a * y + xy.b, y]; }
function corners(T) { return { tl: meet(T.left, T.top), tr: meet(T.right, T.top), br: meet(T.right, T.bottom), bl: meet(T.left, T.bottom) }; }

const out = { size: [W, H], left: { fits: L, corners: corners(L) }, right: { fits: R, corners: corners(R) } };
console.log(JSON.stringify(out, (k, v) => (typeof v === 'number' ? +v.toFixed(3) : v), 1));
await import('node:fs').then((fs) => fs.writeFileSync(new URL('./keytags-fit.json', import.meta.url), JSON.stringify(out)));
