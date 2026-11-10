import { NextResponse } from 'next/server';
import { CRIME_CHECKER } from '@/lib/constants';
import { geocodePostcode, isValidPostcode, reverseGeocode, summariseCrime, type Radius } from '@/lib/crime';

export const dynamic = 'force-dynamic';

interface Body {
  postcode?: string;
  lat?: number;
  lng?: number;
  radius?: number;
}

/**
 * POST /api/crime — { postcode } or { lat, lng }, plus radius (1 | 3).
 * A POST body keeps the visitor's postcode or location out of URLs and logs.
 */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const radius = (CRIME_CHECKER.radii as readonly number[]).includes(body.radius ?? 1) ? ((body.radius ?? 1) as Radius) : 1;

  try {
    let lat: number;
    let lng: number;
    let place: { district: string; outcode: string | null };

    if (typeof body.postcode === 'string' && body.postcode.trim()) {
      if (!isValidPostcode(body.postcode)) {
        return NextResponse.json({ error: 'That does not look like a UK postcode.' }, { status: 422 });
      }
      const geo = await geocodePostcode(body.postcode);
      if (!geo) return NextResponse.json({ error: 'We could not find that postcode.' }, { status: 404 });
      ({ lat, lng } = geo);
      place = { district: geo.district, outcode: geo.outcode };
    } else if (typeof body.lat === 'number' && typeof body.lng === 'number' && Number.isFinite(body.lat) && Number.isFinite(body.lng)) {
      if (body.lat < 49 || body.lat > 61 || body.lng < -9 || body.lng > 2.5) {
        return NextResponse.json({ error: 'Police data covers England, Wales and Northern Ireland only.' }, { status: 422 });
      }
      lat = body.lat;
      lng = body.lng;
      place = await reverseGeocode(lat, lng);
    } else {
      return NextResponse.json({ error: 'Enter a postcode or share your location.' }, { status: 400 });
    }

    const summary = await summariseCrime(lat, lng, radius, place);
    return NextResponse.json(summary, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[api/crime]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Police data is not responding right now. Please try again in a moment.' }, { status: 502 });
  }
}
