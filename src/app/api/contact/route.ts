import { NextResponse } from 'next/server';
import { SITE } from '@/lib/constants';

export const dynamic = 'force-dynamic';

type Kind = 'callback' | 'message';

interface Body {
  kind?: Kind;
  name?: string;
  phone?: string;
  email?: string;
  when?: string;
  topic?: string;
  subject?: string;
  message?: string;
  /** Honeypot: real visitors never fill it. */
  company?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d][\d\s()-]{8,19}$/;

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\r\n]+/g, ' ').trim().slice(0, max) : '');

/**
 * POST /api/contact — emails a callback request or a message to the sales inbox through Resend.
 * Returns 503 { reason: 'not-configured' } when RESEND_API_KEY is absent so the page can fall back
 * to the visitor's mail app. Nothing is stored here.
 */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  if (body.company) return NextResponse.json({ ok: true }); // honeypot: pretend success, send nothing

  const kind: Kind = body.kind === 'callback' ? 'callback' : 'message';
  const name = clean(body.name, 120);
  const phone = clean(body.phone, 30);
  const email = clean(body.email, 160);
  const when = clean(body.when, 60);
  const topic = clean(body.topic, 80);
  const subject = clean(body.subject, 160);
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 4000) : '';

  if (name.length < 2) return NextResponse.json({ error: 'Enter your name.' }, { status: 422 });
  if (kind === 'callback') {
    if (!PHONE_RE.test(phone)) return NextResponse.json({ error: 'Enter a phone number we can call.' }, { status: 422 });
    if (!when) return NextResponse.json({ error: 'Choose when we should call.' }, { status: 422 });
  } else {
    if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 422 });
    if (message.length < 5) return NextResponse.json({ error: 'Tell us how we can help.' }, { status: 422 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Email delivery is not configured.', reason: 'not-configured' }, { status: 503 });

  const to = process.env.CONTACT_TO || SITE.email;
  const from = process.env.CONTACT_FROM || `${SITE.name} <noreply@wdlocks.co.uk>`;
  const mailSubject = kind === 'callback' ? `Callback request: ${name}${when ? ` (${when})` : ''}` : `Website message: ${subject || name}`;
  const lines =
    kind === 'callback'
      ? [`Callback request from the website`, ``, `Name: ${name}`, `Phone: ${phone}`, `When: ${when}`, topic ? `About: ${topic}` : '', ``, `Sent from ${SITE.name} /contact`]
      : [`Message from the website`, ``, `Name: ${name}`, `Email: ${email}`, subject ? `Subject: ${subject}` : '', ``, message, ``, `Sent from ${SITE.name} /contact`];

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], reply_to: email || undefined, subject: mailSubject, text: lines.filter((l) => l !== '').join('\n') }),
      cache: 'no-store',
    });
    if (!res.ok) {
      console.error('[api/contact] resend', res.status, await res.text().catch(() => ''));
      return NextResponse.json({ error: 'We could not send that just now.', reason: 'upstream' }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[api/contact]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'We could not send that just now.', reason: 'upstream' }, { status: 502 });
  }
}
