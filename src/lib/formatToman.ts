import type { Product, Variant } from '@/payload-types';

export const formatNumber = (value: number) => new Intl.NumberFormat('fa-IR').format(value)
export const formatToman = (value: number) => `${formatNumber(value)} تومان`

export function getPrice(
  product: Partial<Product>,
  variant?: Partial<Variant> | null,
): number | null {
  const value = variant?.priceInTOMAN ?? product.priceInTOMAN
  return typeof value === 'number' ? value : null
}

export function getCardPrice(product: Partial<Product>): number | null {
  if (product.enableVariants) {
    const prices = (product.variants?.docs || [])
      .filter(
        (variant): variant is Variant =>
          typeof variant === 'object' &&
          (variant._status === 'published' || product._status === 'draft' || !variant._status),
      )
      .map((variant) => getPrice(product, variant))
      .filter((price): price is number => price !== null)
    if (prices.length) return Math.min(...prices)
  }
  return getPrice(product)
}
