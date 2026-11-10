import { NextResponse } from 'next/server';
import { GUARANTEE } from '@/lib/constants';

export const dynamic = 'force-dynamic';

interface Body {
  name?: string;
  email?: string;
  keyNumbers?: string[];
  installType?: 'door-and-lock' | 'lock';
  consent?: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/guarantee — forwards a registration to the Elementor form on wdlocks.co.uk, where activations are
 * recorded today. Only used when GUARANTEE.formMode is 'proxy'. Nothing is stored here.
 */
export async function POST(req: Request) {
  if (GUARANTEE.formMode !== 'proxy') {
    return NextResponse.json({ error: 'Registration is handled on wdlocks.co.uk.', redirect: GUARANTEE.registerUrl }, { status: 409 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const name = (body.name ?? '').trim();
  const email = (body.email ?? '').trim();
  const keys = (body.keyNumbers ?? []).map((k) => k.trim().toUpperCase()).filter(Boolean).slice(0, GUARANTEE.maxKeys);

  if (name.length < 2 || name.length > 120) return NextResponse.json({ error: 'Enter your name.' }, { status: 422 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 422 });
  if (keys.length === 0 || keys.some((k) => !GUARANTEE.keyNumberPattern.test(k))) {
    return NextResponse.json({ error: `Enter the key number stamped on your key, e.g. ${GUARANTEE.keyNumberExample}.` }, { status: 422 });
  }
  if (!body.consent) return NextResponse.json({ error: 'Please confirm you are happy for your data to be stored for the guarantee.' }, { status: 422 });

  const message = [
    `Key number${keys.length > 1 ? 's' : ''}: ${keys.join(', ')}`,
    `Installation: ${body.installType === 'door-and-lock' ? 'new door and lock' : 'new lock'}`,
    'Submitted from the headless site (/guarantee).',
  ].join('\n');

  const form = new URLSearchParams({
    action: 'elementor_pro_forms_send_form',
    post_id: String(GUARANTEE.form.postId),
    form_id: GUARANTEE.form.formId,
    referer_title: GUARANTEE.form.refererTitle,
    queried_id: String(GUARANTEE.form.postId),
    'form_fields[name]': name,
    'form_fields[email]': email,
    'form_fields[message]': message,
  });

  try {
    const res = await fetch(GUARANTEE.form.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', Referer: GUARANTEE.registerUrl },
      body: form.toString(),
      cache: 'no-store',
    });
    const json = (await res.json().catch(() => null)) as { success?: boolean; data?: { message?: string; errors?: Record<string, string> } } | null;
    if (!res.ok || !json?.success) {
      const detail = json?.data?.errors ? Object.values(json.data.errors).join(' ') : json?.data?.message;
      console.error('[api/guarantee] upstream', res.status, detail);
      return NextResponse.json({ error: 'We could not register your guarantee just now. Please try again or use the form on wdlocks.co.uk.', redirect: GUARANTEE.registerUrl }, { status: 502 });
    }
    return NextResponse.json({ ok: true, message: json.data?.message ?? 'Your guarantee is being activated.' });
  } catch (err) {
    console.error('[api/guarantee]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'We could not reach the registration service. Please try again or use the form on wdlocks.co.uk.', redirect: GUARANTEE.registerUrl }, { status: 502 });
  }
}
