import type { Product } from '@/payload-types'
import { ProductLogo } from './Brand'

export function BrandStrip({ brands }: { brands: Product[] }) {
  return (
    <div className="brand-strip">
      <div className="container brand-strip-inner">
        <span>
          ابزارهایی که دوست داری،
          <br />
          <strong>حالا در دسترس تو.</strong>
        </span>
        <div className="brand-wordmarks">
          {brands.map((product) => (
            <div key={product.id} dir="ltr">
              <ProductLogo media={product.brandLogo} name={product.title} />
              <b>{product.title ? product.title.split(' ')[0] : ''}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
