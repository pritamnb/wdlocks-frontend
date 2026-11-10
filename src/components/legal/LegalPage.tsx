import Link from 'next/link';
import { SITE } from '@/lib/constants';
import { formatDate, type WpPage } from '@/lib/wp';

/** Long-form legal page (terms, privacy) rendered from the WordPress page content. */
export function LegalPage({ page, title, intro, fallbackHref }: { page: WpPage | null; title: string; intro: string; fallbackHref: string }) {
  return (
    <article className="bg-cream pb-20 pt-12 lg:pb-28 lg:pt-16">
      <div className="container-wd">
        <nav aria-label="Breadcrumb" className="text-xs text-charcoal/60">
          <Link href="/" className="hover:text-red">Home</Link> <span aria-hidden="true">/</span> {title}
        </nav>
        <header className="mt-6 max-w-3xl">
          <h1 className="heading-display text-4xl sm:text-5xl">{title}</h1>
          <p className="mt-4 text-charcoal/75">{intro}</p>
          {page && <p className="mt-2 text-xs text-charcoal/55">Last updated {formatDate(page.modified)}.</p>}
        </header>
        {page ? (
          <div className="prose-wd mt-10 max-w-3xl [&_p]:leading-relaxed" dangerouslySetInnerHTML={{ __html: page.html }} />
        ) : (
          <p className="mt-10 max-w-3xl text-charcoal/75">
            This document is taking a moment to load. You can read it on{' '}
            <a href={fallbackHref} rel="noopener" className="font-semibold text-red underline-offset-4 hover:underline">wdlocks.co.uk</a>{' '}
            or call {SITE.phone}.
          </p>
        )}
      </div>
    </article>
  );
}
