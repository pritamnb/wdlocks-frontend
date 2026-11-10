'use client';

import * as React from 'react';
import { TRADE } from '@/lib/constants';
import { cn } from '@/lib/cn';

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'error'; message: string; redirect?: string } | { kind: 'done'; message: string };

const field = 'h-12 w-full rounded-xl border border-charcoal/15 bg-white px-4 text-base text-near-black placeholder:text-charcoal/40 focus:border-red focus:outline-none focus:ring-2 focus:ring-red/30';
const label = 'text-xs font-semibold uppercase tracking-[0.14em] text-charcoal/70';

/**
 * The seven WordPress fields plus an optional volume. In 'proxy' mode it posts to /api/trade, which forwards to the
 * Elementor form; in 'handoff' mode the card explains what is needed and sends people to the WordPress form.
 */
export function TradeForm() {
  return (
    <section id="apply" className="scroll-mt-24 bg-cream py-20 lg:py-28" aria-labelledby="apply-title">
      <div className="container-wd grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red">Trade application</p>
          <h2 id="apply-title" className="heading-display mt-3 text-3xl sm:text-4xl lg:text-5xl">Open your account.</h2>
          <p className="mt-5 max-w-md text-charcoal/80">Thank you for your interest in a trade account with Watchdog Locksmiths. Tell us who you are and what you fit, and the team will come back to you.</p>
          <ul className="mt-6 space-y-2 text-sm text-charcoal/75">
            <li>· Company and contact name</li>
            <li>· Trading address and postcode</li>
            <li>· Email, phone and your type of business</li>
          </ul>
        </div>
        <div className="rounded-2xl bg-warm-white p-7 shadow-card sm:p-8">{TRADE.formMode === 'proxy' ? <ProxyForm /> : <HandoffCard />}</div>
      </div>
    </section>
  );
}

function HandoffCard() {
  return (
    <div>
      <h3 className="heading-display text-2xl">Apply in two minutes.</h3>
      <p className="mt-3 text-sm text-charcoal/75">The application form is on wdlocks.co.uk. Have your company details, trading address and postcode ready.</p>
      <a href={TRADE.applyUrl} rel="noopener" className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-red px-6 text-sm font-semibold text-white transition-colors hover:bg-red-deep">
        Apply for a trade account <span aria-hidden="true">↗</span>
      </a>
      <p className="mt-3 text-center text-xs text-charcoal/60">Opens the secure form on wdlocks.co.uk.</p>
    </div>
  );
}

function ProxyForm() {
  const [v, setV] = React.useState({ company: '', contact: '', address: '', postcode: '', email: '', phone: '', business: '', volume: '', website: '' });
  const [status, setStatus] = React.useState<Status>({ kind: 'idle' });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((s) => ({ ...s, [k]: e.target.value }));

  const canSend =
    v.company.trim().length >= 2 && v.contact.trim().length >= 2 && /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i.test(v.postcode.trim()) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim()) && /^[+\d][\d\s()-]{8,19}$/.test(v.phone.trim()) && !!v.business && status.kind !== 'sending';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    setStatus({ kind: 'sending' });
    try {
      const res = await fetch('/api/trade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v) });
      const json = (await res.json()) as { ok?: boolean; message?: string; error?: string; redirect?: string };
      if (!res.ok || !json.ok) setStatus({ kind: 'error', message: json.error ?? 'Something went wrong.', redirect: json.redirect });
      else setStatus({ kind: 'done', message: json.message ?? 'Your application has been sent.' });
    } catch {
      setStatus({ kind: 'error', message: 'We could not reach the application service.', redirect: TRADE.applyUrl });
    }
  };

  if (status.kind === 'done') {
    return (
      <div className="text-center" role="status">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red text-white" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7" /></svg>
        </span>
        <h3 className="heading-display mt-5 text-2xl">Application sent.</h3>
        <p className="mt-3 text-sm text-charcoal/75">{status.message} The team will be in touch to confirm your account.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <h3 className="heading-display text-2xl">Your details</h3>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="t-company" className={label}>Company name</label>
          <input id="t-company" name="company" autoComplete="organization" value={v.company} onChange={set('company')} className={cn(field, 'mt-1.5')} required />
        </div>
        <div>
          <label htmlFor="t-contact" className={label}>Contact name</label>
          <input id="t-contact" name="contact" autoComplete="name" value={v.contact} onChange={set('contact')} className={cn(field, 'mt-1.5')} required />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="t-address" className={label}>Trading address</label>
          <input id="t-address" name="address" autoComplete="street-address" value={v.address} onChange={set('address')} className={cn(field, 'mt-1.5')} />
        </div>
        <div>
          <label htmlFor="t-postcode" className={label}>Postcode</label>
          <input id="t-postcode" name="postcode" autoComplete="postal-code" autoCapitalize="characters" value={v.postcode} onChange={set('postcode')} className={cn(field, 'mt-1.5 uppercase')} required />
        </div>
        <div>
          <label htmlFor="t-phone" className={label}>Phone number</label>
          <input id="t-phone" name="phone" type="tel" autoComplete="tel" value={v.phone} onChange={set('phone')} className={cn(field, 'mt-1.5')} required />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="t-email" className={label}>Email address</label>
          <input id="t-email" name="email" type="email" autoComplete="email" value={v.email} onChange={set('email')} className={cn(field, 'mt-1.5')} required />
        </div>
        <div>
          <label htmlFor="t-business" className={label}>Type of business</label>
          <select id="t-business" name="business" value={v.business} onChange={set('business')} className={cn(field, 'mt-1.5 appearance-none')} required>
            <option value="" disabled>Choose</option>
            {TRADE.businessTypes.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="t-volume" className={label}>Approximate volume <span className="font-normal normal-case tracking-normal text-charcoal/50">(optional)</span></label>
          <select id="t-volume" name="volume" value={v.volume} onChange={set('volume')} className={cn(field, 'mt-1.5 appearance-none')}>
            <option value="">Choose</option>
            {TRADE.volumes.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="t-website" className={label}>Website <span className="font-normal normal-case tracking-normal text-charcoal/50">(optional)</span></label>
          <input id="t-website" name="website" type="url" autoComplete="url" value={v.website} onChange={set('website')} className={cn(field, 'mt-1.5')} placeholder="https://" />
        </div>
      </div>
      {status.kind === 'error' && (
        <p role="alert" className="mt-4 text-sm text-red">
          {status.message} {status.redirect && <a href={status.redirect} rel="noopener" className="underline">Use the form on wdlocks.co.uk</a>}
        </p>
      )}
      <button type="submit" disabled={!canSend} className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-red px-6 text-sm font-semibold text-white transition-colors hover:bg-red-deep disabled:opacity-50">
        {status.kind === 'sending' ? 'Sending…' : 'Submit application'}
      </button>
      <p className="mt-3 text-xs text-charcoal/60">We only use these details to set up and manage your trade account.</p>
    </form>
  );
}
