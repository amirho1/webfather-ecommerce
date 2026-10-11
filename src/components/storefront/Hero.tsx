import type { Product } from '@/payload-types';
import { ArrowLeft, ArrowUpLeft, Asterisk, BadgeCheck, Headphones, ShoppingBag, Sparkle, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { ProductLogo } from './Brand';

const floatPositions = ['float-gemini', 'float-notion', 'float-lovable', 'float-capcut']

export function Hero({ brands }: { brands: Product[] }) {
  const chips = brands.slice(0, 4)

  return (
    <section className="hero container" aria-labelledby="hero-heading">
      <div className="hero-copy">
        <div className="eyebrow">
          <Sparkles size={14} /> ابزارهای بزرگ، قیمت‌های کوچیک
        </div>
        <h1 id="hero-heading">
          اشتراک‌های خفن،
          <br />
          <span className="orange-text">قیمت‌های مفت!</span>
          <span className="headline-spark" aria-hidden="true">
            <Asterisk size="1em" />
          </span>
        </h1>
        <p>
          حرفه‌ای کار کن، هوشمندانه خرج کن.
          <br />
          اشتراک ابزارهای هوش مصنوعی، طراحی و برنامه‌نویسی محبوبت رو با قیمت مناسب از{' '}
          <strong>مفت خر</strong> تهیه کن.
        </p>
        <div className="hero-actions">
          <a className="action primary" href="#catalog">
            بزن بریم خرید! <ArrowLeft size={19} />
          </a>
          <Link className="action secondary" href="/shop">
            مشاهده اشتراک‌ها <ArrowUpLeft size={18} />
          </Link>
        </div>
        <div className="hero-perks">
          <span>
            <BadgeCheck /> انتخاب هوشمندانه
          </span>
          <i />
          <span>
            <Headphones /> همراهی به زبان خودت
          </span>
        </div>
      </div>
      <div className="hero-art">
        <div className="art-orbit" />
        <div className="art-disc" />
        <span className="art-star star-one" aria-hidden="true">
          <Asterisk size="1em" />
        </span>
        <span className="art-star star-two" aria-hidden="true">
          <Sparkle size="1em" />
        </span>
        <span className="art-caption">گرون نخر، مفت بخر!</span>
        <img
          className="hero-mascot"
          src="/images/moftkhar.svg"
          alt="ماسکات مفت خر با ساک خرید نارنجی"
          width="506"
          height="380"
          fetchPriority="high"
        />
        {chips.map((product, index) => {
          const posClass = floatPositions[index % floatPositions.length]
          const shortTitle = product.title ? product.title.split(' ')[0] : ''
          return (
            <div className={`floating-app ${posClass}`} key={product.id}>
              <ProductLogo media={product.brandLogo} name={product.title} />
              {index === 0 || index === 3 ? <span dir="ltr">{shortTitle}</span> : null}
            </div>
          )
        })}
        <div className="mascot-note">
          <ShoppingBag size={20} />
          <span>
            ابزار حرفه‌ای،
            <br />
            <strong>خرید به‌صرفه!</strong>
          </span>
          <span className="note-dot" />
        </div>
      </div>
    </section>
  )
}
