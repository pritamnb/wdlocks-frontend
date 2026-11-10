'use client';

import * as React from 'react';
import { CONTACT, SITE } from '@/lib/constants';
import { cn } from '@/lib/cn';

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'error'; message: string } | { kind: 'done'; via: 'email' | 'mail-app' };

const field = 'h-12 w-full rounded-xl border border-charcoal/15 bg-white px-4 text-base text-near-black placeholder:text-charcoal/40 focus:border-red focus:outline-none focus:ring-2 focus:ring-red/30';
const label = 'text-xs font-semibold uppercase tracking-[0.14em] text-charcoal/70';

/** Ultion offers 10-minute slots inside its opening hours; WD has not published hours, so these are plain windows. */
function callbackWindows(now = new Date()): string[] {
  const h = now.getHours();
  const today: string[] = [];
  if (h < 11) today.push('Today, this morning');
  if (h < 16) today.push('Today, this afternoon');
  if (h < 18) today.push('Today, early evening');
  return [...today, 'Tomorrow morning', 'Tomorrow afternoon', 'Any time, whenever suits you'];
}

/** POST to /api/contact; on 503 (no email provider) open the visitor's mail app with the same content. */
async function deliver(payload: Record<string, string>, mailSubject: string, mailBody: string): Promise<Status> {
  try {
    const res = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) return { kind: 'done', via: 'email' };
    const json = (await res.json().catch(() => ({}))) as { error?: string; reason?: string };
    if (res.status === 503 || json.reason === 'not-configured' || json.reason === 'upstream') {
      window.location.href = `mailto:${SITE.email}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`;
      return { kind: 'done', via: 'mail-app' };
    }
    return { kind: 'error', message: json.error ?? 'Something went wrong. Please try again.' };
  } catch {
    window.location.href = `mailto:${SITE.email}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`;
    return { kind: 'done', via: 'mail-app' };
  }
}

function Done({ via, what }: { via: 'email' | 'mail-app'; what: string }) {
  return (
    <div className="text-center" role="status">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red text-white" aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7" /></svg>
      </span>
      <h3 className="heading-display mt-5 text-2xl">{via === 'email' ? 'Got it.' : 'Nearly there.'}</h3>
      <p className="mt-3 text-sm text-charcoal/75">
        {via === 'email' ? `${what} is with the team. We reply during working hours, usually the same day.` : `Your mail app has opened with ${what.toLowerCase()} ready to send to ${SITE.email}. Press send and we will take it from there.`}
      </p>
    </div>
  );
}

