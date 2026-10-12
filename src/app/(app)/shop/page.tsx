import { CatalogSection } from '@/components/storefront/CatalogSection'
import { getCatalog, type CatalogParams } from '@/lib/storefront'

export const metadata = { title: 'فروشگاه | مفت خر', description: 'اشتراک ابزارهای حرفه‌ای' }
export const dynamic = 'force-dynamic'

export default async function ShopPage({ searchParams }: { searchParams: Promise<CatalogParams> }) {
  const params = await searchParams
  const { products, categories } = await getCatalog(params, 24)
  return (
    <div className="shop-page">
      <CatalogSection
        products={products.docs}
        categories={categories}
        total={products.totalDocs}
        totalPages={products.totalPages}
        page={products.page || 1}
        params={params}
      />
    </div>
  )
}
