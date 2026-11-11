import Image from 'next/image';
import Link from 'next/link';
import { TRUST_SIGNALS } from '@/lib/constants';
import { cn } from '@/lib/cn';

/** Thin accreditation bar. `tone="dark"` is the Ultion-style strip under the hero; default is the cream version used on product pages. */
export function TrustStrip({ compact = false, tone = 'light' }: { compact?: boolean; tone?: 'light' | 'dark' }) {
  const dark = tone === 'dark';
  return (
    <section aria-label="Accreditations" className={cn(dark ? 'border-y border-white/10 bg-near-black text-white' : compact ? '' : 'border-y border-cream-dark bg-cream-mid')}>
      <ul className={cn('container-wd flex flex-wrap items-center gap-x-8 gap-y-3', dark ? 'justify-between py-3' : compact ? 'justify-center py-4' : 'justify-center py-6')}>
        <li className="grid w-full grid-cols-2 gap-x-4 gap-y-3 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:gap-x-8">
          {TRUST_SIGNALS.map((t) => (
            <span key={t.id} className={cn('flex items-center gap-2.5 text-[13px] font-medium sm:text-sm', dark ? 'text-white/85' : 'text-charcoal')}>
              {t.image ? (
                <Image src={t.image} alt="" width={32} height={32} className={cn('h-8 w-8 object-contain', dark && 'rounded bg-white p-0.5')} />
              ) : (
                <span aria-hidden="true" className="text-red">◆</span>
              )}
              <span>{t.label}</span>
            </span>
          ))}
        </li>
        <li className="w-full text-center text-sm sm:w-auto sm:text-left">
          <Link href="/trade" className={cn('font-medium underline underline-offset-4 transition-colors duration-150 hover:text-red', dark ? 'text-white/80 decoration-white/30' : 'text-charcoal/80 decoration-cream-dark hover:decoration-red')}>
            Are you an installer? Apply for trade →
          </Link>
        </li>
      </ul>
    </section>
  );
}
