'use client';

import * as React from 'react';
import { cn } from '@/lib/cn';

export interface FaqItem {
  q: string;
  a: string;
}

/** Objection-by-objection FAQ accordion (Ultion pattern) with FAQPage JSON-LD for rich results. */
export function ProductFaq({ items, title = 'Questions, answered' }: { items: FaqItem[]; title?: string }) {
  const [open, setOpen] = React.useState<number | null>(0);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((i) => ({
      '@type': 'Question',
      name: i.q,
      acceptedAnswer: { '@type': 'Answer', text: i.a },
    })),
  };
  return (
    <section className="mt-16 max-w-3xl" aria-labelledby="faq-title">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h2 id="faq-title" className="heading-display text-2xl">{title}</h2>
      <ul className="mt-5 divide-y divide-cream-dark rounded-2xl border border-cream-dark bg-warm-white">
        {items.map((item, i) => {
          const expanded = open === i;
          const id = `faq-${i}`;
          return (
            <li key={item.q}>
              <h3>
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={`${id}-panel`}
                  id={`${id}-button`}
                  onClick={() => setOpen(expanded ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-[15px] font-semibold text-near-black transition-colors duration-150 hover:text-red"
                >
                  {item.q}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={cn('shrink-0 text-red transition-transform duration-150', expanded && 'rotate-45')}>
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              </h3>
              <div id={`${id}-panel`} role="region" aria-labelledby={`${id}-button`} hidden={!expanded} className="px-5 pb-5 text-sm leading-relaxed text-charcoal/85">
                {item.a}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
