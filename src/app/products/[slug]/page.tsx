import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getProductBySlugSSR, getProductSlugs } from '@/lib/api';
import { ProductGallery } from '@/components/product/ProductGallery';
import { Breadcrumb } from '@/components/product/Breadcrumb';
import { AddToCart } from '@/components/product/AddToCart';
import { TrustStrip } from '@/components/home/TrustStrip';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ProductFaq } from '@/components/product/ProductFaq';
import { faqsForProduct } from '@/lib/faqs';
import { decodeEntities, productPriceLabel, stripHtml } from '@/lib/wdlocks-api';
import { sanitizeProductHtml } from '@/lib/sanitize';
import { galleryImagesFor } from '@/lib/product-helpers';
import { BRAND_VIDEO, BROCHURE, CATALOGUE_BY_ID, KEY_PRODUCT_IDS, PRODUCT_BULLETS, PRODUCT_FEATURES, PRODUCT_IDS, PRODUCT_PILLS, PRODUCT_SUBTITLES, SITE, SITE_URL } from '@/lib/constants';
import { LockFeatureSections } from '@/components/product/LockFeatureSections';
import { KeysConfigurator } from '@/components/product/KeysConfigurator';
import { KeysFeatureSections } from '@/components/product/KeysFeatureSections';
import { ProductFeatureTiles, KeyedAlikeDoors, ProductCloser } from '@/components/product/ProductFeatureTiles';
import { InlineFilm } from '@/components/media/InlineFilm';
import { ChapterLoop } from '@/components/media/ChapterLoop';

export const revalidate = 60;
export const dynamicParams = true;

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return getProductSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlugSSR(slug);
  if (!product) return { title: 'Product not found' };
  const name = decodeEntities(product.name);
  const description = stripHtml(product.short_description || product.description, 155) || SITE.description;
  const image = product.images[0]?.src;
  return {
    title: name,
    description,
    alternates: { canonical: `/products/${slug}` },
    openGraph: {
      type: 'website',
      title: name,
      description,
      url: `${SITE_URL}/products/${slug}`,
      ...(image ? { images: [{ url: image, alt: product.images[0]?.alt || name }] } : {}),
    },
    twitter: { card: 'summary_large_image', title: name, description, ...(image ? { images: [image] } : {}) },
  };
}

