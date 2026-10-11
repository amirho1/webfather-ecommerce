'use client'

import type { Category } from '@/payload-types';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition } from 'react';

export function CatalogControls({ categories }: { categories: Category[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [, startTransition] = useTransition()
  const currentCategory = searchParams.get('category') || ''
  const currentSort = searchParams.get('sort') || 'suggested'

  useEffect(() => {
    setSearch(searchParams.get('q') || '')
  }, [searchParams])

  const update = useCallback(
    (key: string, value: string, withHash = false) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) params.set(key, value)
      else params.delete(key)
      params.delete('page')

      const hash = withHash ? '#catalog' : ''
      const url = `${pathname}${params.size ? `?${params}` : ''}${hash}`

      startTransition(() => {
        router.replace(url, { scroll: false })
      })
    },
    [pathname, router, searchParams],
  )

  useEffect(() => {
    const current = searchParams.get('q') || ''
    if (search === current) return
    const timer = window.setTimeout(() => update('q', search.trim(), false), 400)
    return () => window.clearTimeout(timer)
  }, [search, searchParams, update])

  return (
    <div className="catalog-toolbar">
      <div className="catalog-tabs" aria-label="فیلتر دسته‌بندی">
        <button
          className={!currentCategory ? 'active' : ''}
          aria-pressed={!currentCategory}
          onClick={() => update('category', '', true)}
        >
          همه
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            className={currentCategory === category.slug ? 'active' : ''}
            aria-pressed={currentCategory === category.slug}
            onClick={() => update('category', category.slug || '', true)}
          >
            {category.title}
          </button>
        ))}
      </div>
      <div className="search-sort">
        <label className="search-field">
          <Search size={17} />
          <input
            id="product-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="دنبال کدوم ابزاری؟"
            aria-label="جست‌وجوی محصولات"
          />
          {search && (
            <button
              type="button"
              aria-label="پاک کردن جست‌وجو"
              onClick={() => {
                setSearch('')
                update('q', '', false)
              }}
            >
              <X size={14} />
            </button>
          )}
        </label>
        <label className="sort-field">
          <SlidersHorizontal size={17} />
          <span className="sr-only">مرتب‌سازی محصولات</span>
          <select
            value={currentSort}
            onChange={(event) => update('sort', event.target.value, false)}
          >
            <option value="suggested">پیشنهاد مفت خر</option>
            <option value="low">کمترین قیمت</option>
            <option value="high">بیشترین قیمت</option>
            <option value="name">نام محصول</option>
          </select>
        </label>
      </div>
    </div>
  )
}
