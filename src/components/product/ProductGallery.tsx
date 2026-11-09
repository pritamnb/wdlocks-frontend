'use client';

import * as React from 'react';
import Image from 'next/image';
import type { WooImage } from '@/types';
import { cn } from '@/lib/cn';

export function ProductGallery({ images, name }: { images: WooImage[]; name: string }) {
  const [index, setIndex] = React.useState(0);
  const current = images[index] ?? images[0];

  if (!current) {
    return <div className="aspect-square w-full rounded-[2rem] bg-warm-white" aria-hidden="true" />;
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-[2rem] bg-warm-white shadow-card">
        <Image
          key={current.id}
          src={current.src}
          alt={current.alt || name}
          fill
          priority={index === 0}
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-contain p-8"
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
                  'relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-warm-white transition-[border-color,transform] duration-150 hover:-translate-y-0.5',
                  i === index ? 'border-red' : 'border-cream-dark',
                )}
              >
                <Image src={img.thumbnail || img.src} alt="" fill sizes="64px" className="object-contain p-1.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
