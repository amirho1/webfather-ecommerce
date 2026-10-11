import type { Category } from '@/payload-types';
import { ArrowLeft, Code2, GraduationCap, LayoutGrid, Palette, Sparkles } from 'lucide-react';
import Link from 'next/link';

const icons = {
  sparkles: Sparkles,
  palette: Palette,
  code: Code2,
  grid: LayoutGrid,
  graduation: GraduationCap,
}

export function CategoryCards({
  categories,
  selected,
}: {
  categories: Category[]
  selected?: string
}) {
  return (
    <section className="categories-section container" id="categories">
      <div className="categories-intro">
        <h2>دنبال چی می‌گردی؟</h2>
        <span>برای هر کاری، یه ابزار خفن هست.</span>
      </div>
      <div className="category-grid">
        {categories.map((category, index) => {
          const Icon = icons[(category.iconKey || 'grid') as keyof typeof icons] || LayoutGrid
          return (
            <Link
              href={`/?category=${encodeURIComponent(category.slug || '')}#catalog`}
              key={category.id}
              className={`category-card ${selected === category.slug ? 'selected' : ''}`}
              aria-label={`${category.title}، نمایش محصولات`}
            >
              <span className={`category-icon category-icon-${index}`}>
                <Icon size={24} />
              </span>
              <div>
                <strong>{category.title}</strong>
                <small>{category.subtitle}</small>
              </div>
              <ArrowLeft size={16} />
            </Link>
          )
        })}
      </div>
    </section>
  )
}
