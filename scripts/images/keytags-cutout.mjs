// Step 2 of 2 for public/brand/product/guarantee-keytags-cutout.webp (run keytags-fit.mjs first).
// Cuts the two key tags and the ring out of the client's photo (white page → transparent).
//
// The tags: rounded quadrilaterals whose sides were fitted from the red and black print (fit.mjs, ≤ 0.6 px rms), so the
// white faces get a clean edge even where they meet the white page with no visible outline. Anti-aliased by signed
// distance. The ring (and anything else outside the tags): colour matte against white, small enclosed highlights kept.
// Every partly transparent pixel is un-mixed from the white page (F = 255 − (255 − c) / α), which is what removes the
// white fringe the earlier cut-out had. Worked at 2× and downsampled, so the edges average out.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const sharp = createRequire(import.meta.url)('sharp');

/** The client's photo (WhatsApp, 13 Nov 2026, 1199 × 1312 JPEG). Pass its path as the first argument. */
const SRC = process.argv[2];
if (!SRC) throw new Error('usage: node scripts/images/<script>.mjs <path to the WhatsApp JPEG> [out]');
const OUT = process.argv[3] ?? 'keytags-cutout.png';
const S = 2; // working scale
const fit = JSON.parse(fs.readFileSync(new URL('./keytags-fit.json', import.meta.url)));
const RADII = { left: { tl: 20, tr: 20, br: 35, bl: 28 }, right: { tl: 20, tr: 20, br: 32, bl: 35 } };

const meta = await sharp(SRC).metadata();
const W = meta.width * S, H = meta.height * S;
const src = await sharp(SRC).resize(W, H, { kernel: 'lanczos3' }).removeAlpha().raw().toBuffer();
const ink = new Uint8Array(W * H);
for (let p = 0; p < W * H; p++) ink[p] = 255 - Math.min(src[p * 3], src[p * 3 + 1], src[p * 3 + 2]);

/* ---------- tags: signed distance to a rounded convex quad (negative inside) ---------- */
function shape(c, r) {
  const order = ['tl', 'tr', 'br', 'bl'];
  const P = order.map((k) => [c[k][0] * S + (S - 1) / 2, c[k][1] * S + (S - 1) / 2]);
  // Clockwise in screen coordinates → outward normal of edge a→b is (dy, −dx).
  const edges = P.map((a, i) => { const b = P[(i + 1) % 4]; const dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy); return { a, n: [dy / l, -dx / l] }; });
  const sdLine = (e, x, y) => (x - e.a[0]) * e.n[0] + (y - e.a[1]) * e.n[1];
  const corners = P.map((p, i) => {
    const rad = r[order[i]] * S;
    const ePrev = edges[(i + 3) % 4], eNext = edges[i];
    // Arc centre: rad inside both adjacent edges.
    const n1 = ePrev.n, n2 = eNext.n;
    // Solve (q − p)·n1 = −rad and (q − p)·n2 = −rad.
    const det = n1[0] * n2[1] - n1[1] * n2[0];
    const cx = p[0] + (-rad * n2[1] + rad * n1[1]) / det;
    const cy = p[1] + (-rad * n1[0] + rad * n2[0]) / det;
    return { prev: ePrev, next: eNext, c: [cx, cy], rad };
  });
  return (x, y) => {
    let sd = -Infinity;
    for (const e of edges) sd = Math.max(sd, sdLine(e, x, y));
    for (const k of corners) {
      if (sdLine(k.prev, x, y) > -k.rad && sdLine(k.next, x, y) > -k.rad) {
        // In the corner zone: distance from the arc, but only where the point lies beyond the arc centre on both axes.
        const sx = (x - k.c[0]) * k.prev.n[0] + (y - k.c[1]) * k.prev.n[1];
        const sy = (x - k.c[0]) * k.next.n[0] + (y - k.c[1]) * k.next.n[1];
        if (sx > 0 && sy > 0) sd = Math.max(sd, Math.hypot(sx, sy) - k.rad);
      }
    }
    return sd;
  };
}
const tags = [shape(fit.left.corners, RADII.left), shape(fit.right.corners, RADII.right)];
const tagA = new Float32Array(W * H);
const tagSd = new Float32Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const sd = Math.min(tags[0](x, y), tags[1](x, y));
  tagSd[y * W + x] = sd;
  tagA[y * W + x] = Math.min(1, Math.max(0, 0.5 - sd));
}

