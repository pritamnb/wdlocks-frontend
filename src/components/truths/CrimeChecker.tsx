'use client';

import * as React from 'react';
import { CRIME_CHECKER } from '@/lib/constants';
import type { CrimeSummary, Radius } from '@/lib/crime';
import { cn } from '@/lib/cn';

type State = { status: 'idle' } | { status: 'loading' } | { status: 'error'; message: string } | { status: 'done'; data: CrimeSummary };

/**
 * Ultion's `section-area-crime`: "How secure is your area?" postcode checker. Ours posts the postcode (or the browser's
 * location) to /api/crime, which summarises the latest six months from data.police.uk, and shows an OpenStreetMap embed
 * centred on the search instead of a keyed Google map.
 */
export function CrimeChecker() {
  const [postcode, setPostcode] = React.useState('');
  const [radius, setRadius] = React.useState<Radius>(1);
  const [state, setState] = React.useState<State>({ status: 'idle' });
  const lastQuery = React.useRef<{ postcode?: string; lat?: number; lng?: number } | null>(null);
  const resultsRef = React.useRef<HTMLDivElement>(null);

  const run = React.useCallback(async (query: { postcode?: string; lat?: number; lng?: number }, r: Radius) => {
    lastQuery.current = query;
    setState({ status: 'loading' });
    try {
      const res = await fetch('/api/crime', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...query, radius: r }) });
      const json = (await res.json()) as CrimeSummary | { error: string };
      if (!res.ok || 'error' in json) {
        setState({ status: 'error', message: 'error' in json ? json.error : 'Something went wrong. Please try again.' });
        return;
      }
      setState({ status: 'done', data: json });
      requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
    } catch {
      setState({ status: 'error', message: 'We could not reach the crime data service. Please try again.' });
    }
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postcode.trim()) {
      setState({ status: 'error', message: 'Enter your postcode first.' });
      return;
    }
    void run({ postcode: postcode.trim() }, radius);
  };

  const useLocation = () => {
    if (!('geolocation' in navigator)) {
      setState({ status: 'error', message: 'Your browser does not share location. Enter a postcode instead.' });
      return;
    }
    setState({ status: 'loading' });
    navigator.geolocation.getCurrentPosition(
      (pos) => void run({ lat: pos.coords.latitude, lng: pos.coords.longitude }, radius),
      () => setState({ status: 'error', message: 'We could not get your location. Enter a postcode instead.' }),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };

  const changeRadius = (r: Radius) => {
    setRadius(r);
    if (lastQuery.current && state.status !== 'loading') void run(lastQuery.current, r);
  };

  return (
    <section id="crime-checker" className="bg-[#1b1a1c] py-20 text-white lg:py-28" aria-labelledby="crime-title">
      <div className="container-wd grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <h2 id="crime-title" className="heading-display text-4xl text-white sm:text-5xl">
            How <span className="text-red">secure</span>
            <br />
            is your area?
          </h2>
          <p className="mt-6 max-w-md text-base leading-relaxed text-white/75">
            Our crime checker gives you the what, where and when of recorded crime around any UK postcode over the latest six months the police
            have published. Straight from Police data, so you can decide whether it is time to protect your home with a lock that is worth locking.
          </p>

          <form onSubmit={onSubmit} className="mt-8 max-w-md" noValidate>
            <label htmlFor="crime-postcode" className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">Your postcode</label>
            <div className="mt-2 flex gap-2">
              <input
                id="crime-postcode"
                name="postcode"
                type="text"
                inputMode="text"
                autoComplete="postal-code"
                autoCapitalize="characters"
                placeholder="e.g. SW1A 1AA"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                className="h-12 min-w-0 flex-1 rounded-full border border-white/15 bg-white px-5 text-base text-near-black placeholder:text-charcoal/40 focus:border-red focus:outline-none focus:ring-2 focus:ring-red/40"
              />
              <button type="submit" disabled={state.status === 'loading'} className="h-12 shrink-0 rounded-full bg-red px-6 text-sm font-semibold text-white transition-colors hover:bg-red-deep disabled:opacity-60">
                {state.status === 'loading' ? 'Checking…' : 'Search'}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
              <button type="button" onClick={useLocation} className="inline-flex items-center gap-1.5 text-white/75 underline decoration-white/30 underline-offset-4 hover:text-white">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="8" /></svg>
                Use my location
              </button>
              <fieldset className="flex items-center gap-1 rounded-full border border-white/15 p-1">
                <legend className="sr-only">Radius</legend>
                {CRIME_CHECKER.radii.map((r) => (
                  <label key={r} className={cn('cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition-colors', radius === r ? 'bg-white text-near-black' : 'text-white/70 hover:text-white')}>
                    <input type="radio" name="radius" value={r} checked={radius === r} onChange={() => changeRadius(r)} className="sr-only" />
                    {r} mile{r > 1 ? 's' : ''}
                  </label>
                ))}
              </fieldset>
            </div>
            {state.status === 'error' && (
              <p role="alert" className="mt-3 text-sm text-red">{state.message}</p>
            )}
          </form>
          <p className="mt-6 max-w-md text-xs text-white/40">
            Your postcode is sent to our server only to look up the area and is not stored. {CRIME_CHECKER.attribution}
          </p>
        </div>

        <div ref={resultsRef} className="scroll-mt-28" aria-live="polite">
          {state.status === 'done' ? <Results data={state.data} /> : <Placeholder loading={state.status === 'loading'} />}
        </div>
      </div>
    </section>
  );
}

