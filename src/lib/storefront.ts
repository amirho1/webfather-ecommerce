import config from '@payload-config';
import { unstable_cache } from 'next/cache';
import { draftMode } from 'next/headers';
import type { Where } from 'payload';
import { getPayload } from 'payload';
import { getCardPrice } from './formatToman';

export type CatalogParams = { q?: string; category?: string; sort?: string; page?: string }

async function fetchPublishedCategories() {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'categories',
    limit: 100,
    pagination: false,
    where: { _status: { equals: 'published' } },
    sort: 'createdAt',
  })
  return result.docs
}

const getCachedCategories = unstable_cache(fetchPublishedCategories, ['storefront-categories'], {
  revalidate: 60,
  tags: ['categories'],
})

async function fetchFeaturedProducts() {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'products',
    depth: 2,
    limit: 4,
    where: { and: [{ featured: { equals: true } }, { _status: { equals: 'published' } }] },
  })
  return result.docs
}

const getCachedFeaturedProducts = unstable_cache(
  fetchFeaturedProducts,
  ['storefront-featured-products'],
  { revalidate: 60, tags: ['products', 'featured'] },
)

async function fetchBrandProducts() {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'products',
    depth: 1,
    limit: 6,
    where: { _status: { equals: 'published' } },
    sort: ['-featured', '-createdAt'],
  })
  return result.docs
}

const getCachedBrandProducts = unstable_cache(fetchBrandProducts, ['storefront-brand-products'], {
  revalidate: 60,
  tags: ['products', 'brands'],
})

export async function getCatalog(params: CatalogParams = {}, limit = 14) {
  const { isEnabled: draft } = await draftMode()
  const payload = await getPayload({ config })

  let categories = []
  if (draft) {
    const categoriesResult = await payload.find({
      collection: 'categories',
      draft: true,
      overrideAccess: true,
      limit: 100,
      pagination: false,
      sort: 'createdAt',
    })
    categories = categoriesResult.docs
  } else {
    categories = await getCachedCategories()
  }

  const selectedCategory = categories.find((category) => category.slug === params.category)
  const q = params.q?.trim().slice(0, 100) || ''
  const isPriceSort = params.sort === 'low' || params.sort === 'high'
  const sort =
    params.sort === 'name' ? 'title' : isPriceSort ? undefined : ['-featured', '-createdAt']
  const page = Math.max(1, Number.parseInt(params.page || '1', 10) || 1)
  const and: Where[] = []

  if (!draft) and.push({ _status: { equals: 'published' } })
  if (selectedCategory) and.push({ categories: { contains: selectedCategory.id } })
  if (q) and.push({ or: [{ title: { like: q } }, { shortDescription: { like: q } }] })

  const products = await payload.find({
    collection: 'products',
    draft,
    overrideAccess: draft,
    depth: 2,
    limit,
    page,
    sort,
    where: and.length ? { and } : undefined,
  })

  // Correctly sort products with variants by their resolved card price
  if (isPriceSort && products.docs.length > 0) {
    products.docs.sort((a, b) => {
      const priceA = getCardPrice(a)
      const priceB = getCardPrice(b)
      if (params.sort === 'low') {
        const valA = priceA !== null ? priceA : Number.POSITIVE_INFINITY
        const valB = priceB !== null ? priceB : Number.POSITIVE_INFINITY
        return valA - valB
      } else {
        const valA = priceA !== null ? priceA : Number.NEGATIVE_INFINITY
        const valB = priceB !== null ? priceB : Number.NEGATIVE_INFINITY
        return valB - valA
      }
    })
  }

  return { products, categories, selectedCategory, draft }
}

export async function getFeaturedProducts() {
  const { isEnabled: draft } = await draftMode()
  if (draft) {
    const payload = await getPayload({ config })
    return (
      await payload.find({
        collection: 'products',
        draft: true,
        overrideAccess: true,
        depth: 2,
        limit: 4,
        where: { featured: { equals: true } },
      })
    ).docs
  }
  return getCachedFeaturedProducts()
}

export async function getBrandProducts() {
  const { isEnabled: draft } = await draftMode()
  if (draft) {
    const payload = await getPayload({ config })
    return (
      await payload.find({
        collection: 'products',
        draft: true,
        overrideAccess: true,
        depth: 1,
        limit: 6,
        sort: ['-featured', '-createdAt'],
      })
    ).docs
  }
  return getCachedBrandProducts()
}
