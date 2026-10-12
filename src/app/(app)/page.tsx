import { CatalogSection } from '@/components/storefront/CatalogSection'
import {
  BottomSections,
  BrandStrip,
  CategoryCards,
  Featured,
  Hero,
} from '@/components/storefront/HomeSections'
import {
  getBrandProducts,
  getCatalog,
  getFeaturedProducts,
  type CatalogParams,
} from '@/lib/storefront'

export const metadata = {
  title: 'مفت خر | اشتراک ابزارهای حرفه‌ای',
  description: 'اشتراک‌های هوش مصنوعی، طراحی، برنامه‌نویسی و یادگیری را در مفت خر پیدا کنید.',
}
export const revalidate = 60

export default async function HomePage({ searchParams }: { searchParams: Promise<CatalogParams> }) {
  const params = await searchParams
  const [{ products, categories, selectedCategory }, featured, brands] = await Promise.all([
    getCatalog(params, 14),
    getFeaturedProducts(),
    getBrandProducts(),
  ])
  return (
    <>
      <Hero brands={brands} />
      <BrandStrip brands={brands} />
      <CategoryCards categories={categories} selected={selectedCategory?.slug || undefined} />
      <CatalogSection
        products={products.docs}
        categories={categories}
        total={products.totalDocs}
        totalPages={products.totalPages}
        page={products.page || 1}
        params={params}
        home
      />
      <Featured products={featured} />
      <BottomSections />
    </>
  )
}