function Placeholder({ loading }: { loading: boolean }) {
  return (
    <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-white/15 bg-[#111013] p-8 text-center">
      <div>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={cn('mx-auto text-white/40', loading && 'animate-pulse text-red')}>
          <path d="M12 22s7-5.5 7-12a7 7 0 1 0-14 0c0 6.5 7 12 7 12Z" /><circle cx="12" cy="10" r="2.5" />
        </svg>
        <p className="mt-4 text-sm text-white/60">{loading ? 'Fetching the latest six months of Police data…' : 'Enter a postcode to see recorded crime around it.'}</p>
      </div>
    </div>
  );
}

function Results({ data }: { data: CrimeSummary }) {
  const maxMonth = Math.max(1, ...data.months.map((m) => m.total));
  const top = data.categories.slice(0, 6);
  const maxCat = Math.max(1, ...top.map((c) => c.count));
  const span = data.radius * 0.0145;
  const lngSpan = span / Math.cos((data.centre.lat * Math.PI) / 180);
  const bbox = `${(data.centre.lng - lngSpan).toFixed(4)},${(data.centre.lat - span).toFixed(4)},${(data.centre.lng + lngSpan).toFixed(4)},${(data.centre.lat + span).toFixed(4)}`;
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${data.centre.lat},${data.centre.lng}`;
  const first = data.months[0]?.label;
  const last = data.months[data.months.length - 1]?.label;
  const where = data.place.outcode ? `${data.place.outcode}, ${data.place.district}` : data.place.district;

  return (
    <div className="overflow-hidden rounded-2xl bg-[#111013] ring-1 ring-white/10">
      <div className="relative aspect-[16/9] w-full bg-[#1b1a1c]">
        <iframe
          title={`Map centred on ${where}`}
          src={mapSrc}
          loading="lazy"
          className="absolute inset-0 h-full w-full border-0 grayscale-[0.4] contrast-[1.05]"
          referrerPolicy="no-referrer"
        />
      </div>
      <div className="p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red">Within {data.radius} mile{data.radius > 1 ? 's' : ''} of {where}</p>
        <div className="mt-3 flex flex-wrap items-end gap-x-8 gap-y-3">
          <div>
            <p className="font-playfair text-5xl font-semibold leading-none text-white">{data.total.toLocaleString('en-GB')}</p>
            <p className="mt-1 text-sm text-white/60">recorded crimes, {first} to {last}</p>
          </div>
          <div>
            <p className="font-playfair text-5xl font-semibold leading-none text-red">{data.burglary.toLocaleString('en-GB')}</p>
            <p className="mt-1 text-sm text-white/60">burglaries</p>
          </div>
        </div>
        {data.radiusNote && <p className="mt-3 text-xs text-white/50">{data.radiusNote}</p>}

        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-white">Month by month</h3>
            <ul className="mt-3 flex items-end gap-2" aria-label="Recorded crimes per month">
              {data.months.map((m) => (
                <li key={m.month} className="flex flex-1 flex-col items-center gap-1">
                  <span className="sr-only">{m.label}: {m.total} crimes, {m.burglary} burglaries</span>
                  <div className="flex h-24 w-full items-end rounded-sm bg-white/5" aria-hidden="true">
                    <div className="relative w-full rounded-sm bg-white/25" style={{ height: `${Math.max(4, (m.total / maxMonth) * 100)}%` }}>
                      <div className="absolute inset-x-0 bottom-0 rounded-sm bg-red" style={{ height: `${m.total ? (m.burglary / m.total) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <span className="text-[10px] text-white/50" aria-hidden="true">{m.label.split(' ')[0]}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-white/40"><span className="inline-block h-2 w-2 rounded-sm bg-red align-middle" /> burglary share of each month</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Most recorded</h3>
            <ul className="mt-3 space-y-2">
              {top.map((c) => (
                <li key={c.key}>
                  <div className="flex items-baseline justify-between gap-3 text-xs">
                    <span className={cn('truncate', c.key === 'burglary' ? 'font-semibold text-red' : 'text-white/80')}>{c.label}</span>
                    <span className="shrink-0 tabular-nums text-white/60">{c.count.toLocaleString('en-GB')} · {Math.round(c.share * 100)}%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-white/10" aria-hidden="true">
                    <div className={cn('h-full rounded-full', c.key === 'burglary' ? 'bg-red' : 'bg-white/40')} style={{ width: `${(c.count / maxCat) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-6 text-[11px] leading-relaxed text-white/40">{data.attribution} Locations are approximate street-level points published by police forces, and the latest month available is usually two to three months old. Some forces publish incomplete data (Greater Manchester Police, for example), so a low count can mean missing data rather than low crime.</p>
      </div>
    </div>
  );
}
