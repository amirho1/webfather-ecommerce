import { ShoppingBag } from 'lucide-react';
import Link from 'next/link';

export const metadata = { title: 'خرید به‌زودی | مفت خر' }

export default function Checkout() {
  return <div className="checkout-soon container"><ShoppingBag size={42}/><h1>خرید به‌زودی فعال می‌شه</h1><p>سبد خریدت ذخیره می‌شه، اما فعلاً ثبت سفارش و پرداخت در دسترس نیست. هیچ مبلغی ازت دریافت نمی‌شه.</p><Link className="action primary" href="/shop">بازگشت به فروشگاه</Link></div>
}
