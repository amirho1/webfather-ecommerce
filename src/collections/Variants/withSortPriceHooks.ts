import refreshProductSortPrice from '@/lib/refreshProductSortPrice'
import type { CollectionConfig } from 'payload'

/** Returns the numeric product ID from a variant relationship. */
function productIdOf(value: unknown): number | null {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value && typeof value.id === 'number') {
    return value.id
  }
  return null
}

/** Updates the catalog price when a variant is saved or deleted. */
export default function withSortPriceHooks(collection: CollectionConfig): CollectionConfig {
  return {
    ...collection,
    hooks: {
      ...collection.hooks,
      afterChange: [
        ...(collection.hooks?.afterChange ?? []),
        async ({ doc, previousDoc, req }) => {
          const currentId = productIdOf(doc.product)
          const previousId = productIdOf(previousDoc?.product)
          if (currentId) await refreshProductSortPrice(req, currentId)
          if (previousId && previousId !== currentId) {
            await refreshProductSortPrice(req, previousId)
          }
          return doc
        },
      ],
      afterDelete: [
        ...(collection.hooks?.afterDelete ?? []),
        async ({ doc, req }) => {
          const productId = productIdOf(doc.product)
          if (productId) await refreshProductSortPrice(req, productId)
          return doc
        },
      ],
    },
  }
}
