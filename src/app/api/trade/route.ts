import { NextResponse } from 'next/server';
import { TRADE } from '@/lib/constants';

export const dynamic = 'force-dynamic';

interface Body {
  company?: string;
  contact?: string;
  address?: string;
  postcode?: string;
  email?: string;
  phone?: string;
  business?: string;
  volume?: string;
  website?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d][\d\s()-]{8,19}$/;
const POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i;
const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\r\n]+/g, ' ').trim().slice(0, max) : '');

/**
 * POST /api/trade — forwards a trade application to the Elementor form on wdlocks.co.uk (post 4783 / form bc00e91),
 * where applications are recorded today. Used only when TRADE.formMode is 'proxy'. Nothing is stored here.
 */
export async function POST(req: Request) {
  if (TRADE.formMode !== 'proxy') {
    return NextResponse.json({ error: 'Applications are handled on wdlocks.co.uk.', redirect: TRADE.applyUrl }, { status: 409 });
  }
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const company = clean(body.company, 120);
  const contact = clean(body.contact, 120);
  const address = clean(body.address, 240);
  const postcode = clean(body.postcode, 10).toUpperCase();
  const email = clean(body.email, 160);
  const phone = clean(body.phone, 30);
  const business = clean(body.business, 80);
  const volume = clean(body.volume, 40);
  const website = clean(body.website, 160);

  if (company.length < 2) return NextResponse.json({ error: 'Enter your company name.' }, { status: 422 });
  if (contact.length < 2) return NextResponse.json({ error: 'Enter a contact name.' }, { status: 422 });
  if (!POSTCODE_RE.test(postcode)) return NextResponse.json({ error: 'Enter a UK postcode.' }, { status: 422 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 422 });
  if (!PHONE_RE.test(phone)) return NextResponse.json({ error: 'Enter a phone number.' }, { status: 422 });
  if (!business) return NextResponse.json({ error: 'Choose your type of business.' }, { status: 422 });

  const f = TRADE.form.fields;
  const form = new URLSearchParams({
    action: 'elementor_pro_forms_send_form',
    post_id: String(TRADE.form.postId),
    form_id: TRADE.form.formId,
    referer_title: TRADE.form.refererTitle,
    queried_id: String(TRADE.form.postId),
    [`form_fields[${f.company}]`]: company,
    [`form_fields[${f.contact}]`]: contact,
    [`form_fields[${f.address}]`]: address,
    [`form_fields[${f.postcode}]`]: postcode,
    [`form_fields[${f.email}]`]: email,
    [`form_fields[${f.phone}]`]: phone,
    [`form_fields[${f.business}]`]: [business, volume ? `Volume: ${volume}` : '', website ? `Website: ${website}` : '', 'Submitted from the headless site (/trade).'].filter(Boolean).join('\n'),
  });

  try {
    const res = await fetch(TRADE.form.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', Referer: TRADE.applyUrl },
      body: form.toString(),
      cache: 'no-store',
    });
    const json = (await res.json().catch(() => null)) as { success?: boolean; data?: { message?: string; errors?: Record<string, string> } } | null;
    if (!res.ok || !json?.success) {
      console.error('[api/trade] upstream', res.status, json?.data?.errors ? Object.values(json.data.errors).join(' ') : json?.data?.message);
      return NextResponse.json({ error: 'We could not send your application just now. Please try again or use the form on wdlocks.co.uk.', redirect: TRADE.applyUrl }, { status: 502 });
    }
    return NextResponse.json({ ok: true, message: json.data?.message ?? 'Your application has been sent.' });
  } catch (err) {
    console.error('[api/trade]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'We could not reach the application service. Please try again or use the form on wdlocks.co.uk.', redirect: TRADE.applyUrl }, { status: 502 });
  }
}
