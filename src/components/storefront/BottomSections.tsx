import { ArrowLeft, Asterisk, Headphones, Layers, MousePointer2, Plus, Wallet } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

const benefits = [
  {
    icon: Wallet,
    title: 'قیمت‌های اقتصادی',
    text: 'انتخاب‌های متنوع برای وقتی که هم کیفیت مهمه، هم هزینه.',
  },
  {
    icon: MousePointer2,
    title: 'خرید ساده و سریع',
    text: 'ابزارت رو پیدا کن، مقایسه کن و به سبد خریدت اضافه کن.',
  },
  {
    icon: Headphones,
    title: 'پشتیبانی فارسی',
    text: 'تجربه‌ای به زبان خودت، بدون پیچیدگی‌های اضافه.',
  },
  {
    icon: Layers,
    title: 'همه ابزارها، یک‌جا',
    text: 'از ساختن و طراحی تا یادگیری؛ برای هر ایده یک ابزار.',
  },
]

const faqs = [
  [
    'چطور اشتراک موردنظرم رو پیدا کنم؟',
    'از جست‌وجو یا فیلتر دسته‌بندی استفاده کن. سپس جزئیات محصول و پلن را ببین.',
  ],
  [
    'آیا الان می‌توانم سفارش ثبت کنم؟',
    'سبد خرید فعال است، ولی ثبت سفارش و پرداخت تا راه‌اندازی فروش در دسترس نیست.',
  ],
  [
    'اشتراک‌ها چطور فعال می‌شن؟',
    'روش فعال‌سازی به سرویس و نوع اشتراک بستگی دارد و پیش از فعال شدن فروش در اطلاعات هر محصول مشخص می‌شود.',
  ],
  ['چطور می‌تونم حساب بسازم؟', 'شماره موبایل ایرانی‌ات را وارد کن و کد پیامکی را تأیید کن.'],
]

export function BottomSections() {
  return (
    <>
      <section className="benefits-section container" id="about">
        <div className="center-heading">
          <span className="section-kicker">یه خرید خوب، یه حس خوب</span>
          <h2>چرا از مفت خر خرید کنیم؟</h2>
          <p>چون حرفه‌ای بودن، قرار نیست گرون تموم بشه.</p>
        </div>
        <div className="benefits-grid">
          {benefits.map(({ icon: Icon, title, text }, index) => (
            <article key={title}>
              <span className="benefit-icon">
                <Icon size={27} />
              </span>
              <span className="benefit-number">۰{index + 1}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="promo container">
        <div>
          <span className="promo-eyebrow">با ابزار درست، ایده‌هات رو واقعی کن.</span>
          <h2>
            ابزار حرفه‌ای می‌خوای؟
            <br />
            <span>گرون نخر!</span>
          </h2>
          <p className="text-white!">اشتراک ابزارهای موردعلاقه‌ات رو توی مفت خر پیدا کن.</p>
          <a className="action dark-action" href="#catalog">
            همین حالا انتخاب کن <ArrowLeft size={19} />
          </a>
        </div>
        <div className="promo-art">
          <span aria-hidden="true">
            <Asterisk size="1em" />
          </span>
          <Image
            src="/images/moftkhar.svg"
            alt="ماسکات مفت خر"
            width="380"
            height="285"
            loading="lazy"
          />
        </div>
      </section>
      <section className="faq-section container" id="faq">
        <div className="faq-intro">
          <span className="section-kicker">قبل از خرید، بدون!</span>
          <h2>سوال تو هم هست؟</h2>
          <p>
            جواب چند تا از سوال‌های پرتکرار رو
            <br />
            اینجا جمع کردیم.
          </p>
          <Link className="text-link" href="/shop">
            دیدن اشتراک‌ها <ArrowLeft size={17} />
          </Link>
        </div>
        <div className="faq-list">
          {faqs.map(([question, answer]) => (
            <details key={question}>
              <summary>
                {question}
                <Plus size={18} />
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  )
}
