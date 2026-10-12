import type { PayloadRequest } from 'payload'

/** Recalculates the indexed catalog price after a product or variant changes. */
export default async function refreshProductSortPrice(
  req: PayloadRequest,
  productId: number,
): Promise<void> {
  const payload = req.payload
  const product = await payload.findByID({ collection: 'products', id: productId, depth: 0, req })
  const variants = product.enableVariants
    ? await payload.find({
        collection: 'variants',
        where: {
          and: [{ product: { equals: productId } }, { _status: { equals: 'published' } }],
        },
        pagination: false,
        depth: 0,
        req,
      })
    : null
  const prices = (variants?.docs ?? [])
    .map((variant) => variant.priceInTOMAN ?? product.priceInTOMAN)
    .filter((price): price is number => typeof price === 'number')
  const sortPrice = prices.length ? Math.min(...prices) : (product.priceInTOMAN ?? null)
  if (product.sortPrice === sortPrice && product.hasPrice === (sortPrice !== null)) return
  await payload.update({
    collection: 'products',
    id: productId,
    data: { sortPrice, hasPrice: sortPrice !== null },
    context: { skipSortPriceRefresh: true },
    req,
  })
}
