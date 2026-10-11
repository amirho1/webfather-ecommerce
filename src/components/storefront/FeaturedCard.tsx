'use client'

import { useAddToCart } from '@/hooks/useAddToCart';
import { getPrice } from '@/lib/formatToman';
import type { Product } from '@/payload-types';
import { ArrowUpLeft, Plus } from 'lucide-react';
import Link from 'next/link';
import { ProductLogo } from './Brand';

export function FeaturedCard({ product, index }: { product: Product; index: number }) {
  const { addToCart, canAddToCart, isLoading } = useAddToCart()
  const canAdd = !product.enableVariants && canAddToCart(product) && getPrice(product) !== null

  return (
    <article className={`featured-card featured-${index}`}>
      <div className="featured-top">
        <span>یه انتخاب خفن</span>
        <ArrowUpLeft size={22} />
      </div>
      <div className="featured-logo" style={{ backgroundColor: product.badgeColor || '#f1f4ff' }}>
        <ProductLogo media={product.brandLogo} name={product.title} />
      </div>
      <h3 dir="ltr">{product.title}</h3>
      <p>{product.shortDescription}</p>
      {product.enableVariants ? (
        <Link href={`/products/${product.slug}`}>
          انتخاب پلن <Plus size={17} />
        </Link>
      ) : (
        <button
          disabled={!canAdd || isLoading}
          onClick={() => addToCart({ product: product.id })}
          aria-label={`افزودن ${product.title} به سبد خرید`}
        >
          می‌خوامش <Plus size={17} />
        </button>
      )}
    </article>
  )
}
