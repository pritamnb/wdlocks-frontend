import { ProductCardSkeleton } from '@/components/product/ProductCard';
import { Skeleton } from '@/components/ui/Skeleton';

export default function ProductsLoading() {
  return (
    <div className="container-wd py-10 sm:py-14" aria-busy="true">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-6 h-12 w-64" />
      <Skeleton className="mt-3 h-4 w-96 max-w-full" />
      <ul className="mt-10 grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <li key={i}><ProductCardSkeleton /></li>
        ))}
      </ul>
    </div>
  );
}
