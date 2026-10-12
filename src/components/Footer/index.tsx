import { Brand } from '@/components/storefront/Brand'
import { Asterisk, ShoppingBag } from 'lucide-react'
import Link from 'next/link'

export function Footer() {
  const year = new Intl.DateTimeFormat('fa-IR', { year: 'numeric' }).format(new Date())
  return (
    <footer>
      <div className="container footer-main">
        <div className="footer-brand">
          <Brand footer />
          <p>
            مفت خر، جایی برای پیدا کردن ابزارهای خفن.
            <br />
            هوشمندانه انتخاب کن، حرفه‌ای پیش برو.
          </p>
          <div className="social-links">
            <small>شبکه‌های اجتماعی به‌زودی معرفی می‌شوند.</small>
          </div>
        </div>
        <div>
          <h3>دنیای اشتراک‌ها</h3>
          <Link href="/#categories">هوش مصنوعی</Link>
          <Link href="/#categories">طراحی و تولید محتوا</Link>
          <Link href="/#categories">برنامه‌نویسی و توسعه</Link>
          <Link href="/#categories">آموزش و بهره‌وری</Link>
        </div>
        <div>
          <h3>همراه مفت خر</h3>
          <Link href="/shop">فروشگاه</Link>
          <Link href="/#about">درباره مفت خر</Link>
          <Link href="/#faq">سوالات متداول</Link>
          <Link href="/login">حساب کاربری</Link>
        </div>
        <div className="footer-note">
          <ShoppingBag size={27} />
          <h3>هوشمند بخر، مفت خر باش!</h3>
          <p>
            فروشگاه در حال آماده‌سازی است.
            <br />
            ثبت سفارش و پرداخت فعال نیست.
          </p>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {year} مفت خر. تمام حقوق محفوظ است.</span>
        <span>
          ساخته شده برای آدم‌های خلاق{' '}
          <span className="orange-text">
            <Asterisk size="1em" />
          </span>
        </span>
      </div>
    </footer>
  )
}
