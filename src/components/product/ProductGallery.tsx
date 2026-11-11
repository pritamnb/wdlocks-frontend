'use client';

import * as React from 'react';
import Image from 'next/image';
import type { WooImage } from '@/types';
import { cn } from '@/lib/cn';

export function ProductGallery({ images, name, badge }: { images: WooImage[]; name: string; badge?: string }) {
  const [index, setIndex] = React.useState(0);
  const current = images[index] ?? images[0];

  if (!current) {
    return <div className="aspect-square w-full rounded-[10px] bg-[#f0f0f0]" aria-hidden="true" />;
  }

  return (
    <div className="min-w-0 space-y-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-[10px] bg-[#f0f0f0]">
        {badge && (
          <span className="absolute left-4 top-4 z-10 flex h-14 w-14 flex-col items-center justify-center rounded-full bg-red text-center text-white shadow-lg">
            <span className="font-playfair text-xl font-semibold leading-none">3</span>
            <span className="text-[8px] font-semibold uppercase leading-tight tracking-wide">{badge}</span>
          </span>
        )}
        <Image
          key={current.id}
          src={current.src}
          alt={current.alt || name}
          fill
          priority={index === 0}
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-contain mix-blend-multiply p-8"
        />
      </div>
      {images.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin" aria-label="Product images">
          {images.map((img, i) => (
            <li key={img.id}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show image ${i + 1} of ${images.length}`}
                aria-current={i === index ? 'true' : undefined}
                className={cn(
                  'relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-[#f0f0f0] transition-[border-color,transform] duration-300 hover:-translate-y-0.5',
                  i === index ? 'border-red' : 'border-cream-dark',
                )}
              >
                <Image src={img.thumbnail || img.src} alt="" fill sizes="64px" className="object-contain mix-blend-multiply p-1.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
