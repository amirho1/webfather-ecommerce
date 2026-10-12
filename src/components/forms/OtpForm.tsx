'use client'

import { isIranianMobile, normalizeDigits, normalizePhone } from '@/lib/auth/mobileSession'
import { useAuth } from '@/providers/Auth'
import { useRouter, useSearchParams } from 'next/navigation'
import { FormEvent, useState } from 'react'

export function OtpForm() {
  const { requestOtp, verifyOtp } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (step === 'phone') {
        const normalized = normalizePhone(phone)
        if (!isIranianMobile(normalized)) throw new Error('شماره موبایل معتبر نیست.')
        await requestOtp(normalized)
        setPhone(normalized)
        setStep('code')
      } else {
        await verifyOtp(phone, normalizeDigits(code))
        const next = searchParams.get('redirect') || '/account'
        router.replace(next.startsWith('/') && !next.startsWith('//') ? next : '/account')
        router.refresh()
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'دوباره تلاش کنید.')
    } finally {
      setLoading(false)
    }
  }

  async function resend() {
    setError('')
    setLoading(true)
    try {
      await requestOtp(phone)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ارسال کد ممکن نشد.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="otp-form" onSubmit={submit}>
      {step === 'phone' ? (
        <>
          <label htmlFor="phoneNumber">شماره موبایل</label>
          <input
            id="phoneNumber"
            dir="ltr"
            inputMode="tel"
            autoComplete="tel-national"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="۰۹xxxxxxxxx"
            required
          />
          <p>برای ورود یا ساخت حساب، کد تأیید پیامک می‌شود.</p>
        </>
      ) : (
        <>
          <p>کد تأیید به {phone} ارسال شد.</p>
          <label htmlFor="otpCode">کد شش‌رقمی</label>
          <input
            id="otpCode"
            dir="ltr"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="••••••"
            required
          />
          <button
            className="otp-link"
            type="button"
            onClick={() => {
              setStep('phone')
              setCode('')
            }}
          >
            ویرایش شماره
          </button>
          <button className="otp-link" type="button" disabled={loading} onClick={resend}>
            ارسال دوباره کد
          </button>
        </>
      )}
      {error && (
        <p className="otp-error" role="alert">
          {error}
        </p>
      )}
      <button className="action primary" type="submit" disabled={loading}>
        {loading ? 'لطفاً صبر کنید…' : step === 'phone' ? 'دریافت کد تأیید' : 'تأیید و ورود'}
      </button>
    </form>
  )
}
