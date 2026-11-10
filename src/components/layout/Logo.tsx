import Image from 'next/image';
import Link from 'next/link';
import { SITE } from '@/lib/constants';
import { cn } from '@/lib/cn';

export function Logo({ className, priority = false }: { className?: string; priority?: boolean }) {
  return (
    <Link href="/" className={cn('inline-flex items-center', className)} aria-label={`${SITE.name} home`}>
      <Image
        src="/brand/watchdog-stays-locked.png"
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
