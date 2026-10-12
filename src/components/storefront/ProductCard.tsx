'use client'

import { useAddToCart } from '@/hooks/useAddToCart'
import { formatNumber, getCardPrice } from '@/lib/formatToman'
import type { Product } from '@/payload-types'
import { Check, Plus, ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import { ProductLogo } from './Brand'

export function ProductCard({ product }: { product: Product }) {
  const { addToCart, getProductQuantityInCart, isLoading } = useAddToCart()
  const category = product.categories?.find((entry) => typeof entry === 'object')
  const price = getCardPrice(product)
  const quantity = getProductQuantityInCart(product.id)
  const hasVariants = Boolean(product.enableVariants)
  const canAdd = !hasVariants && (product.inventory ?? 0) > quantity && price !== null

  return (
    <article className="product-card">
      <div className="product-card-top">
        <span className="category-label">
          {category && typeof category === 'object' ? category.title : 'اشتراک'}
        </span>
        <span className="plan-label">اشتراک</span>
      </div>
      <Link href={`/products/${product.slug}`} className="product-identity">
        <span className="logo-surface" style={{ backgroundColor: product.badgeColor || '#f1f4ff' }}>
          <ProductLogo media={product.brandLogo} name={product.title} />
        </span>
        <div>
          <h3 dir="ltr">{product.title}</h3>
          <span dir="ltr">{product.title.split(' ')[0]}</span>
        </div>
      </Link>
      <p className="product-description">{product.shortDescription || ''}</p>
      <div className="product-price">
        <span>قیمت</span>
        <span>
          <strong>{price === null ? '—' : formatNumber(price)}</strong> <small>تومان</small>
        </span>
      </div>
      {hasVariants ? (
        <Link className="add-button" href={`/products/${product.slug}`}>
          <ShoppingBag size={16} /> انتخاب پلن <Plus size={16} />
        </Link>
      ) : (
        <button
          className={quantity ? 'add-button is-added' : 'add-button'}
          disabled={!canAdd || isLoading}
          onClick={() => addToCart({ product: product.id })}
          aria-label={`افزودن ${product.title} به سبد خرید`}
        >
          {quantity ? (
            <>
              <Check size={16} /> در سبد خرید ({formatNumber(quantity)}) <Plus size={16} />
            </>
          ) : (
            <>
              <ShoppingBag size={16} /> افزودن به سبد خرید <Plus size={16} />
            </>
          )}
        </button>
      )}
    </article>
  )
}
