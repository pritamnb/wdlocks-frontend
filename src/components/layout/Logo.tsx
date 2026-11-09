import Image from 'next/image';
import Link from 'next/link';
import { SITE } from '@/lib/constants';
import { cn } from '@/lib/cn';

export function Logo({ className, priority = false }: { className?: string; priority?: boolean }) {
  return (
    <Link href="/" className={cn('inline-flex items-center', className)} aria-label={`${SITE.name} home`}>
      <Image
        src="/brand/wd-locks-logo.png"
        alt={SITE.name}
        width={900}
        height={117}
        priority={priority}
        className="h-6 w-auto sm:h-7"
        sizes="(max-width: 640px) 180px, 220px"
      />
    </Link>
  );
}