/* ---------- ring and anything else outside the tags: colour matte against white ---------- */
const T = 28; // ink above this is "object" (page noise reaches ~10 at 1×, ringing a little more)
const solid = new Uint8Array(W * H);
// Just outside a tag the JPEG leaves a pale halo (ink 15–40) that the colour matte would keep as a speckled line. The
// fitted outline already is the tag's edge, so in that 4 px band only clearly dark pixels (the ring) count as object.
const band = (p) => tagSd[p] > 0 && tagSd[p] < 4 * S;
const RING_INK = 90;
for (let p = 0; p < W * H; p++) solid[p] = tagA[p] < 1 && ink[p] >= (band(p) ? RING_INK : T) ? 1 : 0;
// Fill small enclosed gaps (specular highlights on the ring) so they stay opaque; large ones (the ring's hole) stay open.
const seen = new Uint8Array(W * H);
const MAX_HOLE = 220 * S * S;
for (let p0 = 0; p0 < W * H; p0++) {
  if (solid[p0] || seen[p0] || tagA[p0] >= 1) continue;
  const stack = [p0]; const comp = []; let touchesEdge = false; let touchesTag = false; seen[p0] = 1;
  while (stack.length) {
    const p = stack.pop(); comp.push(p);
    const x = p % W, y = (p - x) / W;
    if (x === 0 || y === 0 || x === W - 1 || y === H - 1) touchesEdge = true;
    for (const q of [p - 1, p + 1, p - W, p + W]) {
      if (q < 0 || q >= W * H || seen[q]) continue;
      if ((q === p - 1 && x === 0) || (q === p + 1 && x === W - 1)) continue;
      if (tagA[q] >= 1) { touchesTag = true; continue; }
      if (solid[q]) continue;
      seen[q] = 1; stack.push(q);
    }
  }
  if (!touchesEdge && !touchesTag && comp.length < MAX_HOLE) for (const p of comp) solid[p] = 1;
}
// Matte: interior solid → 1; a 3 px band around the solid/page boundary gets α from ink relative to the local object ink.
const R = 3 * S;
const ringA = new Float32Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const p = y * W + x;
  if (tagA[p] >= 1 || (band(p) && !solid[p])) continue;
  let nearSolid = false, nearPage = false, ref = 0;
  for (let dy = -R; dy <= R; dy++) {
    const yy = y + dy; if (yy < 0 || yy >= H) continue;
    for (let dx = -R; dx <= R; dx++) {
      const xx = x + dx; if (xx < 0 || xx >= W) continue;
      const q = yy * W + xx;
      if (solid[q]) { nearSolid = true; if (ink[q] > ref) ref = ink[q]; } else if (tagA[q] < 1) nearPage = true;
    }
  }
  if (!nearSolid) continue;
  if (solid[p] && !nearPage) { ringA[p] = 1; continue; }
  const a = Math.min(1, ink[p] / Math.max(ref * 0.9, 60));
  ringA[p] = solid[p] ? Math.max(a, 0.5) : a;
}

/* ---------- compose: union of both mattes, colours un-mixed from white ---------- */
const out = Buffer.alloc(W * H * 4);
for (let p = 0; p < W * H; p++) {
  const a = Math.max(tagA[p], ringA[p]);
  if (a < 0.02) continue; // fully transparent (RGB left at 0)
  for (let k = 0; k < 3; k++) {
    const c = src[p * 3 + k];
    out[p * 4 + k] = a >= 0.999 ? c : Math.max(0, Math.min(255, Math.round(255 - (255 - c) / a)));
  }
  out[p * 4 + 3] = Math.round(a * 255);
}
await sharp(out, { raw: { width: W, height: H, channels: 4 } })
  .resize(meta.width, meta.height, { kernel: 'lanczos3' })
  .png({ compressionLevel: 9 })
  .toFile(OUT);
console.log('wrote', OUT, meta.width + '×' + meta.height);
