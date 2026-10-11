'use client'

import { ProductLogo } from '@/components/storefront/Brand';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { formatNumber, formatToman, getPrice } from '@/lib/formatToman';
import type { Product, Variant } from '@/payload-types';
import { useCart } from '@payloadcms/plugin-ecommerce/client/react';
import { ArrowLeft, ShoppingBag, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export function CartModal() {
  const { cart, isLoading, incrementItem, decrementItem, removeItem } = useCart()
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  useEffect(() => setOpen(false), [pathname])
  const items = cart?.items || []
  const count = items.reduce((sum, item) => sum + (item.quantity || 0), 0)
  async function change(action: () => Promise<unknown>) {
    try { await action() } catch { toast.error('به‌روزرسانی سبد خرید ممکن نشد.') }
  }
  return <Sheet open={open} onOpenChange={setOpen}>
    <SheetTrigger asChild><button className="icon-button cart-toggle" aria-label={`سبد خرید، ${formatNumber(count)} محصول`}><ShoppingBag size={20}/><span>{formatNumber(count)}</span></button></SheetTrigger>
    <SheetContent side="left" className="cart-sheet"><SheetHeader><SheetTitle>سبد خریدت</SheetTitle><SheetDescription>سبد ذخیره می‌شود؛ ثبت سفارش و پرداخت هنوز فعال نیست.</SheetDescription></SheetHeader>
      {!items.length ? <div className="empty-state"><ShoppingBag size={44}/><h3>جای ابزارهای خفن اینجا خالیه!</h3><p>اشتراک موردعلاقه‌ات رو به سبد اضافه کن.</p><button className="action primary" onClick={() => setOpen(false)}>بریم سراغ اشتراک‌ها <ArrowLeft size={17}/></button></div> : <>
        <div className="cart-body">{items.map((item) => {
          const product = typeof item.product === 'object' ? item.product as Product : null
          const variant = item.variant && typeof item.variant === 'object' ? item.variant as Variant : null
          if (!product) return null
          const price = getPrice(product, variant)
          const inventory = variant?.inventory ?? product.inventory ?? 0
          return <div className="cart-item" key={item.id}>
            <span className="logo-surface" style={{ backgroundColor: product.badgeColor || '#f1f4ff' }}><ProductLogo media={product.brandLogo} name={product.title}/></span>
            <div><Link href={`/products/${product.slug}`} onClick={() => setOpen(false)}><h3 dir="ltr">{product.title}</h3></Link>{variant && <p>{variant.title}</p>}<p>{price === null ? '—' : formatToman(price)} × {formatNumber(item.quantity || 0)}</p>
              <span className="quantity-controls"><button disabled={isLoading || !item.id} aria-label={`کاهش تعداد ${product.title}`} onClick={() => item.id && change(() => decrementItem(item.id!))}>−</button><span>{formatNumber(item.quantity || 0)}</span><button disabled={isLoading || !item.id || (item.quantity || 0) >= inventory} aria-label={`افزایش تعداد ${product.title}`} onClick={() => item.id && change(() => incrementItem(item.id!))}>+</button></span></div>
            <button className="icon-button" disabled={isLoading || !item.id} aria-label={`حذف ${product.title}`} onClick={() => item.id && change(() => removeItem(item.id!))}><Trash2 size={17}/></button>
          </div>
        })}</div>
        <SheetFooter><div className="cart-total"><span>جمع سبد</span><strong>{formatToman(cart?.subtotal || 0)}</strong></div><Link className="action primary" href="/checkout" onClick={() => setOpen(false)}>ثبت سفارش (به‌زودی) <ArrowLeft size={17}/></Link><small className="cart-caveat">هیچ مبلغی دریافت نمی‌شود.</small></SheetFooter>
      </>}
    </SheetContent>
  </Sheet>
}
