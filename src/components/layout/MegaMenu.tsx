'use client';

import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import type { WooProduct } from '@/types';
import { BRAND_RENDERS, BRAND_VIDEO, CARD_HOVER_CLIPS, CATALOGUE, MENU_GROUPS, type MenuGroupId } from '@/lib/constants';
import { HoverPreview } from '@/components/media/HoverPreview';
import { productPriceLabel } from '@/lib/wdlocks-api';
import { cn } from '@/lib/cn';

const byKey = Object.fromEntries(CATALOGUE.map((p) => [p.key, p]));

interface MegaMenuProps {
  id: string;
  group: MenuGroupId | null;
  products: WooProduct[];
  onNavigate: () => void;
}

/**
 * Card-style mega-menu (desktop). One featured card per product with the product photo that
 * starts muted and brightens into colour on hover, a one-line benefit, "Buy online" + "Explore",
 * plus a "More" column of text links and an accreditation strip underneath.
 */
export function MegaMenu({ id, group, products, onNavigate }: MegaMenuProps) {
  const data = group ? MENU_GROUPS[group] : null;
  const productById = new Map(products.map((p) => [p.id, p]));

  return (
    <AnimatePresence>
      {data && (
        <motion.div
          id={id}
          key={group}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="absolute inset-x-0 top-full z-40 border-b border-cream-dark bg-warm-white text-near-black shadow-[0_28px_48px_-28px_rgb(10_8_6/0.35)]"
        >
          <div className="container-wd grid grid-cols-12 gap-6 py-6">
            <ul className="col-span-9 grid grid-cols-4 gap-4" role="list">
              {data.featured.map((key) => {
                const entry = byKey[key];
                const live = productById.get(entry.id);
                const image = live?.images[0];
                const href = `/products/${entry.slug}`;
                return (
                  <li key={entry.id} className="group relative overflow-hidden rounded-[10px] border border-cream-dark bg-cream transition-[border-color,transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-charcoal/30 hover:shadow-card-hover">
                    <Link href={href} onClick={onNavigate} className="absolute inset-0 z-10" aria-label={entry.shortName} />
                    <div className="relative h-36 overflow-hidden bg-cream">
                      {image ? (
                        CARD_HOVER_CLIPS[entry.id] ? (
                          <HoverPreview src={BRAND_VIDEO.clips[CARD_HOVER_CLIPS[entry.id]!].mp4} className="absolute inset-0">
                            <Image src={image.src} alt="" fill sizes="220px" className="object-contain p-5 opacity-80 grayscale-[20%] transition-[opacity,filter,transform] duration-300 group-hover:opacity-100 group-hover:grayscale-0 group-hover:scale-105" />
                          </HoverPreview>
                        ) : (
                          <Image src={image.src} alt="" fill sizes="220px" className="object-contain p-5 opacity-80 grayscale-[20%] transition-[opacity,filter,transform] duration-300 group-hover:opacity-100 group-hover:grayscale-0 group-hover:scale-105" />
                        )
                      ) : (
                        <div className="h-full w-full bg-cream" />
                      )}
                      {entry.popular && (
                        <span className="absolute right-2 top-2 rounded-full bg-red px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">Popular</span>
                      )}
                    </div>
                    <div className="p-3.5">
                      <p className="text-[17px] font-semibold leading-snug text-near-black">{entry.shortName}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-charcoal/70">{entry.blurb}</p>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-semibold tabular-nums text-near-black">{live ? productPriceLabel(live) : ''}</span>
                        <span className="relative z-20 inline-flex gap-1.5">
                          <Link href={href} onClick={onNavigate} className="whitespace-nowrap rounded-[4px] border border-red bg-red px-2 py-1 text-[12px] font-semibold text-white transition-colors duration-150 hover:bg-red-deep">
                            Buy online
                          </Link>
                          <Link href={href} onClick={onNavigate} className="whitespace-nowrap rounded-[4px] border border-red px-2 py-1 text-[12px] font-semibold text-red transition-colors duration-150 hover:bg-red hover:text-white">
                            Explore
                          </Link>
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="col-span-3 pl-6">
              <p className="font-playfair text-xl font-semibold text-red">More products</p>
              <ul className="mt-3 space-y-2">
                {data.more.map((l) => (
                  <li key={l.label}>
                    {l.external ? (
                      <a href={l.href} rel="noopener" className="link-underline text-[15px] font-medium text-near-black hover:text-red">{l.label} ↗</a>
                    ) : (
                      <Link href={l.href} onClick={onNavigate} className="link-underline text-[15px] font-medium text-near-black hover:text-red">{l.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
              <Link href={data.aside.href} onClick={onNavigate} className="group/aside relative mt-6 block overflow-hidden rounded-[10px] border border-cream-dark bg-cream p-4 text-near-black">
                {data.aside.image && (
                  <Image
                    src={BRAND_RENDERS[data.aside.image].src}
                    alt=""
                    width={BRAND_RENDERS[data.aside.image].width}
                    height={BRAND_RENDERS[data.aside.image].height}
                    sizes="120px"
                    className="pointer-events-none absolute -bottom-4 -right-3 w-[110px] rotate-12 opacity-80 drop-shadow-[0_12px_16px_rgb(0_0_0/0.4)] transition-transform duration-300 group-hover/aside:rotate-6 group-hover/aside:scale-105"
                  />
                )}
                <div className={cn('relative', data.aside.image && 'pr-20')}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-red">{data.aside.eyebrow}</p>
                  <p className="mt-1 font-playfair text-lg font-semibold leading-snug">{data.aside.title}</p>
                  <span className="mt-2 inline-block text-sm font-medium text-near-black underline-offset-4 group-hover/aside:underline">{data.aside.cta}</span>
                </div>
              </Link>
            </div>
          </div>
          <div className="border-t border-cream-dark bg-cream-mid">
            <div className={cn('container-wd flex flex-wrap items-center justify-center gap-x-8 gap-y-1 py-2 text-xs font-medium text-charcoal/75')}>
              <span>BSI Kitemarked TS 007 3★</span>
              <span aria-hidden="true">·</span>
              <span>Sold Secure Diamond 2024</span>
              <span aria-hidden="true">·</span>
              <span>Secured by Design</span>
              <span aria-hidden="true">·</span>
              <span>£5,000 security guarantee</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
