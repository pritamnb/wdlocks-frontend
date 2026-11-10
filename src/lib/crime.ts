import { CRIME_CHECKER } from '@/lib/constants';

/**
 * Server-side helpers for the postcode crime checker. Talks to data.police.uk (no key, Open Government Licence)
 * and postcodes.io (postcode → coordinates). Nothing personal is stored or logged; the response rounds the centre
 * to three decimals (~100 m) and only returns the postcode district and local authority name.
 */

const POLICE = 'https://data.police.uk/api';
const POSTCODES = 'https://api.postcodes.io/postcodes';
const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i;

export type Radius = (typeof CRIME_CHECKER.radii)[number];

export interface CrimeSummary {
  centre: { lat: number; lng: number };
  place: { district: string; outcode: string | null };
  radius: Radius;
  radiusNote: string | null;
  months: Array<{ month: string; label: string; total: number; burglary: number }>;
  total: number;
  burglary: number;
  categories: Array<{ key: string; label: string; count: number; share: number }>;
  attribution: string;
}

interface PoliceCrime {
  category: string;
  month: string;
}

export function isValidPostcode(value: string): boolean {
  return UK_POSTCODE.test(value.trim());
}

export async function geocodePostcode(postcode: string): Promise<{ lat: number; lng: number; district: string; outcode: string } | null> {
  const clean = postcode.replace(/\s+/g, '').toUpperCase();
  const res = await fetch(`${POSTCODES}/${encodeURIComponent(clean)}`, { next: { revalidate: 86400 } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`postcodes.io ${res.status}`);
  const json = (await res.json()) as { result: { latitude: number; longitude: number; admin_district: string | null; outcode: string } };
  const r = json.result;
  return { lat: r.latitude, lng: r.longitude, district: r.admin_district ?? 'your area', outcode: r.outcode };
}

export async function reverseGeocode(lat: number, lng: number): Promise<{ district: string; outcode: string | null }> {
  try {
    const res = await fetch(`${POSTCODES}?lon=${lng.toFixed(5)}&lat=${lat.toFixed(5)}&limit=1`, { next: { revalidate: 86400 } });
    if (!res.ok) return { district: 'your area', outcode: null };
    const json = (await res.json()) as { result: Array<{ admin_district: string | null; outcode: string }> | null };
    const first = json.result?.[0];
    return first ? { district: first.admin_district ?? 'your area', outcode: first.outcode } : { district: 'your area', outcode: null };
  } catch {
    return { district: 'your area', outcode: null };
  }
}

/** Latest N months the Police API has data for (it lags two to three months behind). */
export async function latestMonths(count: number): Promise<string[]> {
  const res = await fetch(`${POLICE}/crimes-street-dates`, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`police dates ${res.status}`);
  const dates = (await res.json()) as Array<{ date: string }>;
  return dates.slice(0, count).map((d) => d.date);
}

/** 12-point polygon approximating a circle, as the Police API's poly=lat,lng:lat,lng… parameter. */
function circlePoly(lat: number, lng: number, miles: number, points = 12): string {
  const r = miles * 1609.344;
  const out: string[] = [];
  for (let i = 0; i < points; i++) {
    const a = (2 * Math.PI * i) / points;
    const dLat = (r * Math.cos(a)) / 111320;
    const dLng = (r * Math.sin(a)) / (111320 * Math.cos((lat * Math.PI) / 180));
    out.push(`${(lat + dLat).toFixed(5)},${(lng + dLng).toFixed(5)}`);
  }
  return out.join(':');
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchMonth(lat: number, lng: number, radius: Radius, month: string, attempt = 0): Promise<PoliceCrime[] | 'too-many'> {
  const query = radius === 1 ? `lat=${lat.toFixed(5)}&lng=${lng.toFixed(5)}` : `poly=${circlePoly(lat, lng, radius)}`;
  const res = await fetch(`${POLICE}/crimes-street/all-crime?${query}&date=${month}`, { next: { revalidate: 86400 } });
  if (res.status === 503) return 'too-many'; // more than 10,000 incidents in the area
  if (res.status === 429 && attempt < 2) {
    // The Police API rate-limits bursts; back off and try again.
    await sleep(700 * (attempt + 1));
    return fetchMonth(lat, lng, radius, month, attempt + 1);
  }
  if (!res.ok) throw new Error(`police crimes ${res.status}`);
  return (await res.json()) as PoliceCrime[];
}

/** Fetch the months two at a time: the Police API throttles parallel bursts. */
async function fetchMonths(lat: number, lng: number, radius: Radius, months: string[]): Promise<Array<PoliceCrime[] | 'too-many'>> {
  const out: Array<PoliceCrime[] | 'too-many'> = [];
  for (let i = 0; i < months.length; i += 2) {
    const chunk = await Promise.all(months.slice(i, i + 2).map((m) => fetchMonth(lat, lng, radius, m)));
    out.push(...chunk);
    if (chunk.some((c) => c === 'too-many')) break; // no point fetching the rest; the caller falls back to 1 mile
  }
  return out;
}

function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' });
}

export async function summariseCrime(lat: number, lng: number, radius: Radius, place: { district: string; outcode: string | null }): Promise<CrimeSummary> {
  const months = await latestMonths(CRIME_CHECKER.months);
  let effectiveRadius: Radius = radius;
  let radiusNote: string | null = null;

  let results = await fetchMonths(lat, lng, radius, months);
  if (results.some((r) => r === 'too-many') && radius !== 1) {
    effectiveRadius = 1;
    radiusNote = `There are too many recorded incidents within ${radius} miles here to show at once, so this is the 1 mile view.`;
    results = await fetchMonths(lat, lng, 1, months);
  }

  const byCategory = new Map<string, number>();
  const monthRows = months.map((month, i) => {
    const crimes = results[i];
    const list = crimes === 'too-many' ? [] : crimes;
    let burglary = 0;
    for (const c of list) {
      byCategory.set(c.category, (byCategory.get(c.category) ?? 0) + 1);
      if (c.category === 'burglary') burglary++;
    }
    return { month, label: monthLabel(month), total: list.length, burglary };
  });

  const total = monthRows.reduce((n, r) => n + r.total, 0);
  const categories = Array.from(byCategory.entries())
    .map(([key, count]) => ({ key, label: CRIME_CHECKER.categories[key] ?? key, count, share: total ? count / total : 0 }))
    .sort((a, b) => b.count - a.count);

  return {
    centre: { lat: Number(lat.toFixed(3)), lng: Number(lng.toFixed(3)) },
    place,
    radius: effectiveRadius,
    radiusNote,
    months: monthRows.slice().reverse(),
    total,
    burglary: monthRows.reduce((n, r) => n + r.burglary, 0),
    categories,
    attribution: CRIME_CHECKER.attribution,
  };
}
