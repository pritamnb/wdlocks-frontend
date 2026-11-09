import { ButtonLink } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="container-wd flex flex-col items-center py-32 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red">404</p>
      <h1 className="heading-display mt-3 text-4xl">We couldn’t find that page.</h1>
      <p className="mt-3 max-w-md text-charcoal/80">The lock you’re after may have moved. Head back to the shop to find it.</p>
      <ButtonLink href="/products" className="mt-8">Browse products</ButtonLink>
    </div>
  );
}