export default async function ProductPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const product = await getProductBySlugSSR(slug);
  if (!product) notFound();

  const name = decodeEntities(product.name);
  const entry = CATALOGUE_BY_ID[product.id];
  const gallery = galleryImagesFor(product.id, product.images);
  const category = entry?.category ?? product.categories[0]?.name;
  const price = Number.parseInt(product.prices.price, 10) / 10 ** product.prices.currency_minor_unit;

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description: stripHtml(product.short_description || product.description, 300),
    image: gallery.map((i) => (i.src.startsWith('/') ? `${SITE_URL}${i.src}` : i.src)),
    sku: product.sku || undefined,
    brand: { '@type': 'Brand', name: 'Watchdog' },
    url: `${SITE_URL}/products/${slug}`,
    offers: {
      '@type': 'Offer',
      priceCurrency: product.prices.currency_code,
      price: price.toFixed(2),
      availability: product.is_in_stock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${SITE_URL}/products/${slug}`,
      seller: { '@type': 'Organization', name: SITE.name },
    },
    ...(product.id === PRODUCT_IDS.CYLINDER_LOCK
      ? {
          video: {
            '@type': 'VideoObject',
            name: BRAND_VIDEO.film.title,
            description: 'Manufacturer film showing the dimple and snake key, the 11-pin mechanism, the Always Locked Protection System and the engraved security markings.',
            thumbnailUrl: `${SITE_URL}${BRAND_VIDEO.film.poster}`,
            contentUrl: `${SITE_URL}${BRAND_VIDEO.film.mp4}`,
            duration: BRAND_VIDEO.film.durationIso,
            uploadDate: '2026-11-10',
          },
        }
      : {}),
  };

  return (
    <div className="bg-white"><div className="container-wd py-8 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Products', href: '/products' }, { label: entry?.shortName ?? name }]} />

      <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-14">
        <div>
          <ProductGallery images={gallery} name={name} badge={PRODUCT_PILLS[product.id]?.[0]?.includes('3★') ? 'star security' : undefined} />
          {KEY_PRODUCT_IDS.has(product.id) && (
            <figure className="mt-4 overflow-hidden rounded-[1.5rem] bg-near-black shadow-card">
              <ChapterLoop clip="keyTurntable" blend="plain" />
              <figcaption className="px-4 pb-4 text-center text-xs text-white/60">The Watchdog Stays Locked key — dimple cuts and snake groove, cut against your key number.</figcaption>
            </figure>
          )}
          {KEY_PRODUCT_IDS.has(product.id) && (
            <p className="mt-3 flex items-center justify-center gap-2 rounded-full border border-red/30 bg-red/5 px-4 py-2 text-xs font-medium text-red">
              <span aria-hidden="true">⚠</span> Non-genuine keys damage your lock and invalidate your guarantee.
            </p>
          )}
        </div>

        <div>
          {PRODUCT_PILLS[product.id] ? (
            <ul className="flex flex-wrap gap-2" aria-label="Certifications">
              {PRODUCT_PILLS[product.id]!.map((pill, i) => (
                <li key={pill} className={i === 0 ? 'inline-flex h-7 items-center gap-1.5 rounded-full bg-near-black px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-white' : 'inline-flex h-7 items-center gap-1.5 rounded-full border border-charcoal/30 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-near-black'}>
                  {i === 0 ? '🛡' : '✓'} {pill}
                </li>
              ))}
            </ul>
          ) : (
            category && <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red">{category}</p>
          )}
          <h1 className="heading-display mt-3 text-3xl leading-tight sm:text-4xl">{name}</h1>
          {PRODUCT_SUBTITLES[product.id] && <p className="mt-2 text-lg text-charcoal/75">{PRODUCT_SUBTITLES[product.id]}</p>}

          <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="font-playfair text-3xl font-semibold tabular-nums text-near-black">{productPriceLabel(product)}</p>
            <p className="text-sm text-charcoal/75">inc. VAT</p>
            <p className={`text-sm font-medium ${product.is_in_stock ? 'text-emerald-700' : 'text-red'}`}>
              {product.is_in_stock ? '● In stock' : '● Out of stock'}
              {product.low_stock_remaining ? ` — only ${product.low_stock_remaining} left` : ''}
            </p>
          </div>

          {product.short_description && (
            PRODUCT_BULLETS[product.id] ? (
              <ul className="mt-5 space-y-2 text-[15px] text-charcoal/90">
                {PRODUCT_BULLETS[product.id]!.map((b) => (
                  <li key={b} className="flex gap-2.5"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red" aria-hidden="true" />{b}</li>
                ))}
              </ul>
            ) : (
            <div className="prose-wd mt-4 text-[15px]" dangerouslySetInnerHTML={{ __html: sanitizeProductHtml(product.short_description) }} />
            )
          )}

          <ul className="mt-5 grid grid-cols-2 gap-2 text-sm text-charcoal/85 sm:grid-cols-3">
            {['BSI Kitemark TS 007 3★', 'Sold Secure Diamond', 'Secured by Design', 'Same-day dispatch < 2pm', '3 keys included', 'Tracked UK delivery'].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <span aria-hidden="true" className="text-red">✓</span>
                {t}
              </li>
            ))}
          </ul>

          <div className="mt-8">
            <ErrorBoundary>
              {product.id === PRODUCT_IDS.EXTRA_KEYS_3 || product.id === PRODUCT_IDS.EXTRA_KEYS_1 ? <KeysConfigurator product={product} /> : <AddToCart product={product} />}
            </ErrorBoundary>
          </div>

          <p className="mt-4 text-xs text-charcoal/75">
            Secure checkout on wdlocks.co.uk. Questions? Call{' '}
            <a href={SITE.phoneHref} className="font-medium text-near-black hover:text-red">{SITE.phone}</a>.
          </p>
        </div>
      </div>

      {(product.id === PRODUCT_IDS.CYLINDER_LOCK || product.id === PRODUCT_IDS.THUMB_TURN) && <LockFeatureSections />}
      {(product.id === PRODUCT_IDS.EXTRA_KEYS_3 || product.id === PRODUCT_IDS.EXTRA_KEYS_1) && <KeysFeatureSections />}
      {PRODUCT_FEATURES[product.id] && (
        <>
          {product.id === PRODUCT_IDS.KEYED_ALIKE && <KeyedAlikeDoors />}
          <ProductFeatureTiles features={PRODUCT_FEATURES[product.id]!} fallbackImage={product.images[0]?.src} />
          <ProductCloser
            eyebrow="Get the 3 Star lock"
            title={<>Fitted by locksmiths <span className="text-red">across the UK</span>.</>}
            body="Every Watchdog door lock carries the BSI Kitemark 3 Star and ships the same day before 2pm with three keys in the box."
            cta="Choose a Watchdog lock"
            href="/products/3-star-alps-cylinder-door-lock"
          />
        </>
      )}

      {product.id === PRODUCT_IDS.CYLINDER_LOCK && (
        <section className="mt-16 border-t border-black/10 pt-14" aria-labelledby="product-film-title">
          <InlineFilm
            src={BRAND_VIDEO.explainerInline.mp4}
            poster={BRAND_VIDEO.explainerInline.poster}
            ariaLabel={BRAND_VIDEO.explainerInline.title}
            chapters={BRAND_VIDEO.explainerInline.chapterList}
            tone="light"
            mediaSide="left"
            caption={`Manufacturer film · ${BRAND_VIDEO.explainerInline.durationLabel} · plays silently until you turn the sound on.`}
            heading={
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red">See it work</p>
                <h2 id="product-film-title" className="heading-display mt-3 text-2xl sm:text-3xl">
                  How a Watchdog lock works.
                </h2>
                <p className="mt-4 text-charcoal/80">
                  The dimple and snake key, the 11-pin stack, the ALPS cam that locks the moment the key comes out, and the
                  marks engraved on every cylinder. Pick a chapter to jump to it.
                </p>
              </>
            }
          />
        </section>
      )}

      {product.description && (
        <section className="mt-16 max-w-3xl" aria-labelledby="description-title">
          <h2 id="description-title" className="heading-display text-2xl">About this product</h2>
          <div className="prose-wd mt-4" dangerouslySetInnerHTML={{ __html: sanitizeProductHtml(product.description) }} />
          <p className="mt-6 text-sm text-charcoal/80">
            Prefer it on paper?{' '}
            <a href={BROCHURE.href} className="link-underline font-medium text-near-black hover:text-red" download>
              Download the {BROCHURE.label}
            </a>
          </p>
        </section>
      )}

      <ProductFaq items={faqsForProduct(product.id)} />

      <div className="mt-16">
        <TrustStrip compact />
      </div>
      <p className="mt-8 text-sm">
        <Link href="/products" className="font-medium text-charcoal hover:text-red">← Back to all products</Link>
      </p>
    </div></div>
  );
}