/** Ultion's "Request a callback" card. */
export function CallbackForm() {
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [when, setWhen] = React.useState('');
  const [topic, setTopic] = React.useState('');
  const [company, setCompany] = React.useState('');
  const [status, setStatus] = React.useState<Status>({ kind: 'idle' });
  // Server render uses a fixed morning so the markup matches; the client recomputes from the real clock after mount.
  const isClient = React.useSyncExternalStore(() => () => {}, () => true, () => false);
  const windows = isClient ? callbackWindows() : callbackWindows(new Date(2000, 0, 1, 8));

  const canSend = name.trim().length >= 2 && /^[+\d][\d\s()-]{8,19}$/.test(phone.trim()) && !!when && status.kind !== 'sending';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    setStatus({ kind: 'sending' });
    const body = `Name: ${name}\nPhone: ${phone}\nWhen: ${when}${topic ? `\nAbout: ${topic}` : ''}`;
    setStatus(await deliver({ kind: 'callback', name, phone, when, topic, company }, `Callback request: ${name}`, body));
  };

  if (status.kind === 'done') return <Done via={status.via} what="Your callback request" />;

  return (
    <form onSubmit={submit} noValidate>
      <h2 className="heading-display text-2xl sm:text-3xl">Request a callback</h2>
      <p className="mt-2 text-sm text-charcoal/75">Tell us when suits you and one of the team will give you a ring.</p>
      <div className="mt-6 space-y-4">
        <div>
          <label htmlFor="cb-name" className={label}>Your name</label>
          <input id="cb-name" name="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={cn(field, 'mt-1.5')} required />
        </div>
        <div>
          <label htmlFor="cb-phone" className={label}>Your number</label>
          <input id="cb-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={cn(field, 'mt-1.5')} required />
        </div>
        <div>
          <label htmlFor="cb-when" className={label}>When shall we call you?</label>
          <select id="cb-when" name="when" value={when} onChange={(e) => setWhen(e.target.value)} className={cn(field, 'mt-1.5 appearance-none')} required>
            <option value="" disabled>Choose a time</option>
            {windows.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="cb-topic" className={label}>What is it about? <span className="font-normal normal-case tracking-normal text-charcoal/50">(optional)</span></label>
          <select id="cb-topic" name="topic" value={topic} onChange={(e) => setTopic(e.target.value)} className={cn(field, 'mt-1.5 appearance-none')}>
            <option value="">Choose a topic</option>
            {CONTACT.topics.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="hidden" aria-hidden="true">
          <label htmlFor="cb-company">Company</label>
          <input id="cb-company" name="company" tabIndex={-1} autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)} />
        </div>
      </div>
      {status.kind === 'error' && <p role="alert" className="mt-4 text-sm text-red">{status.message}</p>}
      <button type="submit" disabled={!canSend} className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-red px-6 text-sm font-semibold text-white transition-colors hover:bg-red-deep disabled:opacity-50">
        {status.kind === 'sending' ? 'Booking…' : 'Book my call'}
      </button>
      <p className="mt-3 text-xs text-charcoal/60">We only use your number to return this call. Nothing is stored on this site.</p>
    </form>
  );
}

/** wdlocks.co.uk's "Send a message" form, rebuilt (the WordPress one cannot submit). */
export function MessageForm() {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [subject, setSubject] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [company, setCompany] = React.useState('');
  const [status, setStatus] = React.useState<Status>({ kind: 'idle' });

  const canSend = name.trim().length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && message.trim().length >= 5 && status.kind !== 'sending';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    setStatus({ kind: 'sending' });
    const body = `Name: ${name}\nEmail: ${email}\n\n${message}`;
    setStatus(await deliver({ kind: 'message', name, email, subject, message, company }, subject || `Website message from ${name}`, body));
  };

  if (status.kind === 'done') return <Done via={status.via} what="Your message" />;

  return (
    <form onSubmit={submit} noValidate>
      <h2 className="heading-display text-2xl sm:text-3xl">Send us a message</h2>
      <p className="mt-2 text-sm text-charcoal/75">Prefer to write? Drop us a note and we will get back to you by email.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="msg-name" className={label}>Your name</label>
          <input id="msg-name" name="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={cn(field, 'mt-1.5')} required />
        </div>
        <div>
          <label htmlFor="msg-email" className={label}>Your email address</label>
          <input id="msg-email" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={cn(field, 'mt-1.5')} required />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="msg-subject" className={label}>Subject</label>
          <input id="msg-subject" name="subject" list="msg-topics" value={subject} onChange={(e) => setSubject(e.target.value)} className={cn(field, 'mt-1.5')} placeholder="e.g. Which size do I need?" />
          <datalist id="msg-topics">{CONTACT.topics.map((t) => <option key={t} value={t} />)}</datalist>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="msg-message" className={label}>Message</label>
          <textarea id="msg-message" name="message" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} className={cn(field, 'mt-1.5 h-auto py-3')} required />
        </div>
        <div className="hidden" aria-hidden="true">
          <label htmlFor="msg-company">Company</label>
          <input id="msg-company" name="company" tabIndex={-1} autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)} />
        </div>
      </div>
      {status.kind === 'error' && <p role="alert" className="mt-4 text-sm text-red">{status.message}</p>}
      <button type="submit" disabled={!canSend} className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-near-black px-7 text-sm font-semibold text-white transition-colors hover:bg-red disabled:opacity-50">
        {status.kind === 'sending' ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}
