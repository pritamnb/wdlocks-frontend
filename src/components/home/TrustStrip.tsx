import Image from 'next/image';
import { TRUST_SIGNALS, WC_BASE } from '@/lib/constants';

export function TrustStrip({ compact = false }: { compact?: boolean }) {
  return (
    <section aria-label="Accreditations" className={compact ? '' : 'border-y border-cream-dark bg-cream-mid'}>
      <ul className={`container-wd flex flex-wrap items-center justify-center gap-x-10 gap-y-4 ${compact ? 'py-4' : 'py-6'}`}>
        {TRUST_SIGNALS.map((t) => (
          <li key={t.id} className="flex items-center gap-3 text-sm font-medium text-charcoal">
            {t.image ? (
              <Image src={t.image} alt="" width={36} height={36} className="h-9 w-9 object-contain" />
            ) : (
              <span aria-hidden="true" className="text-red">◆</span>
            )}
            <span>{t.label}</span>
          </li>
        ))}
        <li className="text-sm">
          <a href={`${WC_BASE}/trade-application/`} rel="noopener" className="font-medium text-charcoal/80 underline decoration-cream-dark underline-offset-4 transition-colors duration-150 hover:text-red hover:decoration-red">
            Are you an installer? Apply for trade →
          </a>
        </li>
      </ul>
    </section>
  );
}
