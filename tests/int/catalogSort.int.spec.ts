import config from '@/payload.config'
import { getPayload } from 'payload'
import { describe, expect, it } from 'vitest'

describe('catalog price sort', () => {
  it('persists prices and sorts before pagination', async () => {
    const payload = await getPayload({ config })
    const slugPrefix = `sort-test-${Date.now()}`
    const prices = [300, 100, 200]
    const ids: number[] = []
    try {
      for (const [index, price] of prices.entries()) {
        const product = await payload.create({
          collection: 'products',
          data: {
            title: `${slugPrefix}-${index}`,
            slug: `${slugPrefix}-${index}`,
            priceInTOMAN: price,
            _status: 'published',
          },
        })
        ids.push(product.id)
      }
      const sorted = await payload.find({
        collection: 'products',
        where: { id: { in: ids } },
        limit: 1,
        page: 1,
        sort: ['-hasPrice', 'sortPrice', 'id'],
      })
      expect(sorted.docs[0]?.priceInTOMAN).toBe(100)
      expect(sorted.totalPages).toBe(3)
      const highest = await payload.find({
        collection: 'products',
        where: { id: { in: ids } },
        limit: 1,
        page: 1,
        sort: ['-hasPrice', '-sortPrice', 'id'],
      })
      expect(highest.docs[0]?.priceInTOMAN).toBe(300)
    } finally {
      if (ids.length) await payload.delete({ collection: 'products', where: { id: { in: ids } } })
    }
  })

  it('refreshes the indexed price when a variant changes', async () => {
    const payload = await getPayload({ config })
    const slug = `variant-sort-${Date.now()}`
    const variantType = await payload.create({
      collection: 'variantTypes',
      data: { label: slug, name: slug },
    })
    const variantOption = await payload.create({
      collection: 'variantOptions',
      data: { variantType: variantType.id, label: slug, value: slug },
    })
    const product = await payload.create({
      collection: 'products',
      data: {
        title: slug,
        slug,
        enableVariants: true,
        variantTypes: [variantType.id],
        priceInTOMAN: 500,
        _status: 'published',
      },
    })
    try {
      const variant = await payload.create({
        collection: 'variants',
        data: {
          product: product.id,
          options: [variantOption.id],
          priceInTOMAN: 100,
          _status: 'published',
        },
      })
      expect((await payload.findByID({ collection: 'products', id: product.id })).sortPrice).toBe(
        100,
      )
      await payload.delete({ collection: 'variants', id: variant.id })
      expect((await payload.findByID({ collection: 'products', id: product.id })).sortPrice).toBe(
        500,
      )
    } finally {
      await payload.delete({ collection: 'products', id: product.id })
      await payload.delete({ collection: 'variantOptions', id: variantOption.id })
      await payload.delete({ collection: 'variantTypes', id: variantType.id })
    }
  })
})
