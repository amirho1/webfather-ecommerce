import { ProductDescription } from '@/components/product/ProductDescription'
import { ProductCard } from '@/components/storefront/ProductCard'
import type { Media, Product } from '@/payload-types'
import config from '@payload-config'
import { ArrowLeft } from 'lucide-react'
import { draftMode } from 'next/headers'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import { cache, Suspense } from 'react'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

const getProduct = cache(async (slug: string) => {
  const { isEnabled: draft } = await draftMode()
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'products',
    depth: 2,
    draft,
    overrideAccess: draft,
    limit: 1,
    where: {
      and: [{ slug: { equals: slug } }, ...(!draft ? [{ _status: { equals: 'published' } }] : [])],
    },
  })
  return result.docs[0] || null
})

export async function generateMetadata({ params }: Props) {
  const product = await getProduct((await params).slug)
  return {
    title: product ? `${product.title} | مفت خر` : 'محصول پیدا نشد | مفت خر',
    description: product?.shortDescription || '',
  }
}

export default async function ProductPage({ params }: Props) {
  const product = await getProduct((await params).slug)
  if (!product) notFound()
  const gallery =
    product.gallery
      ?.map((item) => (typeof item.image === 'object' ? (item.image as Media) : null))
      .filter((item): item is Media => Boolean(item)) || []
  const related =
    product.relatedProducts?.filter(
      (item): item is Product => typeof item === 'object' && item._status === 'published',
    ) || []
  return (
    <div className="product-page container">
      <Link className="product-back" href="/shop">
        <ArrowLeft size={18} /> همه اشتراک‌ها
      </Link>
      <div className="product-detail">
        <div className="product-detail-gallery">
          {gallery.length ? (
            gallery.map((image) => (
              <Image
                key={image.id}
                src={image.url || '/images/moftkhar.svg'}
                alt={image.alt || product.title}
                width={520}
                height={520}
              />
            ))
          ) : (
            <div
              className="product-detail-placeholder"
              style={{ backgroundColor: product.badgeColor || '#f1f4ff' }}
            >
              <Image
                src={
                  typeof product.brandLogo === 'object' && product.brandLogo?.url
                    ? product.brandLogo.url
                    : '/images/moftkhar.svg'
                }
                alt={product.title}
                width={180}
                height={180}
              />
            </div>
          )}
        </div>
        <Suspense fallback={null}>
          <ProductDescription product={product} />
        </Suspense>
      </div>
      {related.length > 0 && (
        <section className="related-products">
          <h2>شاید این‌ها رو هم دوست داشته باشی</h2>
          <div className="product-grid">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
