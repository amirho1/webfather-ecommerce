'use client'

import { Button } from '@/components/ui/button';
import { useAddToCart } from '@/hooks/useAddToCart';
import type { Product, Variant } from '@/payload-types';
import clsx from 'clsx';
import { useSearchParams } from 'next/navigation';
import React, { useCallback, useMemo } from 'react';

type Props = {
  product: Product
}

export function AddToCart({ product }: Props) {
  const { addToCart, canAddToCart, isLoading } = useAddToCart()
  const searchParams = useSearchParams()

  const variants = product.variants?.docs || []

  const selectedVariant = useMemo<Variant | undefined>(() => {
    if (product.enableVariants && variants.length) {
      const variantId = searchParams.get('variant')

      const validVariant = variants.find((variant) => {
        if (typeof variant === 'object') {
          return String(variant.id) === variantId
        }
        return String(variant) === variantId
      })

      if (validVariant && typeof validVariant === 'object') {
        return validVariant
      }
    }

    return undefined
  }, [product.enableVariants, searchParams, variants])

  const handleAdd = useCallback(
    (e: React.FormEvent<HTMLButtonElement>) => {
      e.preventDefault()
      void addToCart({
        product: product.id,
        variant: selectedVariant?.id,
      })
    },
    [addToCart, product.id, selectedVariant?.id],
  )

  const disabled = useMemo<boolean>(() => {
    if (product.enableVariants && !selectedVariant) {
      return true
    }
    return !canAddToCart(product, selectedVariant)
  }, [product, selectedVariant, canAddToCart])

  return (
    <Button
      aria-label={`افزودن ${product.title} به سبد خرید`}
      variant={'outline'}
      className={clsx({
        'hover:opacity-90': true,
      })}
      disabled={disabled || isLoading}
      onClick={handleAdd}
      type="submit"
    >
      افزودن به سبد خرید
    </Button>
  )
}
