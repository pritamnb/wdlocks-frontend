import Image from 'next/image';
import { TRUST_SIGNALS, TRUSTPILOT_URL } from '@/lib/constants';

export function TrustStrip({ compact = false }: { compact?: boolean }) {
  return (
    <section aria-label="Accreditations" className={compact ? '' : 'border-y border-cream-dark bg-cream-mid'}>
      <ul className={`container-wd flex flex-wrap items-center justify-center gap-x-10 gap-y-4 ${compact ? 'py-4' : 'py-6'}`}>
        {TRUST_SIGNALS.map((t) => (
          <li key={t.id} className="flex items-center gap-3 text-sm font-medium text-charcoal">
            {t.image ? (
              <Image src={t.image} alt="" width={36} height={36} className="h-9 w-9 object-contain" />
            ) : (
              <span aria-hidden="true" className="text-red">{t.id === 'trustpilot' ? '★★★★★' : '◆'}</span>
            )}
            {t.id === 'trustpilot' ? (
              <a href={TRUSTPILOT_URL} rel="noopener" className="hover:text-red transition-colors duration-150">{t.label}</a>
            ) : (
              <span>{t.label}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
