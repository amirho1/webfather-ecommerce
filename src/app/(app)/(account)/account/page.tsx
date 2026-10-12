import config from '@payload-config'
import { headers } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

export const metadata = { title: 'حساب من | مفت خر' }
export default async function AccountPage() {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) redirect('/login?redirect=%2Faccount')
  return (
    <div className="account-card">
      <h1>حساب کاربری</h1>
      <p>خوش اومدی، {user.name || 'دوست مفت خر'}!</p>
      <dl>
        <dt>شماره موبایل</dt>
        <dd dir="ltr">{user.phoneNumber || 'ثبت نشده'}</dd>
      </dl>
      <p>فروشگاه در حال آماده‌سازی است؛ سفارش و پرداخت فعلاً فعال نیست.</p>
      <Link className="action secondary" href="/logout">
        خروج از حساب
      </Link>
    </div>
  )
}
