import type { Product } from '@/payload-types';
import { ArrowLeft, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { FeaturedCard } from './FeaturedCard';

export function Featured({ products }: { products: Product[] }) {
  if (!products.length) return null

  return (
    <section className="featured-section container" id="favorites">
      <div className="section-heading">
        <div>
          <div className="section-kicker">
            <Sparkles size={15} /> انتخاب‌های دوست‌داشتنی
          </div>
          <h2>
            محبوب‌های <span className="orange-text">مفت خر</span>
          </h2>
        </div>
        <Link className="text-link" href="/shop">
          همه اشتراک‌ها <ArrowLeft size={17} />
        </Link>
      </div>
      <div className="featured-grid">
        {products.map((product, index) => (
          <FeaturedCard product={product} index={index} key={product.id} />
        ))}
      </div>
    </section>
  )
}
