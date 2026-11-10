'use client';

import * as React from 'react';
import Image from 'next/image';
import { BRAND_RENDERS, GUARANTEE, GUARANTEE_PAGE } from '@/lib/constants';
import { Modal, CloseButton } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';

/**
 * Ultion's `/guarantee-registration/` section: dark two-column panel, "Activate your protection.", the three
 * registration benefits with ticks, and the activation card. In 'handoff' mode the card explains what is needed
 * and sends people to the WordPress form; in 'proxy' mode the full form posts to /api/guarantee.
 */
export function ActivationPanel() {
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [dataOpen, setDataOpen] = React.useState(false);

  return (
    <section className="relative overflow-hidden bg-[#1b1a1c] text-white" aria-labelledby="guarantee-h1">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_40%,rgb(218_21_25/0.16),transparent_55%)]" aria-hidden="true" />
      <div className="container-wd relative grid gap-12 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:py-28">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Protected by Watchdog</p>
          <h1 id="guarantee-h1" className="heading-display mt-4 text-5xl leading-[0.95] text-white sm:text-6xl lg:text-7xl">
            Activate your
            <br />
            <span className="text-red">protection.</span>
          </h1>
          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.14em] text-white/70">Registration benefits</p>
          <ul className="mt-4 space-y-5">
            {GUARANTEE_PAGE.benefits.map((b) => (
              <li key={b.title} className="flex gap-4">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red text-white" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7" /></svg>
                </span>
                <div>
                  <p className="font-semibold text-white">{b.title}</p>
                  <p className="mt-1 max-w-md text-sm leading-relaxed text-white/70">{b.body}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs text-white/50">
            Full guarantee terms are in clause 14 of our{' '}
            <a href={GUARANTEE.termsUrl} rel="noopener" target="_blank" className="underline decoration-white/30 underline-offset-2 hover:text-white">terms and conditions</a>, and summarised below.
          </p>
          <div className="relative mt-10 hidden max-w-xs lg:block">
            <Image src={BRAND_RENDERS.guaranteeKeytag.src} alt={BRAND_RENDERS.guaranteeKeytag.alt} width={BRAND_RENDERS.guaranteeKeytag.width} height={BRAND_RENDERS.guaranteeKeytag.height} sizes="300px" className="w-[260px] -rotate-6 drop-shadow-[0_40px_60px_rgb(0_0_0/0.6)]" />
          </div>
        </div>

        <div className="rounded-2xl bg-warm-white p-6 text-near-black shadow-2xl sm:p-8" id="activate">
          {GUARANTEE.formMode === 'proxy' ? <ProxyForm onHelp={() => setHelpOpen(true)} onData={() => setDataOpen(true)} /> : <HandoffCard onHelp={() => setHelpOpen(true)} onData={() => setDataOpen(true)} />}
        </div>
      </div>

      <Modal open={helpOpen} onClose={() => setHelpOpen(false)} labelledBy="key-help-title">
        <div className="flex items-start justify-between gap-4 p-6 pb-0">
          <h2 id="key-help-title" className="heading-display text-2xl">Where is my key number?</h2>
          <CloseButton onClick={() => setHelpOpen(false)} label="Close" />
        </div>
        <div className="p-6">
          <Image src={BRAND_RENDERS.keysEngraved.src} alt={BRAND_RENDERS.keysEngraved.alt} width={BRAND_RENDERS.keysEngraved.width} height={BRAND_RENDERS.keysEngraved.height} sizes="480px" className="w-full rounded-xl bg-cream" />
          <p className="mt-4 text-sm leading-relaxed text-charcoal/80">
            It is stamped on the bow of every genuine Watchdog key, the flat part you hold, in the form <span className="font-mono font-semibold text-near-black">{GUARANTEE.keyNumberExample}</span>. The same number is printed on the security card in the box. Every key for one lock carries the same number; you only need to enter it once per lock.
          </p>
        </div>
      </Modal>

      <Modal open={dataOpen} onClose={() => setDataOpen(false)} labelledBy="data-title">
        <div className="flex items-start justify-between gap-4 p-6 pb-0">
          <h2 id="data-title" className="heading-display text-2xl">About your data</h2>
          <CloseButton onClick={() => setDataOpen(false)} label="Close" />
        </div>
        <div className="space-y-3 p-6 text-sm leading-relaxed text-charcoal/80">
          <p>We do not ask for your property address, only your name, email address and key number. We do not share your data with anyone else and it is not used for marketing.</p>
          <p>We only use it to send you emails directly related to your Watchdog purchase, guarantee or key-copy protection. Registrations are stored and processed by our third-party security partner.</p>
        </div>
      </Modal>
    </section>
  );
}

function HelperLinks({ onHelp, onData }: { onHelp: () => void; onData: () => void }) {
  return (
    <p className="mt-5 text-xs text-charcoal/70">
      <button type="button" onClick={onHelp} className="underline decoration-charcoal/30 underline-offset-2 hover:text-near-black">Where is my key number?</button>
      {' · '}
      The information you provide is safe and never shared.{' '}
      <button type="button" onClick={onData} className="underline decoration-charcoal/30 underline-offset-2 hover:text-near-black">See details</button>
    </p>
  );
}

function HandoffCard({ onHelp, onData }: { onHelp: () => void; onData: () => void }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red">Two minutes, nothing to pay</p>
      <h2 className="heading-display mt-2 text-2xl sm:text-3xl">Have these three things ready.</h2>
      <ol className="mt-6 space-y-4">
        {[
          { t: 'Your name', d: 'As you would like it on the guarantee.' },
          { t: 'Your email address', d: 'Your activation confirmation goes here.' },
          { t: 'Your key number', d: `Stamped on the key bow, e.g. ${GUARANTEE.keyNumberExample}. One per lock.` },
        ].map((s, i) => (
          <li key={s.t} className="flex gap-4">
            <span className="font-playfair text-2xl font-semibold leading-none text-red" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <p className="font-semibold">{s.t}</p>
              <p className="text-sm text-charcoal/75">{s.d}</p>
            </div>
          </li>
        ))}
      </ol>
      <a href={GUARANTEE.registerUrl} rel="noopener" className="mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-red px-6 text-sm font-semibold text-white transition-colors hover:bg-red-deep">
        Activate now <span aria-hidden="true">↗</span>
      </a>
      <p className="mt-3 text-center text-xs text-charcoal/60">Opens the secure registration form on wdlocks.co.uk. Register within 28 days of fitting.</p>
      <HelperLinks onHelp={onHelp} onData={onData} />
    </div>
  );
}

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'error'; message: string; redirect?: string } | { kind: 'done'; message: string };

