import type { Category, Product } from '@/payload-types'
import type { CatalogParams } from '@/lib/storefront'
import { formatNumber } from '@/lib/formatToman'
import { PackageOpen, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'
import { CatalogControls } from './CatalogControls'
import { ProductCard } from './ProductCard'

export function CatalogSection({
  products,
  categories,
  total,
  totalPages,
  page,
  params,
  home = false,
}: {
  products: Product[]
  categories: Category[]
  total: number
  totalPages: number
  page: number
  params: CatalogParams
  home?: boolean
}) {
  function pageHref(next: number) {
    const query = new URLSearchParams()
    if (params.q) query.set('q', params.q)
    if (params.category) query.set('category', params.category)
    if (params.sort) query.set('sort', params.sort)
    query.set('page', String(next))
    return `${home ? '/' : '/shop'}?${query}#catalog`
  }

  return (
    <section className="catalog-section container" id="catalog">
      <div className="section-heading">
        <div>
          <div className="section-kicker">
            <span className="small-orange-line" /> دنیای ابزارهای حرفه‌ای
          </div>
          <h2>
            اشتراک بعدی‌ات رو <span className="orange-text">پیدا کن.</span>
          </h2>
          <p>ابزارهای محبوب، انتخاب‌های متنوع؛ همه همین‌جا.</p>
        </div>
        <span className="catalog-count">
          {formatNumber(total)} اشتراک برای کشف کردن <Sparkles size={16} />
        </span>
      </div>
      <Suspense fallback={null}>
        <CatalogControls categories={categories} />
      </Suspense>
      <div className="demo-notice">
        <span className="demo-dot" /> قیمت‌ها تا شروع فروش برای بررسی هستند؛ ثبت سفارش و پرداخت فعال
        نیست.
      </div>
      {products.length ? (
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <PackageOpen size={40} />
          <h3>این یکی رو پیدا نکردیم!</h3>
          <p>یه اسم دیگه امتحان کن یا فیلترها رو بردار.</p>
          <Link className="action secondary" href={`${home ? '/' : '/shop'}#catalog`}>
            نمایش همه اشتراک‌ها
          </Link>
        </div>
      )}
      {totalPages > 1 && (
        <nav className="catalog-pagination" aria-label="صفحه‌های محصولات">
          {page > 1 && <Link href={pageHref(page - 1)}>صفحه قبل</Link>}
          <span>
            {formatNumber(page)} از {formatNumber(totalPages)}
          </span>
          {page < totalPages && <Link href={pageHref(page + 1)}>صفحه بعد</Link>}
        </nav>
      )}
      {home && (
        <p className="catalog-footnote">
          <Link href="/shop">دیدن همه اشتراک‌ها</Link> <Sparkles size={14} />
        </p>
      )}
    </section>
  )
}
