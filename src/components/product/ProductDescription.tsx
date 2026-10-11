'use client'

import type { Product, Variant } from '@/payload-types'
import { RichText } from '@/components/RichText'
import { AddToCart } from '@/components/Cart/AddToCart'
import { formatToman, getPrice } from '@/lib/formatToman'
import { ProductLogo } from '@/components/storefront/Brand'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { VariantSelector } from './VariantSelector'

export function ProductDescription({ product }: { product: Product }) {
  const searchParams = useSearchParams()
  const variants = (product.variants?.docs || []).filter((variant): variant is Variant => typeof variant === 'object')
  const selected = variants.find((variant) => String(variant.id) === searchParams.get('variant'))
  const availablePrices = variants.map((variant) => getPrice(product, variant)).filter((value): value is number => value !== null)
  const price = getPrice(product, selected)
  const displayedPrice = product.enableVariants && !selected && availablePrices.length
    ? `${formatToman(Math.min(...availablePrices))} تا ${formatToman(Math.max(...availablePrices))}`
    : price === null ? 'قیمت ثبت نشده' : formatToman(price)
  const inventory = selected?.inventory ?? product.inventory ?? 0
  const available = product.enableVariants
    ? selected ? inventory > 0 : variants.some((variant) => (variant.inventory ?? 0) > 0)
    : inventory > 0
  const category = product.categories?.find((entry) => typeof entry === 'object')

  return <div className="product-detail-info">
    <div className="product-detail-brand" style={{ backgroundColor: product.badgeColor || '#f1f4ff' }}><ProductLogo media={product.brandLogo} name={product.title}/></div>
    {category && typeof category === 'object' && <span className="category-label">{category.title}</span>}
    <h1 dir="ltr">{product.title}</h1>
    {product.shortDescription && <p className="product-detail-blurb">{product.shortDescription}</p>}
    <div className="product-detail-price">{displayedPrice}</div>
    <p className={available ? 'stock-ok' : 'stock-out'}>{available ? 'موجود' : 'ناموجود'}</p>
    {product.enableVariants && <Suspense fallback={null}><VariantSelector product={product}/></Suspense>}
    <Suspense fallback={null}><AddToCart product={product}/></Suspense>
    {product.description && <div className="product-detail-description"><h2>درباره این اشتراک</h2><RichText data={product.description} enableGutter={false}/></div>}
  </div>
}
