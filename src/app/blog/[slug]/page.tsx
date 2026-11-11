import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SITE, SITE_URL } from '@/lib/constants';
import { formatDate, getPost } from '@/lib/wp';
import { BuyBand } from '@/components/home/BuyBand';

export const revalidate = 3600;
export const dynamicParams = true;

/**
 * Posts are generated on first request (ISR, 1 h) rather than at build time: a slow or rate-limited WordPress during
 * a Vercel build used to bake 404s into the deployment. A request-time failure throws, which shows the error page
 * and is not cached, so the next visit retries.
 */
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: 'Article not found' };
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `${SITE_URL}/blog/${post.slug}` },
    openGraph: { title: post.title, description: post.excerpt, url: `${SITE_URL}/blog/${post.slug}`, type: 'article', images: post.image ? [{ url: post.image.src }] : undefined },
  };
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    datePublished: post.date,
    dateModified: post.modified,
    author: { '@type': 'Organization', name: SITE.name },
    publisher: { '@type': 'Organization', name: SITE.name, logo: { '@type': 'ImageObject', url: `${SITE_URL}/brand/watchdog-stays-locked.png` } },
    image: post.image ? [post.image.src] : undefined,
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
  };
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: `${SITE_URL}/blog/${post.slug}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <article className="bg-cream pb-20 pt-12 lg:pb-28 lg:pt-16">
        <div className="container-wd">
          <nav aria-label="Breadcrumb" className="text-xs text-charcoal/60">
            <Link href="/" className="hover:text-red">Home</Link> <span aria-hidden="true">/</span> <Link href="/blog" className="hover:text-red">Blog</Link>
          </nav>
          <header className="mx-auto mt-6 max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red">{formatDate(post.date)}</p>
            <h1 className="heading-display mt-3 text-4xl sm:text-5xl">{post.title}</h1>
            {post.excerpt && <p className="mt-5 text-lg text-charcoal/80">{post.excerpt}</p>}
          </header>
          {post.image && (
            <div className="relative mx-auto mt-10 aspect-[16/9] max-w-4xl overflow-hidden rounded-2xl bg-warm-white">
              <Image src={post.image.src} alt={post.image.alt || post.title} fill sizes="(min-width: 1024px) 896px, 100vw" className="object-cover" priority />
            </div>
          )}
          <div className="prose-wd mx-auto mt-10 max-w-3xl" dangerouslySetInnerHTML={{ __html: post.html }} />
          <p className="mx-auto mt-10 max-w-3xl border-t border-charcoal/10 pt-6 text-sm text-charcoal/70">
            Written by the Watchdog Locksmiths team. Questions about your door? <Link href="/contact" className="font-semibold text-red underline-offset-4 hover:underline">Talk to an expert</Link>.
          </p>
        </div>
      </article>
      <BuyBand />
    </>
  );
}
