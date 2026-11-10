import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { SITE, SITE_URL } from '@/lib/constants';
import { formatDate, getPosts } from '@/lib/wp';
import { BuyBand } from '@/components/home/BuyBand';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Blog: lock advice from the Watchdog team',
  description: 'Guides from the Watchdog Locksmiths team: euro cylinder care, keyed-alike locks, rim and thumb-turn cylinders, extra keys and more.',
  alternates: { canonical: `${SITE_URL}/blog` },
  openGraph: { title: `Blog | ${SITE.name}`, description: 'Lock advice from the Watchdog Locksmiths team.', url: `${SITE_URL}/blog`, type: 'website' },
};

export default async function BlogIndex() {
  const posts = await getPosts();
  const [first, ...rest] = posts;

  return (
    <>
      <section className="bg-cream pt-16 lg:pt-24" aria-labelledby="blog-h1">
        <div className="container-wd">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-block rounded-full bg-red px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">The blog</span>
            <h1 id="blog-h1" className="heading-display mt-5 text-5xl sm:text-6xl">Lock advice, from people who fit them.</h1>
            <p className="mx-auto mt-5 max-w-xl text-charcoal/75">Written by the Watchdog Locksmiths team in Greenford: how to look after a cylinder, which lock suits which door, and how keys and the guarantee work.</p>
          </div>
        </div>
      </section>

      <section className="bg-cream py-14 lg:py-20" aria-label="Articles">
        <div className="container-wd">
          {posts.length === 0 ? (
            <p className="text-center text-charcoal/70">The blog is taking a moment to load. Please try again shortly.</p>
          ) : (
            <>
              {first && (
                <article className="grid overflow-hidden rounded-2xl bg-warm-white shadow-card lg:grid-cols-2">
                  {first.image && (
                    <Link href={`/blog/${first.slug}`} className="relative block aspect-[16/10] bg-cream lg:aspect-auto lg:min-h-[360px]">
                      <Image src={first.image.src} alt={first.image.alt || first.title} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" priority />
                    </Link>
                  )}
                  <div className="flex flex-col justify-center p-8 lg:p-10">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red">Latest · {formatDate(first.date)}</p>
                    <h2 className="heading-display mt-3 text-3xl sm:text-4xl">
                      <Link href={`/blog/${first.slug}`} className="hover:text-red">{first.title}</Link>
                    </h2>
                    <p className="mt-4 text-charcoal/80">{first.excerpt}</p>
                    <Link href={`/blog/${first.slug}`} className="mt-6 inline-flex h-11 w-fit items-center rounded-full bg-near-black px-6 text-sm font-semibold text-white transition-colors hover:bg-red">Read the guide</Link>
                  </div>
                </article>
              )}
              <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((p) => (
                  <li key={p.id}>
                    <article className="flex h-full flex-col overflow-hidden rounded-2xl bg-warm-white shadow-card transition-shadow hover:shadow-card-hover">
                      <Link href={`/blog/${p.slug}`} className="relative block aspect-[16/10] bg-cream">
                        {p.image && <Image src={p.image.src} alt={p.image.alt || p.title} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />}
                      </Link>
                      <div className="flex flex-1 flex-col p-6">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-charcoal/60">{formatDate(p.date)}</p>
                        <h2 className="heading-display mt-2 text-xl">
                          <Link href={`/blog/${p.slug}`} className="hover:text-red">{p.title}</Link>
                        </h2>
                        <p className="mt-2 line-clamp-3 text-sm text-charcoal/75">{p.excerpt}</p>
                        <Link href={`/blog/${p.slug}`} className="mt-4 text-sm font-semibold text-red underline-offset-4 hover:underline">Read more →</Link>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>
      <BuyBand />
    </>
  );
}
