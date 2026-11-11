'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SITE } from '@/lib/constants';
import { estimateDelivery, formatDeliveryDate } from '@/lib/delivery';

/**
 * Utility strip under the header (Ultion pattern, 11 Nov wording from the client):
 * - every page: "Looking to buy extra keys? Click here" (the next-day promise lives in the products mega menu);
 * - product pages: Ultion's "Order today, delivers tomorrow" line instead, in the same red (the date comes from the live
 *   dispatch estimate, so after the cut-off or at weekends it names the actual day).
 * Not dismissible: the client wants these links in front of every visitor, like Ultion's bar.
 */
export function AnnouncementBar() {
  const pathname = usePathname();
  // The estimate depends on the clock; render the generic wording on the server and refine on the client.
  const [est, setEst] = React.useState<ReturnType<typeof estimateDelivery> | null>(null);
  React.useEffect(() => {
    const tick = () => setEst(estimateDelivery());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  const onProduct = pathname.startsWith('/products/');

  if (onProduct) {
    const delivers = !est ? 'tomorrow' : est.shipsToday ? 'tomorrow' : formatDeliveryDate(est.expressDate);
    return (
      <div className="bg-red text-white" role="region" aria-label="Delivery promise">
        <p className="container-wd m-0 flex min-h-9 items-center justify-center gap-2 py-1.5 text-center text-[14px] font-semibold leading-snug sm:text-[15px]">
          <span aria-hidden="true">📦</span>
          <span>
            Order today, delivers {delivers}
            <span className="hidden font-medium sm:inline">
              {' '}<span aria-hidden="true" className="mx-1.5 opacity-70">·</span>{' '}order by {SITE.dispatchCutoff} for next-day delivery
            </span>
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className="bg-red text-white" role="region" aria-label="Store announcements">
      <div className="container-wd flex min-h-9 items-center justify-center py-1.5 text-center text-[13px] font-semibold leading-snug sm:text-[15px]">
        <p className="m-0">
          Looking to buy extra keys?{' '}
          <Link href="/products/watchdog-3-star-alps-extra-keys" className="underline decoration-white/70 underline-offset-2 hover:decoration-white">
            Click here
          </Link>
        </p>
      </div>
    </div>
  );
}
