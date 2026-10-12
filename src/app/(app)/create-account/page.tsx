import { AuthPageWrapper } from '@/components/auth/AuthPageWrapper'

export const metadata = { title: 'ساخت حساب | مفت خر' }

export default function CreateAccountPage() {
  return (
    <AuthPageWrapper
      title="ساخت حساب"
      subtitle="شماره موبایلت رو وارد کن تا با کد پیامکی حساب بسازیم."
    />
  )
}