function ProxyForm({ onHelp, onData }: { onHelp: () => void; onData: () => void }) {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [keys, setKeys] = React.useState<string[]>(['']);
  const [installType, setInstallType] = React.useState<'door-and-lock' | 'lock'>('lock');
  const [consent, setConsent] = React.useState(false);
  const [status, setStatus] = React.useState<Status>({ kind: 'idle' });

  const keysValid = keys.filter(Boolean).length > 0 && keys.filter(Boolean).every((k) => GUARANTEE.keyNumberPattern.test(k.trim()));
  const canSend = name.trim().length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && keysValid && consent && status.kind !== 'sending';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    setStatus({ kind: 'sending' });
    try {
      const res = await fetch('/api/guarantee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), keyNumbers: keys.filter(Boolean), installType, consent }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string; error?: string; redirect?: string };
      if (!res.ok || !json.ok) setStatus({ kind: 'error', message: json.error ?? 'Something went wrong.', redirect: json.redirect });
      else setStatus({ kind: 'done', message: json.message ?? 'Your guarantee is being activated.' });
    } catch {
      setStatus({ kind: 'error', message: 'We could not reach the registration service.', redirect: GUARANTEE.registerUrl });
    }
  };

  if (status.kind === 'done') {
    return (
      <div className="text-center" role="status">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red text-white" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7" /></svg>
        </span>
        <h2 className="heading-display mt-5 text-2xl">You are protected.</h2>
        <p className="mt-3 text-sm text-charcoal/75">{status.message} Keep your email confirmation with your lock paperwork.</p>
      </div>
    );
  }

  const field = 'h-12 w-full rounded-xl border border-charcoal/15 bg-white px-4 text-base text-near-black placeholder:text-charcoal/40 focus:border-red focus:outline-none focus:ring-2 focus:ring-red/30';

  return (
    <form onSubmit={submit} noValidate>
      <h2 className="heading-display text-2xl sm:text-3xl">Register your lock.</h2>
      <div className="mt-6 space-y-4">
        <div>
          <label htmlFor="g-name" className="text-xs font-semibold uppercase tracking-[0.14em] text-charcoal/70">Your name</label>
          <input id="g-name" name="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={cn(field, 'mt-1.5')} required />
        </div>
        <div>
          <label htmlFor="g-email" className="text-xs font-semibold uppercase tracking-[0.14em] text-charcoal/70">Your email address</label>
          <input id="g-email" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={cn(field, 'mt-1.5')} required />
        </div>
        {keys.map((k, i) => (
          <div key={i}>
            <label htmlFor={`g-key-${i}`} className="text-xs font-semibold uppercase tracking-[0.14em] text-charcoal/70">Key number {keys.length > 1 ? i + 1 : ''}</label>
            <div className="mt-1.5 flex gap-2">
              <input
                id={`g-key-${i}`}
                name={`key-${i}`}
                value={k}
                placeholder={GUARANTEE.keyNumberExample}
                autoCapitalize="characters"
                onChange={(e) => setKeys((all) => all.map((v, j) => (j === i ? e.target.value.toUpperCase() : v)))}
                className={cn(field, 'font-mono uppercase')}
              />
              {keys.length > 1 && (
                <button type="button" onClick={() => setKeys((all) => all.filter((_, j) => j !== i))} aria-label={`Remove key number ${i + 1}`} className="h-12 w-12 shrink-0 rounded-xl border border-charcoal/15 text-charcoal/60 hover:border-red hover:text-red">×</button>
              )}
            </div>
          </div>
        ))}
        {keys.length < GUARANTEE.maxKeys && (
          <button type="button" onClick={() => setKeys((all) => [...all, ''])} className="text-sm font-semibold text-red underline-offset-4 hover:underline">+ Add another key number</button>
        )}
        <fieldset className="pt-2">
          <legend className="text-xs font-semibold uppercase tracking-[0.14em] text-charcoal/70">What was installed?</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {([
              ['door-and-lock', 'A new door and lock'],
              ['lock', 'A new lock only'],
            ] as const).map(([value, label]) => (
              <label key={value} className={cn('flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm', installType === value ? 'border-red bg-red/5' : 'border-charcoal/15 hover:border-charcoal/40')}>
                <input type="radio" name="installType" value={value} checked={installType === value} onChange={() => setInstallType(value)} className="accent-red" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex items-start gap-3 text-xs leading-relaxed text-charcoal/75">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-red" required />
          By activating my guarantee I am happy for my data to be securely stored by a third-party security partner for the purposes of registering my guarantee.
        </label>
      </div>
      {status.kind === 'error' && (
        <p role="alert" className="mt-4 text-sm text-red">
          {status.message}{' '}
          {status.redirect && <a href={status.redirect} rel="noopener" className="underline">Use the form on wdlocks.co.uk</a>}
        </p>
      )}
      <button type="submit" disabled={!canSend} className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-red px-6 text-sm font-semibold text-white transition-colors hover:bg-red-deep disabled:opacity-50">
        {status.kind === 'sending' ? 'Activating…' : 'Activate now'}
      </button>
      <HelperLinks onHelp={onHelp} onData={onData} />
    </form>
  );
}
