'use client'

import type { Product, Variant } from '@/payload-types';
import { useCart } from '@payloadcms/plugin-ecommerce/client/react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

export const ADD_TO_CART_SUCCESS_MESSAGE = 'به سبد خرید اضافه شد.'
export const ADD_TO_CART_ERROR_MESSAGE = 'افزودن به سبد خرید ممکن نشد.'

export interface AddToCartArgs {
  product: Product | number
  variant?: Variant | number
}

export function useAddToCart() {
  const { addItem, cart, isLoading } = useCart()
  const [isPending, setIsPending] = useState(false)

  const handleAddToCart = useCallback(
    async (args: AddToCartArgs): Promise<boolean> => {
      setIsPending(true)
      try {
        const productId = typeof args.product === 'object' ? args.product.id : args.product
        const variantId =
          args.variant !== undefined
            ? typeof args.variant === 'object'
              ? args.variant.id
              : args.variant
            : undefined

        await addItem({
          product: productId,
          variant: variantId,
        })
        toast.success(ADD_TO_CART_SUCCESS_MESSAGE)
        return true
      } catch {
        toast.error(ADD_TO_CART_ERROR_MESSAGE)
        return false
      } finally {
        setIsPending(false)
      }
    },
    [addItem],
  )

  const getProductQuantityInCart = useCallback(
    (productId: number, variantId?: number): number => {
      if (!cart?.items?.length) return 0
      return cart.items
        .filter((item) => {
          const itemProductId = typeof item.product === 'object' ? item.product.id : item.product
          if (itemProductId !== productId) return false
          if (variantId !== undefined) {
            const itemVariantId =
              item.variant && typeof item.variant === 'object' ? item.variant.id : item.variant
            return itemVariantId === variantId
          }
          return true
        })
        .reduce((sum, item) => sum + (item.quantity || 0), 0)
    },
    [cart?.items],
  )

  const canAddToCart = useCallback(
    (product: Product, selectedVariant?: Variant | null): boolean => {
      if (product.enableVariants) {
        if (!selectedVariant) return false
        const currentQty = getProductQuantityInCart(product.id, selectedVariant.id)
        return (selectedVariant.inventory || 0) > currentQty
      }
      const currentQty = getProductQuantityInCart(product.id)
      return (product.inventory || 0) > currentQty
    },
    [getProductQuantityInCart],
  )

  return {
    addToCart: handleAddToCart,
    canAddToCart,
    cart,
    getProductQuantityInCart,
    isLoading: isLoading || isPending,
  }
}
