import Image from 'next/image';
import Link from 'next/link';
import { SITE } from '@/lib/constants';
import { cn } from '@/lib/cn';

export function Logo({ className, priority = false, tone = 'dark' }: { className?: string; priority?: boolean; tone?: 'dark' | 'light' }) {
  return (
    <Link href="/" className={cn('inline-flex items-center', className)} aria-label={`${SITE.name} home`}>
      <Image
        src={tone === 'light' ? '/brand/watchdog-stays-locked-light.png' : '/brand/watchdog-stays-locked.png'}
        alt={SITE.name}
        width={822}
        height={106}
        priority={priority}
        className="h-7 w-auto sm:h-8"
        sizes="(max-width: 640px) 220px, 250px"
      />
    </Link>
  );
}
