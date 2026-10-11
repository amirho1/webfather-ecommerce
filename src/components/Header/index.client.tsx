'use client'

import { Brand } from '@/components/storefront/Brand'
import { CartModal } from '@/components/Cart/CartModal'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useAuth } from '@/providers/Auth'
import { ArrowLeft, Menu, Search, Sparkles, UserRound } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

export function HeaderClient() {
  const { user } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const nav = [
    { label: 'خانه', href: '/' },
    { label: 'فروشگاه', href: '/shop' },
    { label: 'دسته‌بندی‌ها', href: '/#categories' },
    { label: 'سوالات متداول', href: '/#faq' },
  ]
  function focusSearch() {
    const input = document.getElementById('product-search') as HTMLInputElement | null
    if (input) {
      input.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' })
      input.focus({ preventScroll: true })
    }
    else router.push('/shop#catalog')
  }
  return <>
    <div className="announcement-bar"><Sparkles size={14}/><span>یه دنیا ابزار حرفه‌ای، با یه خرید هوشمندانه!</span><Link href="/#catalog">کشف اشتراک‌ها <ArrowLeft size={13}/></Link></div>
    <header className="site-header"><div className="container header-inner">
      <Brand/>
      <nav aria-label="منوی اصلی" className="desktop-nav">{nav.map((item) => <Link key={item.href} href={item.href} className={(pathname === item.href || (item.href === '/' && pathname === '/')) ? 'nav-active' : ''}>{item.label}</Link>)}</nav>
      <div className="header-actions">
        <button className="icon-button header-search" aria-label="جست‌وجوی اشتراک" onClick={focusSearch}><Search size={20}/></button><span className="header-divider"/>
        <CartModal/>
        <Link className="login-button" href={user ? '/account' : '/login'} aria-label={user ? 'حساب کاربری' : 'ورود / ثبت‌نام'}><UserRound size={17}/><span>{user ? user.name || user.phoneNumber || 'حساب من' : 'ورود / ثبت‌نام'}</span></Link>
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}><SheetTrigger asChild><button className="icon-button mobile-menu-button" aria-label="باز کردن منو"><Menu size={22}/></button></SheetTrigger><SheetContent side="right"><SheetHeader><SheetTitle>منوی مفت خر</SheetTitle><SheetDescription>هوشمند بخر، مفت خر باش!</SheetDescription></SheetHeader><nav className="mobile-nav">{nav.map((item) => <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>{item.label}<ArrowLeft size={17}/></Link>)}</nav></SheetContent></Sheet>
      </div>
    </div></header>
  </>
}
