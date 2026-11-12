import Image from 'next/image';
import Link from 'next/link';
import { SITE } from '@/lib/constants';
import { cn } from '@/lib/cn';

export function Logo({ className, priority = false, tone = 'dark' }: { className?: string; priority?: boolean; tone?: 'dark' | 'light' }) {
  return (
    <Link href="/" className={cn('inline-flex shrink-0 items-center', className)} aria-label={`${SITE.name} home`}>
      <Image
        src={tone === 'light' ? '/brand/watchdog-stays-locked-light.png' : '/brand/watchdog-stays-locked.png'}
        alt={SITE.name}
        width={1955}
        height={251}
        priority={priority}
        className="h-7 w-auto sm:h-8 wide:h-9 ultra:h-10"
        sizes="(max-width: 640px) 220px, (max-width: 1479px) 280px, 310px"
      />
    </Link>
  );
}
